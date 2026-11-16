package main

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

/* --- Prompt ---------------------------------------------------------- */

func TestBuildUserPrompt(t *testing.T) {
	assert.Equal(t, "将以下文本翻译为简体中文，注意只需要输出翻译后的结果，不要额外解释： hello",
		buildUserPrompt(TranslateRequest{Text: "hello"}))
	assert.Equal(t, "将以下文本翻译为英文，注意只需要输出翻译后的结果，不要额外解释： 你好",
		buildUserPrompt(TranslateRequest{Text: "你好"}))
}

/* --- Handler --------------------------------------------------------- */

// newTestApp wires the translate handler to a scripted engine.
func newTestApp(t *testing.T, engine *fakeTranslator) *httptest.Server {
	t.Helper()
	return newTestAppWith(t, engine, func(*app) {})
}

// newTestAppWith is newTestApp with a chance to adjust the app first, for tests
// that need a different request timeout.
func newTestAppWith(t *testing.T, engine *fakeTranslator, configure func(*app)) *httptest.Server {
	t.Helper()

	application := &app{engine: engine}
	configure(application)

	handler := http.NewServeMux()
	handler.HandleFunc("POST /api/translate", application.translateHandler)

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

// sseFrames splits a streamed body into its event payloads.
func sseFrames(t *testing.T, body io.Reader) []string {
	t.Helper()

	raw, err := io.ReadAll(body)
	require.NoError(t, err)

	var frames []string
	for _, line := range strings.Split(string(raw), "\n") {
		if payload, ok := strings.CutPrefix(line, "data: "); ok {
			frames = append(frames, payload)
		}
	}
	return frames
}

func TestTranslateHandlerValidation(t *testing.T) {
	engine := readyTranslator()
	server := newTestApp(t, engine)

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
			req, err := http.NewRequest(tt.method, server.URL+"/api/translate", strings.NewReader(tt.body))
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

	assert.Zero(t, engine.callCount(), "an invalid request must never reach the model")
}

// TestTranslateHandlerByteCapBoundary pins the off-by-one: the cap is a limit,
// not an exclusive bound.
func TestTranslateHandlerByteCapBoundary(t *testing.T) {
	engine := readyTranslator()
	engine.pieces = []string{"好"}
	server := newTestApp(t, engine)

	atCap := strings.Repeat("a", maxTextBytes)
	resp := post(t, server, `{"text":"`+atCap+`"}`)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, []string{`{"delta":"好"}`, "[DONE]"}, sseFrames(t, resp.Body))

	overCap := strings.Repeat("a", maxTextBytes+1)
	resp = post(t, server, `{"text":"`+overCap+`"}`)
	assert.Equal(t, http.StatusRequestEntityTooLarge, resp.StatusCode)
}

func TestTranslateHandlerStreamsDeltas(t *testing.T) {
	engine := readyTranslator()
	engine.pieces = []string{"银行", "在哪", "里？"}
	server := newTestApp(t, engine)

	resp := post(t, server, `{"text":"where is the bank?"}`)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	assert.Equal(t, "text/event-stream", resp.Header.Get("Content-Type"))
	assert.Equal(t, "en-zh", resp.Header.Get(directionHeader))
	assert.Equal(t, []string{
		`{"delta":"银行"}`,
		`{"delta":"在哪"}`,
		`{"delta":"里？"}`,
		"[DONE]",
	}, sseFrames(t, resp.Body))
}

func TestTranslateHandlerHandsTheEngineTheDirectionalPrompt(t *testing.T) {
	tests := []struct {
		name string
		body string
		want string
	}{
		{
			name: "english input",
			body: `{"text":"hello"}`,
			want: buildPrompt("hello", ToChinese),
		},
		{
			name: "chinese input",
			body: `{"text":"你好"}`,
			want: buildPrompt("你好", ToEnglish),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			engine := readyTranslator()
			engine.pieces = []string{"ok"}
			server := newTestApp(t, engine)

			resp := post(t, server, tt.body)
			require.Equal(t, http.StatusOK, resp.StatusCode)
			io.Copy(io.Discard, resp.Body)

			assert.Equal(t, tt.want, engine.lastMessage())
		})
	}
}

