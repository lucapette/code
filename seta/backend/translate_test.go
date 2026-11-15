package main

import (
	"context"
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

func TestBuildUserPrompt(t *testing.T) {
	tests := []struct {
		name string
		text string
		want string
	}{
		{
			name: "wraps text in the Chinese template",
			text: "Hello, world!",
			want: "将以下文本翻译为简体中文，注意只需要输出翻译后的结果，不要额外解释： Hello, world!",
		},
		{
			name: "keeps multiline text intact",
			text: "line one\nline two",
			want: "将以下文本翻译为简体中文，注意只需要输出翻译后的结果，不要额外解释： line one\nline two",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, buildUserPrompt(TranslateRequest{Text: tt.text}))
		})
	}
}

func TestNewUpstreamRequest(t *testing.T) {
	req := newUpstreamRequest("prompt text")

	assert.Equal(t, "hy-mt-1.8b", req.Model, "model name")
	assert.Equal(t, []upstreamMessage{{Role: "user", Content: "prompt text"}}, req.Messages,
		"exactly one user message — the model takes no system prompt")
	assert.InDelta(t, 0.7, req.Temperature, 0.0001)
	assert.InDelta(t, 0.6, req.TopP, 0.0001)
	assert.Equal(t, 2048, req.MaxTokens)
	assert.True(t, req.Stream, "the UI streams — the upstream call must too")

	for _, msg := range req.Messages {
		assert.NotEqual(t, "system", msg.Role, "no system prompt may be sent")
	}
}

func TestExtractDelta(t *testing.T) {
	tests := []struct {
		name    string
		payload string
		want    string
		ok      bool
		wantErr bool
	}{
		{
			name:    "content delta",
			payload: `{"choices":[{"delta":{"content":"你好"}}]}`,
			want:    "你好",
			ok:      true,
		},
		{
			name:    "role-only first chunk carries no content",
			payload: `{"choices":[{"delta":{"role":"assistant"}}]}`,
			ok:      false,
		},
		{
			name:    "finish-reason chunk carries no content",
			payload: `{"choices":[{"finish_reason":"stop","delta":{}}]}`,
			ok:      false,
		},
		{
			name:    "no choices",
			payload: `{"choices":[]}`,
			ok:      false,
		},
		{
			name:    "malformed payload",
			payload: `{broken`,
			ok:      false,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok, err := extractDelta(tt.payload)

			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
			assert.Equal(t, tt.ok, ok)
		})
	}
}

/* --- Handler --------------------------------------------------------- */

// newTestApp wires the handler to a stub upstream speaking the
// OpenAI-compatible SSE shape.
func newTestApp(t *testing.T, upstream http.HandlerFunc) *httptest.Server {
	t.Helper()

	stub := httptest.NewServer(upstream)
	t.Cleanup(stub.Close)

	handler := http.NewServeMux()
	handler.HandleFunc("POST /api/translate", (&app{
		upstreamURL: stub.URL + "/v1/chat/completions",
		client:      &http.Client{},
	}).translateHandler)

	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)

	return server
}

func post(t *testing.T, server *httptest.Server, body string) *http.Response {
	t.Helper()

	resp, err := http.Post(server.URL+"/api/translate", "application/json", strings.NewReader(body))
	require.NoError(t, err)
	t.Cleanup(func() { resp.Body.Close() })
	return resp
}

func TestTranslateHandlerValidation(t *testing.T) {
	unused := newTestApp(t, func(w http.ResponseWriter, r *http.Request) {
		t.Error("upstream must not be called for invalid requests")
	})

	tests := []struct {
		name       string
		method     string
		body       string
		wantStatus int
		wantError  string
	}{
		{name: "wrong method", method: http.MethodGet, wantStatus: http.StatusMethodNotAllowed},
		{name: "blank text", method: http.MethodPost, body: `{"text":"   "}`, wantStatus: http.StatusBadRequest, wantError: "text is required"},
		{name: "missing text field", method: http.MethodPost, body: `{}`, wantStatus: http.StatusBadRequest, wantError: "text is required"},
		{name: "malformed JSON", method: http.MethodPost, body: `{nope`, wantStatus: http.StatusBadRequest, wantError: "text is required"},
		{
			name:       "text over the byte cap",
			method:     http.MethodPost,
			body:       `{"text":"` + strings.Repeat("a", maxTextBytes+1) + `"}`,
			wantStatus: http.StatusRequestEntityTooLarge,
			wantError:  "text exceeds limit",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest(tt.method, unused.URL+"/api/translate", strings.NewReader(tt.body))
			require.NoError(t, err)
			resp, err := http.DefaultClient.Do(req)
			require.NoError(t, err)
			t.Cleanup(func() { resp.Body.Close() })

			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantError != "" {
				body, err := io.ReadAll(resp.Body)
				require.NoError(t, err)
				assert.JSONEq(t, `{"error":"`+tt.wantError+`"}`, string(body))
			}
		})
	}
}

func TestTranslateHandlerStreamsDeltas(t *testing.T) {
	server := newTestApp(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		flusher := w.(http.Flusher)
		for _, event := range []string{
			`data: {"choices":[{"delta":{"role":"assistant"}}]}`,
			``,
			`data: {"choices":[{"delta":{"content":"你好"}}]}`,
			``,
			`data: {"choices":[{"delta":{"content":"，世界"}}]}`,
			``,
			`data: [DONE]`,
			``,
		} {
			fmt.Fprintln(w, event)
			flusher.Flush()
		}
	})

	resp := post(t, server, `{"text":"Hello, world!"}`)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "text/event-stream", resp.Header.Get("Content-Type"))

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.Equal(t, strings.Join([]string{
		`data: {"delta":"你好"}`,
		``,
		`data: {"delta":"，世界"}`,
		``,
		`data: [DONE]`,
		``,
		"",
	}, "\n"), string(body))
}

