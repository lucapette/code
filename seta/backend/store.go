package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// Item is one saved thing. Only Chinese is required: everything else is a
// column with a default, so the shape can grow without invalidating old rows.
type Item struct {
	ID        string    `json:"id"`
	Chinese   string    `json:"chinese"`
	Meaning   string    `json:"meaning,omitempty"`
	Where     string    `json:"where,omitempty"`
	Note      string    `json:"note,omitempty"`
	Tags      []string  `json:"tags,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

const (
	storeFileName = "items.json"
	storeVersion  = 1

	// maxChineseBytes caps a saved item's Chinese text. maxFieldBytes caps the
	// optional free-text fields; the tag limits keep the chip editor bearable.
	maxChineseBytes = 2000
	maxFieldBytes   = 2000
	maxTags         = 20
	maxTagBytes     = 40
)

// storeFile is the on-disk shape: a version for future migrations, then rows.
type storeFile struct {
	Version int    `json:"version"`
	Items   []Item `json:"items"`
}

// store is a single JSON file guarded by a mutex. For a personal notebook a
// file beats a database: no driver, no schema, and the export is the same
// bytes. Writes replace the file atomically (temp file + rename), so a crash
// mid-write cannot truncate the library.
type store struct {
	path  string
	mu    sync.RWMutex
	items []Item
}

// newStore opens (or initialises) the library under dir.
func newStore(dir string) (*store, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}

	s := &store{path: filepath.Join(dir, storeFileName)}

	raw, err := os.ReadFile(s.path)
	switch {
	case errors.Is(err, os.ErrNotExist):
		return s, nil // fresh install: an empty library, written on first save
	case err != nil:
		return nil, fmt.Errorf("read %s: %w", s.path, err)
	}

	var file storeFile
	if err := json.Unmarshal(raw, &file); err != nil {
		return nil, fmt.Errorf("decode %s: %w", s.path, err)
	}
	if file.Version > storeVersion {
		return nil, fmt.Errorf("%s was written by a newer seta (version %d)", s.path, file.Version)
	}
	s.items = file.Items
	if s.items == nil {
		s.items = []Item{}
	}
	return s, nil
}

// List returns every item, newest first.
func (s *store) List() []Item {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]Item, len(s.items))
	copy(out, s.items)
	sort.SliceStable(out, func(i, j int) bool {
		if !out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].CreatedAt.After(out[j].CreatedAt)
		}
		return out[i].ID < out[j].ID
	})
	return out
}

// chineseTexts is what coverage runs over: just the text, nothing else.
func (s *store) chineseTexts() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	texts := make([]string, 0, len(s.items))
	for _, item := range s.items {
		texts = append(texts, item.Chinese)
	}
	return texts
}

// Create stores a new item. Only Chinese is required.
func (s *store) Create(patch itemPatch) (Item, error) {
	if patch.Chinese == nil {
		return Item{}, validationError{"chinese is required"}
	}
	chinese, err := cleanChinese(*patch.Chinese)
	if err != nil {
		return Item{}, err
	}

	item := Item{ID: newID(), Chinese: chinese, Tags: []string{}}
	now := time.Now().UTC()
	item.CreatedAt, item.UpdatedAt = now, now

	if err := patch.apply(&item); err != nil {
		return Item{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	next := append(s.items[:len(s.items):len(s.items)], item)
	if err := s.writeLocked(next); err != nil {
		return Item{}, err
	}
	s.items = next
	return item, nil
}

// Update applies the fields present in the patch, leaving the rest alone.
func (s *store) Update(id string, patch itemPatch) (Item, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	index := -1
	for i, item := range s.items {
		if item.ID == id {
			index = i
			break
		}
	}
	if index < 0 {
		return Item{}, errItemNotFound
	}

	updated := s.items[index]
	if patch.Chinese != nil {
		chinese, err := cleanChinese(*patch.Chinese)
		if err != nil {
			return Item{}, err
		}
		updated.Chinese = chinese
	}
	if err := patch.apply(&updated); err != nil {
		return Item{}, err
	}
	updated.UpdatedAt = time.Now().UTC()

	next := make([]Item, len(s.items))
	copy(next, s.items)
	next[index] = updated
	if err := s.writeLocked(next); err != nil {
		return Item{}, err
	}
	s.items = next
	return updated, nil
}

// Delete removes one item.
func (s *store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	next := make([]Item, 0, len(s.items))
	found := false
	for _, item := range s.items {
		if item.ID == id {
			found = true
			continue
		}
		next = append(next, item)
	}
	if !found {
		return errItemNotFound
	}
	if err := s.writeLocked(next); err != nil {
		return err
	}
	s.items = next
	return nil
}

// export is the escape hatch: every row, plus the format version and when it
// left the app.
func (s *store) export() any {
	return struct {
		Version    int       `json:"version"`
		ExportedAt time.Time `json:"exported_at"`
		Items      []Item    `json:"items"`
	}{
		Version:    storeVersion,
		ExportedAt: time.Now().UTC(),
		Items:      s.List(),
	}
}

// writeLocked replaces the file atomically. Callers hold the write lock.
func (s *store) writeLocked(items []Item) error {
	encoded, err := json.MarshalIndent(storeFile{Version: storeVersion, Items: items}, "", "  ")
	if err != nil {
		return fmt.Errorf("encode library: %w", err)
	}
	encoded = append(encoded, '\n')

	dir := filepath.Dir(s.path)
	tmp, err := os.CreateTemp(dir, ".items-*.json")
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName) // no-op once the rename succeeded

	if _, err := tmp.Write(encoded); err != nil {
		tmp.Close()
		return fmt.Errorf("write temp file: %w", err)
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return fmt.Errorf("sync temp file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("close temp file: %w", err)
	}
	if err := os.Chmod(tmpName, 0o644); err != nil {
		return fmt.Errorf("chmod temp file: %w", err)
	}
	if err := os.Rename(tmpName, s.path); err != nil {
		return fmt.Errorf("replace library: %w", err)
	}
	return nil
}

// itemPatch is the request body for create and update: pointers so an update
// can tell "field omitted" from "field set to empty".
type itemPatch struct {
	Chinese *string   `json:"chinese"`
	Meaning *string   `json:"meaning"`
	Where   *string   `json:"where"`
	Note    *string   `json:"note"`
	Tags    *[]string `json:"tags"`
}

// apply copies the fields the patch carries onto the item, validating each.
func (p itemPatch) apply(item *Item) error {
	fields := []struct {
		name   string
		value  *string
		target *string
	}{
		{"meaning", p.Meaning, &item.Meaning},
		{"where", p.Where, &item.Where},
		{"note", p.Note, &item.Note},
	}
	for _, field := range fields {
		if field.value == nil {
			continue
		}
		cleaned, err := cleanText(field.name, *field.value)
		if err != nil {
			return err
		}
		*field.target = cleaned
	}

	if p.Tags != nil {
		tags, err := cleanTags(*p.Tags)
		if err != nil {
			return err
		}
		item.Tags = tags
	}
	return nil
}

func cleanChinese(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", validationError{"chinese is required"}
	}
	if len(trimmed) > maxChineseBytes {
		return "", validationError{fmt.Sprintf("chinese exceeds %d bytes", maxChineseBytes)}
	}
	return trimmed, nil
}

func cleanText(field, value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) > maxFieldBytes {
		return "", validationError{fmt.Sprintf("%s exceeds %d bytes", field, maxFieldBytes)}
	}
	return trimmed, nil
}

// cleanTags trims, drops blanks and duplicates, and enforces the caps.
func cleanTags(tags []string) ([]string, error) {
	seen := make(map[string]struct{}, len(tags))
	cleaned := make([]string, 0, len(tags))

	for _, tag := range tags {
		tag = strings.TrimPrefix(strings.TrimSpace(tag), "#")
		if tag == "" {
			continue
		}
		if len(tag) > maxTagBytes {
			return nil, validationError{fmt.Sprintf("tag %q exceeds %d bytes", tag, maxTagBytes)}
		}
		key := strings.ToLower(tag)
		if _, duplicate := seen[key]; duplicate {
			continue
		}
		seen[key] = struct{}{}
		cleaned = append(cleaned, tag)
	}

	if len(cleaned) > maxTags {
		return nil, validationError{fmt.Sprintf("at most %d tags per item", maxTags)}
	}
	return cleaned, nil
}

func newID() string {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		// crypto/rand failing is not a condition this app can carry on from.
		panic(fmt.Sprintf("generate id: %v", err))
	}
	return hex.EncodeToString(buf)
}

// validationError is a client mistake: its message is safe to show verbatim.
type validationError struct{ msg string }

func (e validationError) Error() string { return e.msg }

var errItemNotFound = errors.New("item not found")
