package main

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

/* --- The ladder ------------------------------------------------------ */

func TestNextReview(t *testing.T) {
	now := time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name         string
		previous     reviewState
		grade        int
		wantStreak   int
		wantLapses   int
		wantDue      time.Duration
		wantInterval float64
	}{
		{"new card, good", reviewState{}, gradeGood, 1, 0, 24 * time.Hour, 1},
		{"new card, easy", reviewState{}, gradeEasy, 2, 0, 3 * 24 * time.Hour, 3},
		{"new card, again", reviewState{}, gradeAgain, 0, 1, againDelay, 0},
		{"second good", reviewState{Streak: 1, IntervalDays: 1}, gradeGood, 2, 0, 3 * 24 * time.Hour, 3},
		{"third good", reviewState{Streak: 2, IntervalDays: 3}, gradeGood, 3, 0, 7 * 24 * time.Hour, 7},
		{"easy skips a rung", reviewState{Streak: 1, IntervalDays: 1}, gradeEasy, 3, 0, 7 * 24 * time.Hour, 7},
		{"again resets and counts a lapse", reviewState{Streak: 5, Lapses: 2, IntervalDays: 35}, gradeAgain, 0, 3, againDelay, 0},
		{"top rung repeats", reviewState{Streak: 6, IntervalDays: 75}, gradeGood, 7, 0, 75 * 24 * time.Hour, 75},
		{"easy at the top stays there", reviewState{Streak: 6, IntervalDays: 75}, gradeEasy, 8, 0, 75 * 24 * time.Hour, 75},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := nextReview(tt.previous, tt.grade, now)
			assert.Equal(t, now.Add(tt.wantDue), got.DueAt)
			assert.Equal(t, tt.wantStreak, got.Streak)
			assert.Equal(t, tt.wantLapses, got.Lapses)
			assert.Equal(t, tt.wantInterval, got.IntervalDays)
			assert.Equal(t, now, got.ReviewedAt)
			assert.Equal(t, tt.previous.ItemID, got.ItemID)
		})
	}
}

func TestValidGrade(t *testing.T) {
	for grade, valid := range map[int]bool{-1: false, 0: true, 1: true, 2: true, 3: false} {
		assert.Equal(t, valid, validGrade(grade), "grade %d", grade)
	}
}

/* --- The queue ------------------------------------------------------- */

func queueItem(id, meaning string, created time.Time) Item {
	return Item{ID: id, Chinese: id, Meaning: meaning, CreatedAt: created, UpdatedAt: created}
}

func TestBuildReviewQueueDue(t *testing.T) {
	now := time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)
	base := now.Add(-30 * 24 * time.Hour)

	items := []Item{
		queueItem("overdue", "yesterday's word", base),
		queueItem("future", "known well", base.Add(time.Minute)),
		queueItem("new", "never seen", base.Add(2*time.Minute)),
		queueItem("empty", "", base.Add(3*time.Minute)),
		queueItem("boundary", "due right now", base.Add(4*time.Minute)),
	}
	states := map[string]reviewState{
		"overdue":  {ItemID: "overdue", DueAt: now.Add(-24 * time.Hour)},
		"future":   {ItemID: "future", DueAt: now.Add(time.Hour)},
		"boundary": {ItemID: "boundary", DueAt: now},
	}

	queue := buildReviewQueue(items, states, now, "due", 10)

	assert.Equal(t, 3, queue.Due, "overdue, new and the boundary card")
	assert.Equal(t, 4, queue.Total, "the item without a meaning is not reviewable")
	assert.Equal(t, 1, queue.New)
	assert.False(t, queue.More)
	require.Len(t, queue.Cards, 3)
	assert.Equal(t, "overdue", queue.Cards[0].ID, "most overdue first")
	assert.Equal(t, "boundary", queue.Cards[1].ID)
	assert.Equal(t, "new", queue.Cards[2].ID, "unseen cards come after overdue ones")
}

