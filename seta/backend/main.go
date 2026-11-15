// Package main implements seta's thin Go orchestrator: it builds the model
// prompt, calls the OpenAI-compatible upstream, and proxies the stream. The
// same binary serves the embedded frontend, so there is exactly one
// public-facing service on one port.
package main

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

//go:embed all:dist
var distFS embed.FS

const (
	defaultUpstreamURL = "http://localhost:8000/v1/chat/completions"
	defaultAddr        = ":8080"

	// defaultStreamIdleTimeout bounds the gap *between* upstream chunks. There
	// is deliberately no overall timeout — a long translation is legitimate —
	// but a model that stops emitting must surface as an error instead of
	// leaving the browser spinning forever. Override with STREAM_IDLE_TIMEOUT.
	defaultStreamIdleTimeout = 30 * time.Second

	// maxBodyBytes caps the raw request body so an oversized POST is refused
	// before it is decoded. maxTextBytes (translate.go) is the product limit;
	// this is just the JSON envelope around it.
	maxBodyBytes = 64 << 10
)

// app carries the handler's collaborators: where the model lives, how to talk
// to it, and how long to wait between its chunks before calling it dead.
type app struct {
	upstreamURL string
	client      *http.Client
	idleTimeout time.Duration
}

// newApp builds the application with its defaults applied.
func newApp(upstreamURL string) *app {
	return &app{
		upstreamURL: upstreamURL,
		idleTimeout: envDuration("STREAM_IDLE_TIMEOUT", defaultStreamIdleTimeout),
		// No overall timeout: the response is a long-lived stream. Bound the
		// phases instead — connect, and waiting for the model's first headers
		// (generous: the model may still be loading).
		client: &http.Client{
			Transport: &http.Transport{
				DialContext:           (&net.Dialer{Timeout: 10 * time.Second}).DialContext,
				MaxIdleConns:          16,
				IdleConnTimeout:       90 * time.Second,
				ResponseHeaderTimeout: 5 * time.Minute,
			},
		},
	}
}

// streamTimeout is the per-chunk deadline, with the default applied for the
// zero value so a hand-built app in tests still streams normally.
func (a *app) streamTimeout() time.Duration {
	if a.idleTimeout > 0 {
		return a.idleTimeout
	}
	return defaultStreamIdleTimeout
}

func main() {
	upstreamURL := envOr("UPSTREAM_URL", defaultUpstreamURL)
	addr := envOr("ADDR", defaultAddr)
	application := newApp(upstreamURL)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/translate", application.translateHandler)
	mux.HandleFunc("GET /api/health", healthHandler)           // liveness: the process is up
	mux.HandleFunc("GET /api/ready", application.readyHandler) // readiness: the model answers
	mux.Handle("/", staticHandler(distFS))

	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("seta listening on %s (upstream %s)", addr, upstreamURL)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// envDuration reads a positive duration (e.g. "30s") or falls back, saying why.
func envDuration(key string, fallback time.Duration) time.Duration {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	d, err := time.ParseDuration(raw)
	if err != nil || d <= 0 {
		log.Printf("ignoring %s=%q: want a positive duration such as 30s", key, raw)
		return fallback
	}
	return d
}

// writeJSON emits a JSON body with the headers every dynamic response wants.
func writeJSON(w http.ResponseWriter, status int, payload any) {
	h := w.Header()
	h.Set("Content-Type", "application/json")
	h.Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("write response: %v", err)
	}
}

// writeError maps a failure to the frontend contract's clean statuses.
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
