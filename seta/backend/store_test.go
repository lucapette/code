package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func mustStore(t *testing.T) *store {
	t.Helper()

	s, err := newStore(context.Background(), t.TempDir())
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })
	return s
}

func strPtr(value string) *string      { return &value }
func tagsPtr(tags ...string) *[]string { return &tags }

func TestStoreCreateRequiresChinese(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	_, err := s.Create(ctx, itemPatch{})
	require.Error(t, err)
	assert.EqualError(t, err, "chinese is required")

	_, err = s.Create(ctx, itemPatch{Chinese: strPtr("   ")})
	require.Error(t, err)
	assert.EqualError(t, err, "chinese is required")

	item, err := s.Create(ctx, itemPatch{Chinese: strPtr("  你好  ")})
	require.NoError(t, err)
	assert.Equal(t, "你好", item.Chinese, "text is trimmed")
	assert.NotEmpty(t, item.ID)
	assert.False(t, item.CreatedAt.IsZero())
	assert.Equal(t, item.CreatedAt, item.UpdatedAt)
}

func TestStoreFieldsAreOptional(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	item, err := s.Create(ctx, itemPatch{Chinese: strPtr("你好")})
	require.NoError(t, err)
	assert.Empty(t, item.Meaning)
	assert.Empty(t, item.Where)
	assert.Empty(t, item.Note)
	assert.Empty(t, item.Tags)

	// ...and can be filled in later.
	updated, err := s.Update(ctx, item.ID, itemPatch{
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

	item, err := s.Create(context.Background(), itemPatch{
		Chinese: strPtr("银行"),
		Tags:    tagsPtr("  #food ", "", "food", "tutor", "Tutor"),
	})
	require.NoError(t, err)
	assert.Equal(t, []string{"food", "tutor"}, item.Tags, "trimmed, # stripped, case-insensitively deduped")
}

func TestStoreCaps(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	tooLong := strings.Repeat("字", maxChineseBytes) + "字"
	_, err := s.Create(ctx, itemPatch{Chinese: &tooLong})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "chinese exceeds")

	longField := strings.Repeat("a", maxFieldBytes+1)
	_, err = s.Create(ctx, itemPatch{Chinese: strPtr("你好"), Note: &longField})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "note exceeds")

	manyTags := make([]string, 0, maxTags+1)
	for i := range maxTags + 1 {
		manyTags = append(manyTags, string(rune('a'+i)))
	}
	_, err = s.Create(ctx, itemPatch{Chinese: strPtr("你好"), Tags: &manyTags})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "at most")

	longTag := strings.Repeat("t", maxTagBytes+1)
	_, err = s.Create(ctx, itemPatch{Chinese: strPtr("你好"), Tags: &[]string{longTag}})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "exceeds")
}

func TestStorePersistsAcrossReload(t *testing.T) {
	dir := t.TempDir()

	first, err := newStore(context.Background(), dir)
	require.NoError(t, err)
	created, err := first.Create(context.Background(), itemPatch{
		Chinese: strPtr("丝绸之路"),
		Meaning: strPtr("the Silk Road"),
		Tags:    tagsPtr("history"),
	})
	require.NoError(t, err)
	require.NoError(t, first.Close())

	reopened, err := newStore(context.Background(), dir)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, reopened.Close()) })

	items, err := reopened.List(context.Background())
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, created.ID, items[0].ID)
	assert.Equal(t, "丝绸之路", items[0].Chinese)
	assert.Equal(t, "the Silk Road", items[0].Meaning)
	assert.Equal(t, []string{"history"}, items[0].Tags)
	assert.Equal(t, created.CreatedAt, items[0].CreatedAt, "timestamps survive the round trip exactly")
}

func TestStoreListIsNewestFirst(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	older, err := s.Create(ctx, itemPatch{Chinese: strPtr("一")})
	require.NoError(t, err)
	time.Sleep(time.Millisecond) // ordered by created_at, not by luck
	newer, err := s.Create(ctx, itemPatch{Chinese: strPtr("二")})
	require.NoError(t, err)

	items, err := s.List(ctx)
	require.NoError(t, err)
	require.Len(t, items, 2)
	assert.Equal(t, newer.ID, items[0].ID)
	assert.Equal(t, older.ID, items[1].ID)

	// Copy, not a view: mutating the returned slice must not touch the store.
	items[0].Chinese = "改动"
	again, err := s.List(ctx)
	require.NoError(t, err)
	assert.Equal(t, "二", again[0].Chinese)
}

func TestStoreTagOrderSurvivesReload(t *testing.T) {
	dir := t.TempDir()

	first, err := newStore(context.Background(), dir)
	require.NoError(t, err)
	_, err = first.Create(context.Background(), itemPatch{
		Chinese: strPtr("蛋糕"),
		Tags:    tagsPtr("zebra", "apple", "mango"),
	})
	require.NoError(t, err)
	require.NoError(t, first.Close())

	reopened, err := newStore(context.Background(), dir)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, reopened.Close()) })

	items, err := reopened.List(context.Background())
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, []string{"zebra", "apple", "mango"}, items[0].Tags, "chips keep the order they were typed in")
}