func TestBuildReviewQueueAllIgnoresDates(t *testing.T) {
	now := time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)
	base := now.Add(-30 * 24 * time.Hour)

	items := []Item{
		queueItem("old", "old word", base),
		queueItem("newer", "newer word", base.Add(time.Minute)),
		queueItem("future", "future word", base.Add(2*time.Minute)),
	}
	states := map[string]reviewState{
		"old":    {ItemID: "old", DueAt: now.Add(48 * time.Hour)},
		"newer":  {ItemID: "newer", DueAt: now.Add(48 * time.Hour)},
		"future": {ItemID: "future", DueAt: now.Add(48 * time.Hour)},
	}

	queue := buildReviewQueue(items, states, now, "all", 10)

	assert.Zero(t, queue.Due)
	assert.Equal(t, 3, queue.Total)
	assert.Zero(t, queue.New, "all three have been graded")
	require.Len(t, queue.Cards, 3)
	assert.Equal(t, "future", queue.Cards[0].ID, "all walks the library newest first")
}

func TestBuildReviewQueuePages(t *testing.T) {
	now := time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)
	base := now.Add(-time.Hour)

	items := []Item{
		queueItem("a", "a word", base),
		queueItem("b", "b word", base.Add(time.Minute)),
		queueItem("c", "c word", base.Add(2*time.Minute)),
	}

	queue := buildReviewQueue(items, nil, now, "due", 2)
	assert.True(t, queue.More)
	require.Len(t, queue.Cards, 2)
	assert.Equal(t, 3, queue.Due, "the count is the whole queue, not the page")
}

/* --- Storage --------------------------------------------------------- */

