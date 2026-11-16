// Package main is seta: a translator and study notebook in one process. The
// model runs inside this binary (engine.go), the frontend is embedded, and the
// library is one JSON file — no model server, no ports but this one.
package main

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

//go:embed all:dist
var distFS embed.FS

const (
	defaultAddr = ":8080"

	// defaultTranslateTimeout bounds one translation end to end. A 5000-byte
	// input can legitimately take half a minute on CPU, so this is generous;
	// it exists to stop a runaway generation from pinning the request forever.
	// Override with TRANSLATE_TIMEOUT.
	defaultTranslateTimeout = 60 * time.Second

	// maxBodyBytes caps the raw request body so an oversized POST is refused
	// before it is decoded. maxTextBytes (translate.go) is the product limit;
	// this is just the JSON envelope around it.
	maxBodyBytes = 64 << 10
)

// app carries the handler's collaborators: the translation engine, how long a
// request may take, the saved library, and the embedded HSK vocabulary.
type app struct {
	engine  translator
	timeout time.Duration
	items   *store
	hsk     *hskIndex
}

// newApp builds the application with its defaults applied.
func newApp(engine translator, items *store, hsk *hskIndex) *app {
	return &app{
		engine:  engine,
		timeout: envDuration("TRANSLATE_TIMEOUT", defaultTranslateTimeout),
		items:   items,
		hsk:     hsk,
	}
}

func main() {
	addr := envOr("ADDR", defaultAddr)
	dataDir := envOr("DATA_DIR", "data")

	items, err := newStore(dataDir)
	if err != nil {
		log.Fatalf("library: %v", err)
	}
	hsk, err := loadHSK()
	if err != nil {
		log.Fatalf("vocabulary: %v", err)
	}
	log.Printf("library %s (%d items) · vocabulary %d words, HSK %v",
		items.path, len(items.List()), len(hsk.byWord), hsk.levels)

	// The model loads in the background: the library and the HSK map are useful
	// before the weights are in, and /api/ready is what the UI polls meanwhile.
	engine := newEngine(envOr("MODEL_PATH", ""), envOr("LIB_DIR", ""))
	go func() {
		if err := engine.Load(); err != nil {
			log.Printf("translation engine unavailable: %v", err)
		}
	}()

	application := newApp(engine, items, hsk)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/translate", application.translateHandler)
	mux.HandleFunc("GET /api/health", healthHandler)           // liveness: the process is up
	mux.HandleFunc("GET /api/ready", application.readyHandler) // readiness: the model answers
	mux.HandleFunc("GET /api/items", application.listItemsHandler)
	mux.HandleFunc("POST /api/items", application.createItemHandler)
	mux.HandleFunc("GET /api/items/export", application.exportItemsHandler)
	mux.HandleFunc("PATCH /api/items/{id}", application.updateItemHandler)
	mux.HandleFunc("DELETE /api/items/{id}", application.deleteItemHandler)
	mux.HandleFunc("GET /api/hsk", application.hskHandler)
	mux.HandleFunc("GET /api/hsk/search", application.hskSearchHandler)
	mux.Handle("/", staticHandler(distFS))

	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("seta listening on %s (model in-process)", addr)
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

	// Hand the weights and the GPU device back before the process exits;
	// llama.cpp's own teardown is noisier than this.
	engine.Close()
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
