package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func mustStore(t *testing.T) *store {
	t.Helper()
	s, err := newStore(t.TempDir())
	require.NoError(t, err)
	return s
}

func strPtr(value string) *string      { return &value }
func tagsPtr(tags ...string) *[]string { return &tags }

func TestStoreCreateRequiresChinese(t *testing.T) {
	s := mustStore(t)

	_, err := s.Create(itemPatch{})
	require.Error(t, err)
	assert.EqualError(t, err, "chinese is required")

	_, err = s.Create(itemPatch{Chinese: strPtr("   ")})
	require.Error(t, err)
	assert.EqualError(t, err, "chinese is required")

	item, err := s.Create(itemPatch{Chinese: strPtr("  你好  ")})
	require.NoError(t, err)
	assert.Equal(t, "你好", item.Chinese, "text is trimmed")
	assert.NotEmpty(t, item.ID)
	assert.False(t, item.CreatedAt.IsZero())
	assert.Equal(t, item.CreatedAt, item.UpdatedAt)
}

func TestStoreFieldsAreOptional(t *testing.T) {
	s := mustStore(t)

	item, err := s.Create(itemPatch{Chinese: strPtr("你好")})
	require.NoError(t, err)
	assert.Empty(t, item.Meaning)
	assert.Empty(t, item.Where)
	assert.Empty(t, item.Note)
	assert.Empty(t, item.Tags)

	// ...and can be filled in later.
	updated, err := s.Update(item.ID, itemPatch{
		Meaning: strPtr("hello"),
		Where:   strPtr("a sign at the mall"),
		Note:    strPtr("said twice, quickly"),
		Tags:    tagsPtr("greeting", "tutor-said"),
	})
	require.NoError(t, err)
	assert.Equal(t, "你好", updated.Chinese, "an update without chinese leaves it alone")
	assert.Equal(t, "hello", updated.Meaning)
	assert.Equal(t, []string{"greeting", "tutor-said"}, updated.Tags)
	assert.True(t, updated.UpdatedAt.After(item.UpdatedAt) || updated.UpdatedAt.Equal(item.UpdatedAt))
}

func TestStoreCleansTags(t *testing.T) {
	s := mustStore(t)

	item, err := s.Create(itemPatch{
		Chinese: strPtr("银行"),
		Tags:    tagsPtr("  #food ", "", "food", "tutor", "Tutor"),
	})
	require.NoError(t, err)
	assert.Equal(t, []string{"food", "tutor"}, item.Tags, "trimmed, # stripped, case-insensitively deduped")
}

func TestStoreCaps(t *testing.T) {
	s := mustStore(t)

	tooLong := strings.Repeat("字", maxChineseBytes) + "字"
	_, err := s.Create(itemPatch{Chinese: &tooLong})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "chinese exceeds")

	longField := strings.Repeat("a", maxFieldBytes+1)
	_, err = s.Create(itemPatch{Chinese: strPtr("你好"), Note: &longField})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "note exceeds")

	manyTags := make([]string, 0, maxTags+1)
	for i := range maxTags + 1 {
		manyTags = append(manyTags, string(rune('a'+i)))
	}
	_, err = s.Create(itemPatch{Chinese: strPtr("你好"), Tags: &manyTags})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "at most")

	longTag := strings.Repeat("t", maxTagBytes+1)
	_, err = s.Create(itemPatch{Chinese: strPtr("你好"), Tags: &[]string{longTag}})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "exceeds")
}

func TestStorePersistsAcrossReload(t *testing.T) {
	dir := t.TempDir()

	first, err := newStore(dir)
	require.NoError(t, err)
	created, err := first.Create(itemPatch{
		Chinese: strPtr("丝绸之路"),
		Meaning: strPtr("the Silk Road"),
		Tags:    tagsPtr("history"),
	})
	require.NoError(t, err)

	reopened, err := newStore(dir)
	require.NoError(t, err)

	items := reopened.List()
	require.Len(t, items, 1)
	assert.Equal(t, created.ID, items[0].ID)
	assert.Equal(t, "丝绸之路", items[0].Chinese)
	assert.Equal(t, "the Silk Road", items[0].Meaning)
	assert.Equal(t, []string{"history"}, items[0].Tags)
}

func TestStoreFileIsAWholeDocument(t *testing.T) {
	dir := t.TempDir()
	s, err := newStore(dir)
	require.NoError(t, err)
	_, err = s.Create(itemPatch{Chinese: strPtr("你好")})
	require.NoError(t, err)

	raw, err := os.ReadFile(filepath.Join(dir, storeFileName))
	require.NoError(t, err)

	var file storeFile
	require.NoError(t, json.Unmarshal(raw, &file), "the file must always be valid JSON")
	assert.Equal(t, storeVersion, file.Version)
	require.Len(t, file.Items, 1)

	// No temp files left behind by the atomic write.
	entries, err := os.ReadDir(dir)
	require.NoError(t, err)
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		names = append(names, entry.Name())
	}
	assert.ElementsMatch(t, []string{storeFileName}, names)
}

func TestStoreListIsNewestFirst(t *testing.T) {
	s := mustStore(t)

	older, err := s.Create(itemPatch{Chinese: strPtr("一")})
	require.NoError(t, err)
	newer, err := s.Create(itemPatch{Chinese: strPtr("二")})
	require.NoError(t, err)

	items := s.List()
	require.Len(t, items, 2)
	assert.Equal(t, newer.ID, items[0].ID)
	assert.Equal(t, older.ID, items[1].ID)

	// Copy, not a view: mutating the returned slice must not touch the store.
	items[0].Chinese = "改动"
	assert.Equal(t, "二", s.List()[0].Chinese)
}

func TestStoreUpdateAndDeleteUnknownID(t *testing.T) {
	s := mustStore(t)

	_, err := s.Update("nope", itemPatch{Meaning: strPtr("x")})
	assert.ErrorIs(t, err, errItemNotFound)

	err = s.Delete("nope")
	assert.ErrorIs(t, err, errItemNotFound)
}

func TestStoreDelete(t *testing.T) {
	s := mustStore(t)

	keep, err := s.Create(itemPatch{Chinese: strPtr("留")})
	require.NoError(t, err)
	drop, err := s.Create(itemPatch{Chinese: strPtr("删")})
	require.NoError(t, err)

	require.NoError(t, s.Delete(drop.ID))

	items := s.List()
	require.Len(t, items, 1)
	assert.Equal(t, keep.ID, items[0].ID)
}

func TestStoreRejectsNewerFileVersion(t *testing.T) {
	dir := t.TempDir()
	raw, err := json.Marshal(storeFile{Version: storeVersion + 1})
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(filepath.Join(dir, storeFileName), raw, 0o644))

	_, err = newStore(dir)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "newer seta")
}

func TestStoreReportsCorruptFile(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, storeFileName), []byte("{not json"), 0o644))

	_, err := newStore(dir)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "decode")
}

func TestStoreExportShape(t *testing.T) {
	s := mustStore(t)
	_, err := s.Create(itemPatch{Chinese: strPtr("你好")})
	require.NoError(t, err)

	raw, err := json.Marshal(s.export())
	require.NoError(t, err)

	var exported struct {
		Version    int       `json:"version"`
		ExportedAt time.Time `json:"exported_at"`
		Items      []Item    `json:"items"`
	}
	require.NoError(t, json.Unmarshal(raw, &exported))
	assert.Equal(t, storeVersion, exported.Version)
	assert.False(t, exported.ExportedAt.IsZero())
	require.Len(t, exported.Items, 1)
}