func TestTranslateHandlerUpstreamFailures(t *testing.T) {
	t.Run("unreachable upstream maps to 503", func(t *testing.T) {
		stub := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
		stub.Close() // dead URL

		server := httptest.NewServer(http.HandlerFunc((&app{
			upstreamURL: stub.URL,
			client:      &http.Client{},
		}).translateHandler))
		t.Cleanup(server.Close)

		resp := post(t, server, `{"text":"hello"}`)
		assert.Equal(t, http.StatusServiceUnavailable, resp.StatusCode)
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.JSONEq(t, `{"error":"translation engine unavailable"}`, string(body))
	})

	t.Run("upstream error status maps to 502 without leaking its body", func(t *testing.T) {
		server := newTestApp(t, func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "model /models/HY-MT1.5-1.8B not found on gpu-worker-3", http.StatusInternalServerError)
		})

		resp := post(t, server, `{"text":"hello"}`)
		assert.Equal(t, http.StatusBadGateway, resp.StatusCode)
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.JSONEq(t, `{"error":"invalid upstream response"}`, string(body))
	})

	t.Run("empty upstream stream maps to 502", func(t *testing.T) {
		server := newTestApp(t, func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK) // 200, then nothing
		})

		resp := post(t, server, `{"text":"hello"}`)
		assert.Equal(t, http.StatusBadGateway, resp.StatusCode)
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.JSONEq(t, `{"error":"invalid upstream response"}`, string(body))
	})
}

func TestTranslateHandlerMidStreamGarbage(t *testing.T) {
	t.Run("garbage before any delta maps to 502", func(t *testing.T) {
		server := newTestApp(t, func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/event-stream")
			fmt.Fprint(w, "data: {broken\n\n")
			w.(http.Flusher).Flush()
		})

		resp := post(t, server, `{"text":"hello"}`)
		assert.Equal(t, http.StatusBadGateway, resp.StatusCode)
	})

	t.Run("garbage after a delta becomes a stream error event", func(t *testing.T) {
		server := newTestApp(t, func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/event-stream")
			flusher := w.(http.Flusher)
			fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\"你好\"}}]}\n\n")
			flusher.Flush()
			fmt.Fprint(w, "data: {broken\n\n") // no [DONE] after this
			flusher.Flush()
		})

		resp := post(t, server, `{"text":"hello"}`)
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Contains(t, string(body), `data: {"delta":"你好"}`)
		assert.Contains(t, string(body), `data: {"error":"invalid upstream response"}`)
		assert.Contains(t, string(body), "data: [DONE]")
	})

	t.Run("stream ending without [DONE] still terminates ours", func(t *testing.T) {
		server := newTestApp(t, func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/event-stream")
			fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\"你好\"}}]}\n\n")
			w.(http.Flusher).Flush()
			// upstream just hangs up
		})

		resp := post(t, server, `{"text":"hello"}`)
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Contains(t, string(body), `data: {"delta":"你好"}`)
		assert.Contains(t, string(body), "data: [DONE]")
	})
}

func TestTranslateHandlerSendsPromptAndSampling(t *testing.T) {
	server := newTestApp(t, func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		require.NoError(t, err)

		assert.Contains(t, string(body), `"model":"hy-mt-1.8b"`)
		assert.Contains(t, string(body), `"role":"user"`)
		assert.Contains(t, string(body), "将以下文本翻译为简体中文，注意只需要输出翻译后的结果，不要额外解释： hello")
		assert.NotContains(t, string(body), `"role":"system"`)
		assert.Contains(t, string(body), `"stream":true`)

		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, "data: [DONE]\n\n")
		w.(http.Flusher).Flush()
	})

	resp := post(t, server, `{"text":"hello"}`)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestAbortPropagatesToUpstream(t *testing.T) {
	upstreamCancelled := make(chan struct{})

	server := newTestApp(t, func(w http.ResponseWriter, r *http.Request) {
		// Drain the body first: the server only arms close-detection (and
		// thus context cancellation) once the request body is consumed.
		io.Copy(io.Discard, r.Body)
		<-r.Context().Done() // hold the stream open until someone cancels
		close(upstreamCancelled)
	})

	ctx, cancel := context.WithCancel(context.Background())
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		server.URL+"/api/translate", strings.NewReader(`{"text":"hello"}`))
	require.NoError(t, err)

	client := &http.Client{}
	respCh := make(chan error, 1)
	go func() {
		resp, err := client.Do(req)
		if resp != nil {
			resp.Body.Close()
		}
		respCh <- err
	}()

	time.Sleep(100 * time.Millisecond) // let the request reach the upstream stub
	cancel()

	select {
	case <-upstreamCancelled:
		// the abort reached the model instead of burning the generation
	case <-time.After(5 * time.Second):
		t.Fatal("upstream context was never cancelled by the client abort")
	}

	select {
	case <-respCh:
	case <-time.After(5 * time.Second):
		t.Fatal("client request never returned after abort")
	}
}