func TestStoreRecordReviewPersists(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	item, err := s.Create(ctx, itemPatch{Chinese: strPtr("冰箱"), Meaning: strPtr("fridge")})
	require.NoError(t, err)

	now := time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)
	state, err := s.recordReview(ctx, item.ID, gradeGood, now)
	require.NoError(t, err)
	assert.Equal(t, 1, state.Streak)
	assert.Equal(t, 1.0, state.IntervalDays)
	assert.Equal(t, now.Add(24*time.Hour), state.DueAt)

	states, err := s.reviewStates(ctx)
	require.NoError(t, err)
	require.Contains(t, states, item.ID)
	assert.Equal(t, state, states[item.ID])

	// A second grade reads the stored schedule back.
	again, err := s.recordReview(ctx, item.ID, gradeAgain, now.Add(time.Minute))
	require.NoError(t, err)
	assert.Zero(t, again.Streak)
	assert.Equal(t, 1, again.Lapses)
	assert.Equal(t, now.Add(time.Minute+againDelay), again.DueAt)

	var logged int
	require.NoError(t, s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM review_log`).Scan(&logged))
	assert.Equal(t, 2, logged, "every grade is kept")
}

func TestStoreRecordReviewUnknownItem(t *testing.T) {
	s := mustStore(t)

	_, err := s.recordReview(context.Background(), "nope", gradeGood, time.Now())
	assert.ErrorIs(t, err, errItemNotFound)
}

func TestStoreDeletingItemTakesReviewWithIt(t *testing.T) {
	s := mustStore(t)
	ctx := context.Background()

	item, err := s.Create(ctx, itemPatch{Chinese: strPtr("蛋糕"), Meaning: strPtr("cake")})
	require.NoError(t, err)
	_, err = s.recordReview(ctx, item.ID, gradeGood, time.Now())
	require.NoError(t, err)
	require.NoError(t, s.Delete(ctx, item.ID))

	var logged, states int
	require.NoError(t, s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM review_log`).Scan(&logged))
	require.NoError(t, s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM review_state`).Scan(&states))
	assert.Zero(t, logged)
	assert.Zero(t, states)
}

/* --- HTTP ------------------------------------------------------------ */

func readReviewState(t *testing.T, resp *http.Response) reviewState {
	t.Helper()

	var state reviewState
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&state))
	return state
}

func readQueue(t *testing.T, resp *http.Response) reviewQueue {
	t.Helper()

	var queue reviewQueue
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&queue))
	return queue
}

func TestReviewHandlerEmptyLibrary(t *testing.T) {
	server := newLibraryServer(t)

	resp := send(t, server, http.MethodGet, "/api/review", "")
	require.Equal(t, http.StatusOK, resp.StatusCode)
	queue := readQueue(t, resp)
	assert.Empty(t, queue.Cards)
	assert.Zero(t, queue.Due)
	assert.Zero(t, queue.Total)
}

func TestReviewHandlerQueuesSavedItems(t *testing.T) {
	server := newLibraryServer(t)

	item := readItem(t, send(t, server, http.MethodPost, "/api/items",
		`{"chinese":"冰箱","meaning":"fridge"}`))
	// No meaning, no card: there is nothing to recall.
	readItem(t, send(t, server, http.MethodPost, "/api/items", `{"chinese":"绵宝"}`))

	queue := readQueue(t, send(t, server, http.MethodGet, "/api/review", ""))
	require.Len(t, queue.Cards, 1)
	assert.Equal(t, item.ID, queue.Cards[0].ID)
	assert.Equal(t, 1, queue.Due)
	assert.Equal(t, 1, queue.New)
	assert.Equal(t, 1, queue.Total)
}

func TestReviewHandlerGradesACard(t *testing.T) {
	server := newLibraryServer(t)

	item := readItem(t, send(t, server, http.MethodPost, "/api/items",
		`{"chinese":"冰箱","meaning":"fridge"}`))

	resp := send(t, server, http.MethodPost, "/api/review",
		`{"item_id":"`+item.ID+`","grade":1}`)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	state := readReviewState(t, resp)
	assert.Equal(t, item.ID, state.ItemID)
	assert.Equal(t, 1, state.Streak)
	assert.Equal(t, 1.0, state.IntervalDays)
	assert.True(t, state.DueAt.After(time.Now().Add(23*time.Hour)), "good means tomorrow")

	// Graded good, the card is no longer due today.
	queue := readQueue(t, send(t, server, http.MethodGet, "/api/review", ""))
	assert.Empty(t, queue.Cards)
	assert.Zero(t, queue.Due)
	assert.Equal(t, 1, queue.Total)

	// "Again" schedules the card ten minutes out; the session itself requeues
	// it locally, so it is still not due for a fresh request.
	resp = send(t, server, http.MethodPost, "/api/review",
		`{"item_id":"`+item.ID+`","grade":0}`)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	state = readReviewState(t, resp)
	assert.Zero(t, state.Streak)
	assert.Equal(t, 1, state.Lapses)
	assert.True(t, state.DueAt.Before(time.Now().Add(11*time.Minute)))

	queue = readQueue(t, send(t, server, http.MethodGet, "/api/review", ""))
	assert.Empty(t, queue.Cards)

	queue = readQueue(t, send(t, server, http.MethodGet, "/api/review?scope=all", ""))
	require.Len(t, queue.Cards, 1)
}

func TestReviewHandlerRejectsBadRequests(t *testing.T) {
	server := newLibraryServer(t)

	tests := []struct {
		name   string
		method string
		path   string
		body   string
		status int
	}{
		{"unknown scope", http.MethodGet, "/api/review?scope=later", "", http.StatusBadRequest},
		{"bad limit", http.MethodGet, "/api/review?limit=abc", "", http.StatusBadRequest},
		{"negative limit", http.MethodGet, "/api/review?limit=-1", "", http.StatusBadRequest},
		{"missing id", http.MethodPost, "/api/review", `{"grade":1}`, http.StatusBadRequest},
		{"missing grade", http.MethodPost, "/api/review", `{"item_id":"x"}`, http.StatusBadRequest},
		{"grade out of range", http.MethodPost, "/api/review", `{"item_id":"x","grade":3}`, http.StatusBadRequest},
		{"unknown item", http.MethodPost, "/api/review", `{"item_id":"x","grade":1}`, http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := send(t, server, tt.method, tt.path, tt.body)
			assert.Equal(t, tt.status, resp.StatusCode)
		})
	}
}