func TestTranslateHandlerBeforeTheModelIsReady(t *testing.T) {
	engine := &fakeTranslator{ready: false}
	server := newTestApp(t, engine)

	resp := post(t, server, `{"text":"hello"}`)

	assert.Equal(t, http.StatusServiceUnavailable, resp.StatusCode)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.JSONEq(t, `{"error":"translation engine unavailable"}`, string(body))
	assert.Zero(t, engine.callCount(), "a warming engine must not be asked to translate")
}

func TestTranslateHandlerWithNoOutput(t *testing.T) {
	server := newTestApp(t, readyTranslator())

	resp := post(t, server, `{"text":"hello"}`)

	// 200 with an empty stream would render as "no input"; say what happened.
	assert.Equal(t, http.StatusBadGateway, resp.StatusCode)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.JSONEq(t, `{"error":"translation failed"}`, string(body))
}

func TestTranslateHandlerFailureBeforeOutput(t *testing.T) {
	engine := readyTranslator()
	engine.err = errors.New("synthetic engine failure")
	server := newTestApp(t, engine)

	resp := post(t, server, `{"text":"hello"}`)

	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.JSONEq(t, `{"error":"translation failed"}`, string(body))
}

func TestTranslateHandlerFailureMidStream(t *testing.T) {
	engine := readyTranslator()
	engine.pieces = []string{"今天"}
	engine.err = errors.New("synthetic mid-stream failure")
	server := newTestApp(t, engine)

	resp := post(t, server, `{"text":"today"}`)
	require.Equal(t, http.StatusOK, resp.StatusCode, "deltas already sent: the status is committed")

	// What was translated stands; the error arrives inside the stream.
	assert.Equal(t, []string{
		`{"delta":"今天"}`,
		`{"error":"translation failed"}`,
		"[DONE]",
	}, sseFrames(t, resp.Body))
}

func TestTranslateHandlerTimesOutBeforeOutput(t *testing.T) {
	engine := &fakeTranslator{ready: true, hold: true}
	server := newTestAppWith(t, engine, func(application *app) {
		application.timeout = 20 * time.Millisecond
	})

	resp := post(t, server, `{"text":"hello"}`)

	assert.Equal(t, http.StatusGatewayTimeout, resp.StatusCode)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.JSONEq(t, `{"error":"translation timed out"}`, string(body))
}

func TestTranslateHandlerTimesOutMidStream(t *testing.T) {
	engine := &fakeTranslator{ready: true, pieces: []string{"今天"}, hold: true}
	server := newTestAppWith(t, engine, func(application *app) {
		application.timeout = 20 * time.Millisecond
	})

	resp := post(t, server, `{"text":"today"}`)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	assert.Equal(t, []string{
		`{"delta":"今天"}`,
		`{"error":"translation timed out"}`,
		"[DONE]",
	}, sseFrames(t, resp.Body))
	assert.ErrorIs(t, engine.lastErr(), context.DeadlineExceeded)
}

// TestAbortReachesTheEngine is the point of the whole in-process design: closing
// the tab must stop the model, not leave it translating into a dead socket.
func TestAbortReachesTheEngine(t *testing.T) {
	engine := &fakeTranslator{ready: true, hold: true, started: make(chan struct{})}
	server := newTestApp(t, engine)

	ctx, cancel := context.WithCancel(context.Background())
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		server.URL+"/api/translate", strings.NewReader(`{"text":"hello"}`))
	require.NoError(t, err)

	done := make(chan struct{})
	go func() {
		defer close(done)
		resp, err := http.DefaultClient.Do(req)
		if err == nil {
			resp.Body.Close()
		}
	}()

	<-engine.started
	cancel()
	<-done

	require.Eventually(t, func() bool {
		return engine.lastErr() != nil
	}, 2*time.Second, 5*time.Millisecond)
	assert.ErrorIs(t, engine.lastErr(), context.Canceled)
}
