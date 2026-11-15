package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestModelsURL(t *testing.T) {
	tests := []struct {
		name     string
		upstream string
		want     string
	}{
		{
			name:     "default upstream",
			upstream: "http://localhost:8000/v1/chat/completions",
			want:     "http://localhost:8000/v1/models",
		},
		{
			name:     "trailing slash is tolerated",
			upstream: "http://hy-mt:8000/v1/chat/completions/",
			want:     "http://hy-mt:8000/v1/models",
		},
		{
			name:     "an unusual path keeps its prefix",
			upstream: "http://gpu-box:8000/api/v1/chat/completions",
			want:     "http://gpu-box:8000/api/v1/models",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, modelsURL(tt.upstream))
		})
	}
}

func TestHealthHandler(t *testing.T) {
	rec := httptest.NewRecorder()
	healthHandler(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))

	// Liveness never depends on the model: a warming engine is not a dead app.
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.JSONEq(t, `{"status":"ok"}`, rec.Body.String())
	assert.Equal(t, "no-store", rec.Header().Get("Cache-Control"))
}

func TestReadyHandler(t *testing.T) {
	newReadyApp := func(t *testing.T, upstream http.HandlerFunc) *app {
		t.Helper()
		stub := httptest.NewServer(upstream)
		t.Cleanup(stub.Close)
		return &app{upstreamURL: stub.URL + "/v1/chat/completions", client: &http.Client{}}
	}

	t.Run("model answers the model list", func(t *testing.T) {
		probed := make(chan string, 1)
		application := newReadyApp(t, func(w http.ResponseWriter, r *http.Request) {
			probed <- r.URL.Path
			w.Header().Set("Content-Type", "application/json")
			io.WriteString(w, `{"data":[{"id":"hy-mt-1.8b"}]}`)
		})

		rec := httptest.NewRecorder()
		application.readyHandler(rec, httptest.NewRequest(http.MethodGet, "/api/ready", nil))

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.JSONEq(t, `{"status":"ready"}`, rec.Body.String())
		assert.Equal(t, "/v1/models", <-probed, "the probe must hit the OpenAI-compatible model list")
	})

	t.Run("model still loading", func(t *testing.T) {
		application := newReadyApp(t, func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "loading model", http.StatusServiceUnavailable)
		})

		rec := httptest.NewRecorder()
		application.readyHandler(rec, httptest.NewRequest(http.MethodGet, "/api/ready", nil))

		assert.Equal(t, http.StatusServiceUnavailable, rec.Code)
		assert.JSONEq(t, `{"status":"warming up"}`, rec.Body.String())
	})

	t.Run("no upstream at all", func(t *testing.T) {
		stub := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
		stub.Close() // dead URL

		application := &app{upstreamURL: stub.URL + "/v1/chat/completions", client: &http.Client{}}

		rec := httptest.NewRecorder()
		application.readyHandler(rec, httptest.NewRequest(http.MethodGet, "/api/ready", nil))

		assert.Equal(t, http.StatusServiceUnavailable, rec.Code)
		require.JSONEq(t, `{"status":"warming up"}`, rec.Body.String())
	})
}
