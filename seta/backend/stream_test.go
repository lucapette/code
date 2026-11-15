package main

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConsumeUpstreamLine(t *testing.T) {
	tests := []struct {
		name     string
		line     string
		wantDone bool
		wantOut  string // what the outgoing stream should carry
		wantErr  bool
	}{
		{name: "comment line is ignored", line: ": keep-alive"},
		{name: "blank separator is ignored", line: ""},
		{name: "event field is ignored", line: "event: message"},
		{
			name:    "content delta is forwarded",
			line:    `data: {"choices":[{"delta":{"content":"你好"}}]}`,
			wantOut: `data: {"delta":"你好"}` + "\n\n",
		},
		{
			name: "role-only chunk carries nothing",
			line: `data: {"choices":[{"delta":{"role":"assistant"}}]}`,
		},
		{name: "terminator finishes the stream", line: "data: [DONE]", wantDone: true},
		{name: "malformed payload is an error", line: "data: {broken", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			stream := &sseWriter{w: rec}

			done, err := consumeUpstreamLine(stream, tt.line)

			if tt.wantErr {
				require.Error(t, err)
				assert.False(t, done)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantDone, done)
			assert.Equal(t, tt.wantOut, rec.Body.String())
			assert.Equal(t, tt.wantOut != "", stream.hasStarted())
		})
	}
}

func TestTranslateHandlerByteCapBoundary(t *testing.T) {
	server := newTestApp(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\"你好\"}}]}\n\n")
		fmt.Fprint(w, "data: [DONE]\n\n")
		w.(http.Flusher).Flush()
	})

	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "exactly at the cap is accepted",
			body:       `{"text":"` + strings.Repeat("a", maxTextBytes) + `"}`,
			wantStatus: http.StatusOK,
		},
		{
			name:       "one byte over the cap is refused",
			body:       `{"text":"` + strings.Repeat("a", maxTextBytes+1) + `"}`,
			wantStatus: http.StatusRequestEntityTooLarge,
		},
		{
			name:       "an oversized body is refused before it is decoded",
			body:       `{"text":"` + strings.Repeat("a", maxBodyBytes) + `"}`,
			wantStatus: http.StatusRequestEntityTooLarge,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := post(t, server, tt.body)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

func TestTranslateHandlerDoneWithoutDeltas(t *testing.T) {
	// Upstream says 200 and terminates immediately: no translation was
	// produced, so the client must see a clean 502 — not an empty 200 that
	// reads like "nothing to translate".
	server := newTestApp(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, "data: [DONE]\n\n")
		w.(http.Flusher).Flush()
	})

	resp := post(t, server, `{"text":"hello"}`)

	assert.Equal(t, http.StatusBadGateway, resp.StatusCode)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.JSONEq(t, `{"error":"invalid upstream response"}`, string(body))
}

func TestTranslateHandlerStallTimeout(t *testing.T) {
	const idle = 100 * time.Millisecond

	server := newTestAppWith(t, func(a *app) { a.idleTimeout = idle },
		func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/event-stream")
			io.Copy(io.Discard, r.Body)
			fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\"你好\"}}]}\n\n")
			w.(http.Flusher).Flush()
			<-r.Context().Done() // ...and then the model goes quiet
		})

	start := time.Now()
	resp := post(t, server, `{"text":"hello"}`)
	body, err := io.ReadAll(resp.Body)
	elapsed := time.Since(start)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	// The partial translation stands, then the error arrives on the stream.
	assert.Contains(t, string(body), `data: {"delta":"你好"}`)
	assert.Contains(t, string(body), `data: {"error":"translation timed out"}`)
	assert.Contains(t, string(body), "data: [DONE]")
	assert.Less(t, elapsed, 5*time.Second, "the stall watchdog must not wait for the client")
}

func TestTranslateHandlerStallBeforeFirstDelta(t *testing.T) {
	server := newTestAppWith(t, func(a *app) { a.idleTimeout = 50 * time.Millisecond },
		func(w http.ResponseWriter, r *http.Request) {
			io.Copy(io.Discard, r.Body)
			w.Header().Set("Content-Type", "text/event-stream")
			w.WriteHeader(http.StatusOK)
			w.(http.Flusher).Flush()
			<-r.Context().Done() // headers only, then silence
		})

	resp := post(t, server, `{"text":"hello"}`)

	// Nothing was committed to the client yet, so this can still be a status.
	assert.Equal(t, http.StatusGatewayTimeout, resp.StatusCode)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.JSONEq(t, `{"error":"translation timed out"}`, string(body))
}