func TestStoreDeletingItemTakesTagsWithIt(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	item, err := s.Create(ctx, itemPatch{Chinese: strPtr("蛋糕"), Tags: tagsPtr("food")})
	require.NoError(t, err)
	require.NoError(t, s.Delete(ctx, item.ID))

	var tags int
	require.NoError(t, s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM tags`).Scan(&tags))
	assert.Zero(t, tags, "foreign keys must cascade")
}

func TestStoreUpdateAndDeleteUnknownID(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	_, err := s.Update(ctx, "nope", itemPatch{Meaning: strPtr("x")})
	assert.ErrorIs(t, err, errItemNotFound)

	err = s.Delete(ctx, "nope")
	assert.ErrorIs(t, err, errItemNotFound)
}

func TestStoreDelete(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	keep, err := s.Create(ctx, itemPatch{Chinese: strPtr("留")})
	require.NoError(t, err)
	drop, err := s.Create(ctx, itemPatch{Chinese: strPtr("删")})
	require.NoError(t, err)

	require.NoError(t, s.Delete(ctx, drop.ID))

	items, err := s.List(ctx)
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, keep.ID, items[0].ID)
}

func TestStoreStartsEmpty(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	items, err := s.List(ctx)
	require.NoError(t, err)
	assert.Empty(t, items)

	count, err := s.count(ctx)
	require.NoError(t, err)
	assert.Zero(t, count)
}

func TestStoreOpensWithExpectedPragmas(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	var journal string
	require.NoError(t, s.db.QueryRowContext(ctx, "PRAGMA journal_mode").Scan(&journal))
	assert.Equal(t, "wal", journal)

	var foreignKeys int
	require.NoError(t, s.db.QueryRowContext(ctx, "PRAGMA foreign_keys").Scan(&foreignKeys))
	assert.Equal(t, 1, foreignKeys)
}

func TestStoreRejectsNewerSchema(t *testing.T) {
	dir := t.TempDir()

	s, err := newStore(context.Background(), dir)
	require.NoError(t, err)
	_, err = s.db.ExecContext(context.Background(), fmt.Sprintf("PRAGMA user_version = %d", len(migrations)+1))
	require.NoError(t, err)
	require.NoError(t, s.Close())

	_, err = newStore(context.Background(), dir)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "newer seta")
}

func TestStoreConcurrentCreates(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	const writers = 20
	var (
		wg      sync.WaitGroup
		mu      sync.Mutex
		failure error
	)
	for i := range writers {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, err := s.Create(ctx, itemPatch{Chinese: strPtr(fmt.Sprintf("词%d", i))})
			if err != nil {
				mu.Lock()
				failure = err
				mu.Unlock()
			}
		}(i)
	}
	wg.Wait()
	require.NoError(t, failure)

	items, err := s.List(ctx)
	require.NoError(t, err)
	assert.Len(t, items, writers, "serialized writes must not lose anything")
}

func TestStoreExportShape(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	_, err := s.Create(ctx, itemPatch{Chinese: strPtr("你好")})
	require.NoError(t, err)

	payload, err := s.export(ctx)
	require.NoError(t, err)
	raw, err := json.Marshal(payload)
	require.NoError(t, err)

	var exported struct {
		Version    int           `json:"version"`
		ExportedAt time.Time     `json:"exported_at"`
		Items      []Item        `json:"items"`
		Reviews    []reviewEntry `json:"reviews"`
		Progress   []reviewState `json:"progress"`
	}
	require.NoError(t, json.Unmarshal(raw, &exported))
	assert.Equal(t, exportVersion, exported.Version)
	assert.False(t, exported.ExportedAt.IsZero())
	require.Len(t, exported.Items, 1)
	assert.Empty(t, exported.Reviews, "no reviews yet, but the field is still an array")
	assert.Empty(t, exported.Progress)
}

func TestStoreExportCarriesTheReviewHistory(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	item, err := s.Create(ctx, itemPatch{Chinese: strPtr("冰箱"), Meaning: strPtr("fridge")})
	require.NoError(t, err)
	now := time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)
	_, err = s.recordReview(ctx, item.ID, gradeGood, now)
	require.NoError(t, err)

	payload, err := s.export(ctx)
	require.NoError(t, err)
	raw, err := json.Marshal(payload)
	require.NoError(t, err)

	var exported struct {
		Version  int           `json:"version"`
		Reviews  []reviewEntry `json:"reviews"`
		Progress []reviewState `json:"progress"`
	}
	require.NoError(t, json.Unmarshal(raw, &exported))
	assert.Equal(t, 2, exported.Version)
	require.Len(t, exported.Reviews, 1)
	assert.Equal(t, item.ID, exported.Reviews[0].ItemID)
	assert.Equal(t, gradeGood, exported.Reviews[0].Grade)
	assert.Equal(t, now, exported.Reviews[0].ReviewedAt)

	require.Len(t, exported.Progress, 1)
	assert.Equal(t, item.ID, exported.Progress[0].ItemID)
	assert.Equal(t, 1, exported.Progress[0].Streak)
}
