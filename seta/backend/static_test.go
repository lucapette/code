package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeDist mimics the shape `make build` produces: an index.html at the root
// and hashed files under assets/.
func fakeDist() fstest.MapFS {
	return fstest.MapFS{
		"dist/index.html":     &fstest.MapFile{Data: []byte("<!DOCTYPE html><title>seta</title>")},
		"dist/assets/app.js":  &fstest.MapFile{Data: []byte("console.log('seta')")},
		"dist/assets/app.css": &fstest.MapFile{Data: []byte(":root{}")},
	}
}

func TestStaticHandlerServesApp(t *testing.T) {
	server := httptest.NewServer(staticHandler(fakeDist()))
	t.Cleanup(server.Close)

	resp, err := http.Get(server.URL + "/")
	require.NoError(t, err)
	t.Cleanup(func() { resp.Body.Close() })

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.Contains(t, string(body), "<title>seta</title>")

	// The app shell is revalidated; its security envelope is always there.
	assert.Equal(t, "no-cache", resp.Header.Get("Cache-Control"))
	assert.Equal(t, "nosniff", resp.Header.Get("X-Content-Type-Options"))
	assert.Equal(t, "DENY", resp.Header.Get("X-Frame-Options"))
	assert.Equal(t, "no-referrer", resp.Header.Get("Referrer-Policy"))
	assert.Contains(t, resp.Header.Get("Content-Security-Policy"), "default-src 'self'")
	assert.Contains(t, resp.Header.Get("Content-Security-Policy"), "frame-ancestors 'none'")
}

func TestStaticHandlerCachesHashedAssets(t *testing.T) {
	server := httptest.NewServer(staticHandler(fakeDist()))
	t.Cleanup(server.Close)

	resp, err := http.Get(server.URL + "/assets/app.js")
	require.NoError(t, err)
	t.Cleanup(func() { resp.Body.Close() })

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "public, max-age=31536000, immutable", resp.Header.Get("Cache-Control"))
}

func TestStaticHandlerWithoutFrontendBuild(t *testing.T) {
	// What a bare `go build` sees: backend/dist exists (tracked via .gitkeep)
	// but carries no build. Explain it instead of 404-ing.
	bare := fstest.MapFS{"dist/.gitkeep": &fstest.MapFile{}}
	server := httptest.NewServer(staticHandler(bare))
	t.Cleanup(server.Close)

	resp, err := http.Get(server.URL + "/")
	require.NoError(t, err)
	t.Cleanup(func() { resp.Body.Close() })

	assert.Equal(t, http.StatusServiceUnavailable, resp.StatusCode)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.Contains(t, string(body), "make build")
}
