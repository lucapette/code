package main

import (
	"context"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// readinessTimeout is short on purpose: /api/ready is polled by the UI and by
// the container healthcheck, so it must not wait on a model that is loading.
const readinessTimeout = 2 * time.Second

// healthHandler is liveness only — the process is up and serving. It must not
// touch the model, or a warming engine would mark the app itself dead.
func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// readyHandler is readiness — has the model behind UPSTREAM_URL come up yet?
// The UI polls it to show "engine warming up" instead of failing translation
// after translation while the weights are still paging in.
func (a *app) readyHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), readinessTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, modelsURL(a.upstreamURL), nil)
	if err != nil {
		log.Printf("readiness probe: %v", err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "warming up"})
		return
	}

	resp, err := a.client.Do(req)
	if err != nil {
		if r.Context().Err() == nil {
			log.Printf("readiness probe: %v", err)
		}
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "warming up"})
		return
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, io.LimitReader(resp.Body, 8<<10))

	if resp.StatusCode != http.StatusOK {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "warming up"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

// modelsURL turns the configured chat-completions URL into the model list the
// readiness probe reads: same host, same /v1 prefix, which llama.cpp and vLLM
// both serve.
func modelsURL(upstream string) string {
	base := strings.TrimSuffix(strings.TrimSuffix(upstream, "/"), "/chat/completions")
	return base + "/models"
}
