package main

import (
	"bufio"
	"bytes"
	"context"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

//go:embed all:dist
var distFS embed.FS

// app carries the handler's two collaborators: where the model lives and
// how to talk to it.
type app struct {
	upstreamURL string
	client      *http.Client
}

func main() {
	upstreamURL := envOr("UPSTREAM_URL", "http://localhost:8000/v1/chat/completions")
	addr := envOr("ADDR", ":8080")

	application := &app{
		upstreamURL: upstreamURL,
		// No overall timeout: the response is a long-lived stream. Bound the
		// phases instead — connect, and waiting for vLLM's first headers
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

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/translate", application.translateHandler)
	mux.Handle("/", staticHandler())

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

// translateHandler validates the request, streams the upstream completion
// through as normalized SSE, and maps every failure to a clean status. Raw
// upstream error bodies are never forwarded: they can leak model paths, GPU
// diagnostics, or internal hostnames.
func (a *app) translateHandler(w http.ResponseWriter, r *http.Request) {
	var req TranslateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "text is required")
		return
	}
	if strings.TrimSpace(req.Text) == "" {
		writeError(w, http.StatusBadRequest, "text is required")
		return
	}
	if len(req.Text) > maxTextBytes {
		writeError(w, http.StatusRequestEntityTooLarge, "text exceeds limit")
		return
	}

	upstreamBody, err := json.Marshal(newUpstreamRequest(buildUserPrompt(req)))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "translation failed")
		return
	}

	// r.Context() is propagated on purpose: an aborted frontend fetch
	// cancels the vLLM generation instead of burning GPU cycles on it.
	upstreamReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
		a.upstreamURL, bytes.NewReader(upstreamBody))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "translation failed")
		return
	}
	upstreamReq.Header.Set("Content-Type", "application/json")
	upstreamReq.Header.Set("Accept", "text/event-stream")

	resp, err := a.client.Do(upstreamReq)
	if err != nil {
		if r.Context().Err() != nil {
			return // client already gone — nothing to report
		}
		writeError(w, http.StatusServiceUnavailable, "translation engine unavailable")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		io.Copy(io.Discard, resp.Body) // drain for connection reuse; never forward the body
		writeError(w, http.StatusBadGateway, "invalid upstream response")
		return
	}

	// The SSE headers are committed lazily: until the first event is known
	// good, a failure can still become a proper 502 instead of a broken
	// 200 stream.
	stream := &sseWriter{w: w}
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	sawDone := false
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data:") {
			continue // comments, event fields, blank separators
		}
		payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if payload == "[DONE]" {
			sawDone = true
			break
		}

		delta, ok, err := extractDelta(payload)
		if err != nil {
			if stream.hasStarted() {
				stream.fail("invalid upstream response")
			} else {
				writeError(w, http.StatusBadGateway, "invalid upstream response")
			}
			return
		}
		if !ok {
			continue // role-only first chunk, usage footer
		}
		stream.write(delta)
	}

	if err := scanner.Err(); err != nil {
		if r.Context().Err() != nil {
			return // client went away mid-stream
		}
		if stream.hasStarted() {
			stream.fail("invalid upstream response")
		} else {
			writeError(w, http.StatusBadGateway, "invalid upstream response")
		}
		return
	}

	if !sawDone && !stream.hasStarted() {
		// Empty stream: upstream said 200 and produced nothing.
		writeError(w, http.StatusBadGateway, "invalid upstream response")
		return
	}
	if !sawDone {
		// Stream ended without the terminator; close ours cleanly anyway.
		log.Printf("upstream stream ended without [DONE]")
	}
	stream.finish()
}

// sseWriter emits the frontend's stream contract — data: {"delta":"…"} per
// chunk, data: [DONE] to finish, data: {"error":"…"} for mid-stream
// failures — flushing after every event so the browser renders live.
type sseWriter struct {
	w       http.ResponseWriter
	flusher http.Flusher
	started bool
}

func (s *sseWriter) start() {
	if s.started {
		return
	}
	s.started = true
	h := s.w.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("X-Accel-Buffering", "no")
	s.w.WriteHeader(http.StatusOK)
	s.flusher, _ = s.w.(http.Flusher)
}

func (s *sseWriter) write(delta string) {
	s.start()
	s.emit(map[string]string{"delta": delta})
}

// fail reports a mid-stream error. Deltas already sent stand; the frontend
// shows the error alongside them.
func (s *sseWriter) fail(message string) {
	s.start()
	s.emit(map[string]string{"error": message})
	s.finish()
}

func (s *sseWriter) finish() {
	s.start()
	fmt.Fprint(s.w, "data: [DONE]\n\n")
	s.flush()
}

func (s *sseWriter) emit(payload map[string]string) {
	b, err := json.Marshal(payload)
	if err != nil {
		return // a map[string]string never fails to encode
	}
	fmt.Fprint(s.w, "data: ")
	s.w.Write(b)
	fmt.Fprint(s.w, "\n\n")
	s.flush()
}

func (s *sseWriter) flush() {
	if s.flusher != nil {
		s.flusher.Flush()
	}
}

func (s *sseWriter) hasStarted() bool {
	return s.started
}

// writeError maps a failure to the frontend contract's clean statuses.
func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if b, err := json.Marshal(map[string]string{"error": message}); err == nil {
		w.Write(b)
	}
}

// staticHandler serves the embedded frontend build. `make build` (and the
// Dockerfile) copy frontend/dist into backend/dist before compiling.
func staticHandler() http.Handler {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		log.Fatalf("embed: %v", err)
	}
	return http.FileServerFS(sub)
}
