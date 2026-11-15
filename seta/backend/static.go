package main

import (
	"io"
	"io/fs"
	"log"
	"net/http"
	"strings"
)

// contentSecurityPolicy keeps the page inside its own origin. Alpine.js
// evaluates x-data expressions with `new Function`, so 'unsafe-eval' is
// unavoidable without swapping in Alpine's CSP build; nothing else is
// loosened. The data: allowance is the inline SVG favicon.
const contentSecurityPolicy = "default-src 'self'; " +
	"script-src 'self' 'unsafe-eval'; " +
	"style-src 'self' 'unsafe-inline'; " +
	"img-src 'self' data:; " +
	"connect-src 'self'; " +
	"object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

// staticHandler serves the embedded frontend build from dist/. `make build`
// (and the Dockerfile) copy frontend/dist into backend/dist before compiling,
// so a plain `go build` has no index.html — say that out loud instead of
// 404-ing the app and leaving the operator to guess.
func staticHandler(fsys fs.FS) http.Handler {
	sub, err := fs.Sub(fsys, "dist")
	if err != nil {
		log.Fatalf("embed: %v", err)
	}

	if _, err := fs.Stat(sub, "index.html"); err != nil {
		log.Printf("no frontend in this binary — backend/dist/index.html is missing, run `make build`")
		return withStaticHeaders(http.HandlerFunc(notBuilt))
	}

	return withStaticHeaders(http.FileServerFS(sub))
}

// notBuilt explains a missing frontend build instead of serving a 404.
func notBuilt(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusServiceUnavailable)
	io.WriteString(w, "seta's frontend was not embedded in this binary.\n\n"+
		"Run `make build` (frontend build → backend/dist → go build).\n")
}

// withStaticHeaders sets what every static response should carry: the app-wide
// security envelope, plus caching that matches Vite's hashed asset names
// (immutable) against the un-hashed index.html (revalidate every load).
func withStaticHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Content-Security-Policy", contentSecurityPolicy)
		if strings.HasPrefix(r.URL.Path, "/assets/") {
			h.Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			h.Set("Cache-Control", "no-cache")
		}
		next.ServeHTTP(w, r)
	})
}
