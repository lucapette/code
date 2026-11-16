package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestHealthHandler(t *testing.T) {
	rec := httptest.NewRecorder()
	healthHandler(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))

	// Liveness never depends on the model: a warming engine is not a dead app.
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.JSONEq(t, `{"status":"ok"}`, rec.Body.String())
	assert.Equal(t, "no-store", rec.Header().Get("Cache-Control"))
}

func TestReadyHandler(t *testing.T) {
	t.Run("model loaded", func(t *testing.T) {
		application := &app{engine: readyTranslator()}

		rec := httptest.NewRecorder()
		application.readyHandler(rec, httptest.NewRequest(http.MethodGet, "/api/ready", nil))

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.JSONEq(t, `{"status":"ready"}`, rec.Body.String())
	})

	t.Run("model still loading", func(t *testing.T) {
		application := &app{engine: &fakeTranslator{}}

		rec := httptest.NewRecorder()
		application.readyHandler(rec, httptest.NewRequest(http.MethodGet, "/api/ready", nil))

		assert.Equal(t, http.StatusServiceUnavailable, rec.Code)
		assert.JSONEq(t, `{"status":"warming up"}`, rec.Body.String())
	})

	t.Run("model that failed to load stays warming, never ready", func(t *testing.T) {
		application := &app{engine: &fakeTranslator{}}

		// Readiness is the engine's own answer: a missing model file, no
		// embedded libraries and a crash during load all land here.
		for i := 0; i < 3; i++ {
			rec := httptest.NewRecorder()
			application.readyHandler(rec, httptest.NewRequest(http.MethodGet, "/api/ready", nil))
			assert.Equal(t, http.StatusServiceUnavailable, rec.Code)
		}
	})
}
