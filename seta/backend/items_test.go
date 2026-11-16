package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newLibraryServer wires the library and HSK routes onto a store in a temp dir
// and a small fixture vocabulary.
func newLibraryServer(t *testing.T) *httptest.Server {
	t.Helper()

	items, err := newStore(t.TempDir())
	require.NoError(t, err)
	hsk, err := parseHSK([]byte(fixtureVocabulary))
	require.NoError(t, err)

	application := newApp(readyTranslator(), items, hsk)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/items", application.listItemsHandler)
	mux.HandleFunc("POST /api/items", application.createItemHandler)
	mux.HandleFunc("GET /api/items/export", application.exportItemsHandler)
	mux.HandleFunc("PATCH /api/items/{id}", application.updateItemHandler)
	mux.HandleFunc("DELETE /api/items/{id}", application.deleteItemHandler)
	mux.HandleFunc("GET /api/hsk", application.hskHandler)
	mux.HandleFunc("GET /api/hsk/search", application.hskSearchHandler)

	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)
	return server
}

func send(t *testing.T, server *httptest.Server, method, path, body string) *http.Response {
	t.Helper()

	var reader io.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}
	req, err := http.NewRequest(method, server.URL+path, reader)
	require.NoError(t, err)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	t.Cleanup(func() { resp.Body.Close() })
	return resp
}

func readItem(t *testing.T, resp *http.Response) Item {
	t.Helper()
	var item Item
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&item))
	return item
}

func TestItemsCreateAndList(t *testing.T) {
	server := newLibraryServer(t)

	created := send(t, server, http.MethodPost, "/api/items",
		`{"chinese":"你好","meaning":"hello","tags":["greeting"]}`)
	assert.Equal(t, http.StatusCreated, created.StatusCode)
	item := readItem(t, created)
	assert.NotEmpty(t, item.ID)
	assert.Equal(t, "你好", item.Chinese)
	assert.Equal(t, []string{"greeting"}, item.Tags)

	listed := send(t, server, http.MethodGet, "/api/items", "")
	assert.Equal(t, http.StatusOK, listed.StatusCode)

	var body struct {
		Items []Item `json:"items"`
	}
	require.NoError(t, json.NewDecoder(listed.Body).Decode(&body))
	require.Len(t, body.Items, 1)
	assert.Equal(t, item.ID, body.Items[0].ID)
}

func TestItemsCreateValidates(t *testing.T) {
	server := newLibraryServer(t)

	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantError  string
	}{
		{
			name:       "chinese is the only required field",
			body:       `{"meaning":"no chinese"}`,
			wantStatus: http.StatusBadRequest,
			wantError:  "chinese is required",
		},
		{
			name:       "blank chinese",
			body:       `{"chinese":"   "}`,
			wantStatus: http.StatusBadRequest,
			wantError:  "chinese is required",
		},
		{
			name:       "malformed json",
			body:       `{nope`,
			wantStatus: http.StatusBadRequest,
			wantError:  "invalid request body",
		},
		{
			name:       "oversized body",
			body:       `{"chinese":"` + strings.Repeat("a", maxItemBodyBytes) + `"}`,
			wantStatus: http.StatusRequestEntityTooLarge,
			wantError:  "item too large",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := send(t, server, http.MethodPost, "/api/items", tt.body)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)

			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)
			assert.JSONEq(t, `{"error":"`+tt.wantError+`"}`, string(body))
		})
	}
}

func TestItemsUpdateAndDelete(t *testing.T) {
	server := newLibraryServer(t)

	created := readItem(t, send(t, server, http.MethodPost, "/api/items", `{"chinese":"银行"}`))

	patched := send(t, server, http.MethodPatch, "/api/items/"+created.ID,
		`{"meaning":"bank","where":"a sign at the mall"}`)
	assert.Equal(t, http.StatusOK, patched.StatusCode)
	updated := readItem(t, patched)
	assert.Equal(t, "银行", updated.Chinese, "a patch leaves untouched fields alone")
	assert.Equal(t, "bank", updated.Meaning)
	assert.Equal(t, "a sign at the mall", updated.Where)

	deleted := send(t, server, http.MethodDelete, "/api/items/"+created.ID, "")
	assert.Equal(t, http.StatusNoContent, deleted.StatusCode)

	listed := send(t, server, http.MethodGet, "/api/items", "")
	var body struct {
		Items []Item `json:"items"`
	}
	require.NoError(t, json.NewDecoder(listed.Body).Decode(&body))
	assert.Empty(t, body.Items)
}

