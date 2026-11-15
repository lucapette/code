package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
)

// maxItemBodyBytes caps an item request body. The individual fields are capped
// too; this is the envelope.
const maxItemBodyBytes = 64 << 10

// maxGapPage bounds ?gaps= so a hand-written request cannot ask for everything
// at once.
const maxGapPage = 1000

// listItemsHandler returns the whole library, newest first.
func (a *app) listItemsHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"items": a.items.List()})
}

// createItemHandler saves one item. Only chinese is required.
func (a *app) createItemHandler(w http.ResponseWriter, r *http.Request) {
	var patch itemPatch
	if !decodeItemBody(w, r, &patch) {
		return
	}

	item, err := a.items.Create(patch)
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

	item, err := a.items.Update(r.PathValue("id"), patch)
	if err != nil {
		writeItemError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

// deleteItemHandler removes one item.
func (a *app) deleteItemHandler(w http.ResponseWriter, r *http.Request) {
	if err := a.items.Delete(r.PathValue("id")); err != nil {
		writeItemError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// exportItemsHandler hands the library back as a file. This is the escape
// hatch that makes reshaping the data model safe.
func (a *app) exportItemsHandler(w http.ResponseWriter, r *http.Request) {
	filename := fmt.Sprintf("seta-library-%s.json", time.Now().UTC().Format("2006-01-02"))
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	writeJSON(w, http.StatusOK, a.items.export())
}

// hskHandler serves the HSK tab: coverage per level, the current level, and
// that level's gaps. ?gaps=N is the client's "load more".
func (a *app) hskHandler(w http.ResponseWriter, r *http.Request) {
	page := gapPage
	if raw := r.URL.Query().Get("gaps"); raw != "" {
		requested, err := strconv.Atoi(raw)
		if err != nil || requested < 0 {
			writeError(w, http.StatusBadRequest, "invalid gaps count")
			return
		}
		page = min(requested, maxGapPage)
	}

	writeJSON(w, http.StatusOK, a.hsk.coverage(a.items.chineseTexts(), page))
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
		log.Printf("library: %v", err)
		writeError(w, http.StatusInternalServerError, "library write failed")
	}
}
