package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
)

// maxItemBodyBytes caps an item request body. The individual fields are capped
// too; this is the envelope.
const maxItemBodyBytes = 64 << 10

// maxGapPage and maxKnownPage bound ?gaps= and ?known= so a hand-written
// request cannot ask for everything at once.
const (
	maxGapPage   = 1000
	maxKnownPage = 1000
)

// listItemsHandler returns the whole library, newest first.
func (a *app) listItemsHandler(w http.ResponseWriter, r *http.Request) {
	items, err := a.items.List(r.Context())
	if err != nil {
		writeLibraryError(w, "library read failed", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// createItemHandler saves one item. Only chinese is required.
func (a *app) createItemHandler(w http.ResponseWriter, r *http.Request) {
	var patch itemPatch
	if !decodeItemBody(w, r, &patch) {
		return
	}

	item, err := a.items.Create(r.Context(), patch)
	if err != nil {
		writeItemError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

// updateItemHandler applies a partial update to one item.
func (a *app) updateItemHandler(w http.ResponseWriter, r *http.Request) {
	var patch itemPatch
	if !decodeItemBody(w, r, &patch) {
		return
	}

	item, err := a.items.Update(r.Context(), r.PathValue("id"), patch)
	if err != nil {
		writeItemError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

// deleteItemHandler removes one item.
func (a *app) deleteItemHandler(w http.ResponseWriter, r *http.Request) {
	if err := a.items.Delete(r.Context(), r.PathValue("id")); err != nil {
		writeItemError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// exportItemsHandler hands the library back as a file. This is the escape
// hatch that makes reshaping the data model safe.
func (a *app) exportItemsHandler(w http.ResponseWriter, r *http.Request) {
	filename := fmt.Sprintf("seta-library-%s.json", time.Now().UTC().Format("2006-01-02"))
	payload, err := a.items.export(r.Context())
	if err != nil {
		writeLibraryError(w, "library read failed", err)
		return
	}
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	writeJSON(w, http.StatusOK, payload)
}

// hskHandler serves the HSK tab. ?levels= picks which bands the known-word list
// covers, ?known= and ?gaps= are the two "load more" pages, and ?level= asks for
// the gaps of a band other than the current one.
func (a *app) hskHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	levels, err := a.hsk.parseLevels(query.Get("levels"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	gapLevel := 0
	if raw := query.Get("level"); raw != "" {
		gapLevel, err = strconv.Atoi(raw)
		if err != nil || !a.hsk.hasLevel(gapLevel) {
			writeError(w, http.StatusBadRequest, "invalid HSK level")
			return
		}
	}

	known, err := pageParam(query.Get("known"), knownPage, maxKnownPage)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid known count")
		return
	}
	gaps, err := pageParam(query.Get("gaps"), gapPage, maxGapPage)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid gaps count")
		return
	}

	items, err := a.items.List(r.Context())
	if err != nil {
		writeLibraryError(w, "library read failed", err)
		return
	}

	report := a.hsk.coverage(items, coverageQuery{
		KnownLevels: levels,
		KnownPage:   known,
		GapLevel:    gapLevel,
		GapPage:     gaps,
	})
	writeJSON(w, http.StatusOK, report)
}

// hskSearchHandler searches the whole vocabulary instead of one band: ?q= is
// the query (Chinese, pinyin with or without tones, or English), ?limit= the
// page size. Every hit says whether the user has met it yet.
func (a *app) hskSearchHandler(w http.ResponseWriter, r *http.Request) {
	raw := strings.TrimSpace(r.URL.Query().Get("q"))
	if raw == "" {
		writeError(w, http.StatusBadRequest, "missing search query")
		return
	}
	if len([]rune(raw)) > maxSearchRunes {
		writeError(w, http.StatusBadRequest, "search query is too long")
		return
	}

	limit, err := pageParam(r.URL.Query().Get("limit"), searchPage, maxSearchPage)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid search count")
		return
	}

	items, err := a.items.List(r.Context())
	if err != nil {
		writeLibraryError(w, "library read failed", err)
		return
	}

	writeJSON(w, http.StatusOK, a.hsk.search(raw, items, limit))
}

// parseLevels reads ?levels=1,2,3 against the embedded bands. An absent or
// empty value keeps the app's default (the first three).
func (h *hskIndex) parseLevels(raw string) ([]int, error) {
	if raw == "" {
		return defaultKnownLevels, nil
	}

	requested := map[int]struct{}{}
	for _, part := range strings.Split(raw, ",") {
		level, err := strconv.Atoi(strings.TrimSpace(part))
		if err != nil || !h.hasLevel(level) {
			return nil, fmt.Errorf("invalid HSK level %q", part)
		}
		requested[level] = struct{}{}
	}
	if len(requested) == 0 {
		return nil, errors.New("no HSK levels requested")
	}

	levels := make([]int, 0, len(requested))
	for level := range requested {
		levels = append(levels, level)
	}
	sort.Ints(levels)
	return levels, nil
}

// pageParam reads one "load more" count, clamped to the route's ceiling.
func pageParam(raw string, fallback, limit int) (int, error) {
	if raw == "" {
		return fallback, nil
	}
	requested, err := strconv.Atoi(raw)
	if err != nil || requested < 0 {
		return 0, errors.New("invalid count")
	}
	return min(requested, limit), nil
}

func decodeItemBody(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxItemBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "item too large")
			return false
		}
		writeError(w, http.StatusBadRequest, "invalid request body")
		return false
	}
	return true
}

// writeItemError maps library failures onto the app's clean statuses.
func writeItemError(w http.ResponseWriter, err error) {
	var invalid validationError
	switch {
	case errors.As(err, &invalid):
		writeError(w, http.StatusBadRequest, invalid.Error())
	case errors.Is(err, errItemNotFound):
		writeError(w, http.StatusNotFound, "item not found")
	default:
		writeLibraryError(w, "library write failed", err)
	}
}

// writeLibraryError is the read/write failure path: logged in full, answered
// with something safe to show.
func writeLibraryError(w http.ResponseWriter, message string, err error) {
	log.Printf("library: %v", err)
	writeError(w, http.StatusInternalServerError, message)
}