func TestItemsUnknownID(t *testing.T) {
	server := newLibraryServer(t)

	for _, tt := range []struct{ method, path, body string }{
		{http.MethodPatch, "/api/items/missing", `{"meaning":"x"}`},
		{http.MethodDelete, "/api/items/missing", ""},
	} {
		resp := send(t, server, tt.method, tt.path, tt.body)
		assert.Equal(t, http.StatusNotFound, resp.StatusCode)

		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.JSONEq(t, `{"error":"item not found"}`, string(body))
	}
}

func TestItemsExportIsADownload(t *testing.T) {
	server := newLibraryServer(t)

	readItem(t, send(t, server, http.MethodPost, "/api/items", `{"chinese":"你好","note":"from my tutor"}`))

	resp := send(t, server, http.MethodGet, "/api/items/export", "")
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Contains(t, resp.Header.Get("Content-Disposition"), "attachment; filename=")
	assert.Contains(t, resp.Header.Get("Content-Disposition"), "seta-library-")

	var exported struct {
		Version    int    `json:"version"`
		ExportedAt string `json:"exported_at"`
		Items      []Item `json:"items"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&exported))
	assert.Equal(t, storeVersion, exported.Version)
	assert.NotEmpty(t, exported.ExportedAt)
	require.Len(t, exported.Items, 1)
	assert.Equal(t, "from my tutor", exported.Items[0].Note)
}

func TestHSKHandlerCoverage(t *testing.T) {
	server := newLibraryServer(t)

	empty := send(t, server, http.MethodGet, "/api/hsk", "")
	assert.Equal(t, http.StatusOK, empty.StatusCode)

	var report coverageReport
	require.NoError(t, json.NewDecoder(empty.Body).Decode(&report))
	assert.Equal(t, 1, report.Current)
	assert.Len(t, report.Levels, 4)
	assert.Equal(t, 3, report.Gaps.Total)
	assert.Equal(t, "爱", report.Gaps.Words[0].Simplified, "alphabetical by pinyin: ài first")
	assert.NotEmpty(t, report.Gaps.Words[0].Pinyin)
	assert.NotEmpty(t, report.Gaps.Words[0].Gloss)
	assert.Empty(t, report.Known.Words, "nothing saved yet: nothing met")

	// Saving a sentence moves the map.
	readItem(t, send(t, server, http.MethodPost, "/api/items", `{"chinese":"我去银行"}`))

	after := send(t, server, http.MethodGet, "/api/hsk", "")
	require.NoError(t, json.NewDecoder(after.Body).Decode(&report))

	seen := map[int]int{}
	for _, row := range report.Levels {
		seen[row.Level] = row.Seen
	}
	assert.Equal(t, 1, seen[1])
	assert.Equal(t, 1, seen[3], "银行 counts at level 3")
	assert.Equal(t, 0, seen[2], "...and not as the standalone 行 at level 2")
}

func TestHSKHandlerKnownWordsPointAtTheLibrary(t *testing.T) {
	server := newLibraryServer(t)

	saved := readItem(t, send(t, server, http.MethodPost, "/api/items", `{"chinese":"我去银行"}`))
	readItem(t, send(t, server, http.MethodPost, "/api/items", `{"chinese":"我的爱"}`))

	resp := send(t, server, http.MethodGet, "/api/hsk", "")
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var report coverageReport
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&report))

	require.Len(t, report.Known.Words, 4)
	assert.Equal(t, 4, report.Known.Total)
	// Alphabetical by pinyin within each band: ài, de, wǒ, then the level-3 word.
	assert.Equal(t, []string{"爱", "的", "我", "银行"}, []string{
		report.Known.Words[0].Simplified,
		report.Known.Words[1].Simplified,
		report.Known.Words[2].Simplified,
		report.Known.Words[3].Simplified,
	})

	// 我 was met in both items; refs follow the library order, newest first.
	var refs []wordRef
	for _, word := range report.Known.Words {
		if word.Simplified == "我" {
			refs = word.Refs
		}
	}
	require.Len(t, refs, 2)
	assert.Contains(t, []string{refs[0].ID, refs[1].ID}, saved.ID)
	assert.Equal(t, []string{"我的爱", "我去银行"}, []string{refs[0].Text, refs[1].Text})
}

func TestHSKSearchHandler(t *testing.T) {
	server := newLibraryServer(t)
	readItem(t, send(t, server, http.MethodPost, "/api/items", `{"chinese":"我去银行"}`))

	resp := send(t, server, http.MethodGet, "/api/hsk/search?q=yinhang", "")
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var results searchResults
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&results))
	require.NotEmpty(t, results.Words)
	assert.Equal(t, "银行", results.Words[0].Simplified)
	assert.True(t, results.Words[0].Known, "it is in the library")
	require.NotEmpty(t, results.Words[0].Refs)
	assert.Equal(t, "我去银行", results.Words[0].Refs[0].Text)

	// A word the user has not met comes back too, marked missing.
	missing := send(t, server, http.MethodGet, "/api/hsk/search?q=yin", "")
	require.Equal(t, http.StatusOK, missing.StatusCode)
	require.NoError(t, json.NewDecoder(missing.Body).Decode(&results))

	byWord := map[string]searchHit{}
	for _, word := range results.Words {
		byWord[word.Simplified] = word
	}
	require.Contains(t, byWord, "银")
	assert.False(t, byWord["银"].Known)
	assert.True(t, byWord["银行"].Known)
}

func TestHSKSearchHandlerRejectsBadQueries(t *testing.T) {
	server := newLibraryServer(t)

	empty := send(t, server, http.MethodGet, "/api/hsk/search", "")
	assert.Equal(t, http.StatusBadRequest, empty.StatusCode)

	long := send(t, server, http.MethodGet, "/api/hsk/search?q="+strings.Repeat("银", maxSearchRunes+1), "")
	assert.Equal(t, http.StatusBadRequest, long.StatusCode)

	badLimit := send(t, server, http.MethodGet, "/api/hsk/search?q=yin&limit=nope", "")
	assert.Equal(t, http.StatusBadRequest, badLimit.StatusCode)
}

func TestHSKHandlerBandAndPageQuery(t *testing.T) {
	server := newLibraryServer(t)
	readItem(t, send(t, server, http.MethodPost, "/api/items", `{"chinese":"银"}`))

	wide := send(t, server, http.MethodGet, "/api/hsk?levels=5", "")
	require.Equal(t, http.StatusOK, wide.StatusCode)
	var report coverageReport
	require.NoError(t, json.NewDecoder(wide.Body).Decode(&report))
	require.Len(t, report.Known.Words, 1)
	assert.Equal(t, "银", report.Known.Words[0].Simplified)

	paged := send(t, server, http.MethodGet, "/api/hsk?levels=1,2,3&known=1", "")
	require.NoError(t, json.NewDecoder(paged.Body).Decode(&report))
	assert.Empty(t, report.Known.Words, "银 is level 5, outside the default bands")
	assert.Equal(t, 0, report.Known.Total)

	gapped := send(t, server, http.MethodGet, "/api/hsk?level=3", "")
	require.NoError(t, json.NewDecoder(gapped.Body).Decode(&report))
	require.Len(t, report.Gaps.Words, 1)
	assert.Equal(t, "银行", report.Gaps.Words[0].Simplified, "the band asked for, not the current one")

	for _, bad := range []string{"/api/hsk?levels=9", "/api/hsk?levels=one", "/api/hsk?level=0", "/api/hsk?known=-1"} {
		assert.Equal(t, http.StatusBadRequest, send(t, server, http.MethodGet, bad, "").StatusCode, bad)
	}
}

func TestHSKHandlerGapPaging(t *testing.T) {
	server := newLibraryServer(t)

	one := send(t, server, http.MethodGet, "/api/hsk?gaps=1", "")
	var report coverageReport
	require.NoError(t, json.NewDecoder(one.Body).Decode(&report))
	require.Len(t, report.Gaps.Words, 1)
	assert.Equal(t, 3, report.Gaps.Total)
	assert.True(t, report.Gaps.More, "there is more to load")

	all := send(t, server, http.MethodGet, "/api/hsk?gaps=50", "")
	require.NoError(t, json.NewDecoder(all.Body).Decode(&report))
	assert.Len(t, report.Gaps.Words, 3)
	assert.False(t, report.Gaps.More)

	bad := send(t, server, http.MethodGet, "/api/hsk?gaps=abc", "")
	assert.Equal(t, http.StatusBadRequest, bad.StatusCode)
}
