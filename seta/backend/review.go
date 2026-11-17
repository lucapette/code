package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"
)

// Review is the training side of the library: go over what you saved, grade
// how well you recalled it, and let a fixed ladder decide when it comes back.
// One card is one saved item; the card shows the characters and the pinyin,
// so what is being trained is meaning, not writing.
const (
	reviewMode = "recognize"

	// reviewPage is how many cards one request returns; maxReviewPage is the
	// ceiling a hand-written request is clamped to.
	reviewPage    = 200
	maxReviewPage = 1000

	// againDelay is what "I had no idea" buys: the card returns in this
	// session rather than tomorrow.
	againDelay = 10 * time.Minute
)

// reviewLadder is the interval after each successful recall, in order. Good
// moves one rung, easy skips one, and the top rung repeats.
var reviewLadder = []time.Duration{
	1 * 24 * time.Hour,
	3 * 24 * time.Hour,
	7 * 24 * time.Hour,
	16 * 24 * time.Hour,
	35 * 24 * time.Hour,
	75 * 24 * time.Hour,
}

// The three answers a card takes.
const (
	gradeAgain = 0
	gradeGood  = 1
	gradeEasy  = 2
)

// reviewEntry is one line of the append-only history, used by the export.
type reviewEntry struct {
	ItemID     string    `json:"item_id"`
	Mode       string    `json:"mode"`
	Grade      int       `json:"grade"`
	ReviewedAt time.Time `json:"reviewed_at"`
}

// reviewState is one row of review_state: when the card is next due and how it
// got there. IntervalDays is what the UI shows; the ladder is what decides it.
type reviewState struct {
	ItemID       string    `json:"item_id"`
	DueAt        time.Time `json:"due_at"`
	IntervalDays float64   `json:"interval_days"`
	Streak       int       `json:"streak"`
	Lapses       int       `json:"lapses"`
	ReviewedAt   time.Time `json:"reviewed_at"`
}

// reviewQueue is one page of cards plus the counts the UI needs before it
// renders anything: how many are due, how many are new, how many exist.
type reviewQueue struct {
	Cards []Item `json:"cards"`
	Due   int    `json:"due"`
	Total int    `json:"total"`
	New   int    `json:"new"`
	More  bool   `json:"more"`
}

// nextReview advances one card one step. It is pure: the ladder is easier to
// trust when it can be checked without a database.
func nextReview(previous reviewState, grade int, now time.Time) reviewState {
	now = now.UTC()
	next := reviewState{
		ItemID:     previous.ItemID,
		Lapses:     previous.Lapses,
		ReviewedAt: now,
	}

	streak := previous.Streak
	switch grade {
	case gradeAgain:
		streak = 0
		next.Lapses++
		next.DueAt = now.Add(againDelay)
		next.IntervalDays = 0
	case gradeGood:
		streak++
		next.DueAt, next.IntervalDays = reviewRung(streak, now)
	case gradeEasy:
		streak += 2
		next.DueAt, next.IntervalDays = reviewRung(streak, now)
	}
	next.Streak = streak
	return next
}

// reviewRung maps a streak onto the ladder, capped at the top.
func reviewRung(streak int, now time.Time) (time.Time, float64) {
	index := min(streak-1, len(reviewLadder)-1)
	interval := reviewLadder[index]
	return now.Add(interval), interval.Hours() / 24
}

func validGrade(grade int) bool {
	return grade >= gradeAgain && grade <= gradeEasy
}

// buildReviewQueue turns the library and its review state into the cards a
// session shows. "due" is overdue cards first, then cards never reviewed;
// "all" ignores dates and walks the library newest first. Items without a
// meaning are not cards: there is nothing to recall.
func buildReviewQueue(items []Item, states map[string]reviewState, now time.Time, scope string, limit int) reviewQueue {
	due := make([]Item, 0, len(items))
	reviewable := make([]Item, 0, len(items))
	newCards := 0

	for _, item := range items {
		if strings.TrimSpace(item.Meaning) == "" {
			continue
		}
		reviewable = append(reviewable, item)

		state, seen := states[item.ID]
		if !seen {
			newCards++
		}
		if !seen || !state.DueAt.After(now) {
			due = append(due, item)
		}
	}

	// Overdue cards by how overdue they are; unseen cards in the order they
	// entered the library.
	sort.SliceStable(due, func(i, j int) bool {
		left, leftSeen := states[due[i].ID]
		right, rightSeen := states[due[j].ID]
		if leftSeen != rightSeen {
			return leftSeen
		}
		if leftSeen && !left.DueAt.Equal(right.DueAt) {
			return left.DueAt.Before(right.DueAt)
		}
		return due[i].CreatedAt.Before(due[j].CreatedAt)
	})

	sort.SliceStable(reviewable, func(i, j int) bool {
		if !reviewable[i].CreatedAt.Equal(reviewable[j].CreatedAt) {
			return reviewable[i].CreatedAt.After(reviewable[j].CreatedAt)
		}
		return reviewable[i].ID < reviewable[j].ID
	})

	chosen := due
	if scope == "all" {
		chosen = reviewable
	}

	queue := reviewQueue{
		Cards: make([]Item, 0, min(len(chosen), limit)),
		Due:   len(due),
		Total: len(reviewable),
		New:   newCards,
	}
	for _, item := range chosen {
		if len(queue.Cards) == limit {
			queue.More = true
			break
		}
		queue.Cards = append(queue.Cards, item)
	}
	return queue
}

// reviewStates loads every card's schedule. The training set is personal and
// small, so one map is cheaper than a join against derived rows.
func (s *store) reviewStates(ctx context.Context) (map[string]reviewState, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT item_id, due_at, interval_days, streak, lapses, reviewed_at
		FROM review_state`)
	if err != nil {
		return nil, fmt.Errorf("list review state: %w", err)
	}
	defer rows.Close()

	states := make(map[string]reviewState)
	for rows.Next() {
		var (
			state    reviewState
			dueAt    int64
			reviewed int64
		)
		if err := rows.Scan(&state.ItemID, &dueAt, &state.IntervalDays,
			&state.Streak, &state.Lapses, &reviewed); err != nil {
			return nil, fmt.Errorf("scan review state: %w", err)
		}
		state.DueAt = fromNanos(dueAt)
		state.ReviewedAt = fromNanos(reviewed)
		states[state.ItemID] = state
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list review state: %w", err)
	}
	return states, nil
}

// reviewLog returns every graded card, oldest first, for the export.
func (s *store) reviewLog(ctx context.Context) ([]reviewEntry, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT item_id, mode, grade, reviewed_at
		FROM review_log ORDER BY reviewed_at, id`)
	if err != nil {
		return nil, fmt.Errorf("list review log: %w", err)
	}
	defer rows.Close()

	entries := make([]reviewEntry, 0, 32)
	for rows.Next() {
		var (
			entry    reviewEntry
			reviewed int64
		)
		if err := rows.Scan(&entry.ItemID, &entry.Mode, &entry.Grade, &reviewed); err != nil {
			return nil, fmt.Errorf("scan review log: %w", err)
		}
		entry.ReviewedAt = fromNanos(reviewed)
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list review log: %w", err)
	}
	return entries, nil
}

// recordReview appends the grade to the history and advances the schedule, in
// one transaction: a logged grade always has its new due date.
func (s *store) recordReview(ctx context.Context, itemID string, grade int, now time.Time) (reviewState, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return reviewState{}, fmt.Errorf("begin review: %w", err)
	}
	defer tx.Rollback()

	var exists int
	err = tx.QueryRowContext(ctx, `SELECT 1 FROM items WHERE id = ?`, itemID).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return reviewState{}, errItemNotFound
	}
	if err != nil {
		return reviewState{}, fmt.Errorf("read item: %w", err)
	}

	previous := reviewState{ItemID: itemID}
	var (
		dueAt    int64
		reviewed int64
	)
	err = tx.QueryRowContext(ctx, `
		SELECT due_at, interval_days, streak, lapses, reviewed_at
		FROM review_state WHERE item_id = ?`, itemID).
		Scan(&dueAt, &previous.IntervalDays, &previous.Streak, &previous.Lapses, &reviewed)
	switch {
	case errors.Is(err, sql.ErrNoRows):
		// never reviewed: the ladder starts from zero
	case err != nil:
		return reviewState{}, fmt.Errorf("read review state: %w", err)
	default:
		previous.DueAt = fromNanos(dueAt)
		previous.ReviewedAt = fromNanos(reviewed)
	}

	next := nextReview(previous, grade, now)

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO review_log (item_id, mode, grade, reviewed_at)
		VALUES (?, ?, ?, ?)`,
		itemID, reviewMode, grade, next.ReviewedAt.UnixNano()); err != nil {
		return reviewState{}, fmt.Errorf("log review: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO review_state (item_id, due_at, interval_days, streak, lapses, reviewed_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(item_id) DO UPDATE SET
			due_at = excluded.due_at,
			interval_days = excluded.interval_days,
			streak = excluded.streak,
			lapses = excluded.lapses,
			reviewed_at = excluded.reviewed_at`,
		next.ItemID, next.DueAt.UnixNano(), next.IntervalDays,
		next.Streak, next.Lapses, next.ReviewedAt.UnixNano()); err != nil {
		return reviewState{}, fmt.Errorf("save review state: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return reviewState{}, fmt.Errorf("commit review: %w", err)
	}
	return next, nil
}

// reviewHandler serves the cards: ?scope=due|all, ?limit= caps the page.
func (a *app) reviewHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	scope := query.Get("scope")
	if scope == "" {
		scope = "due"
	}
	if scope != "due" && scope != "all" {
		writeError(w, http.StatusBadRequest, "invalid review scope")
		return
	}

	limit, err := pageParam(query.Get("limit"), reviewPage, maxReviewPage)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid review count")
		return
	}
	if limit == 0 {
		limit = reviewPage
	}

	items, err := a.items.List(r.Context())
	if err != nil {
		writeLibraryError(w, "library read failed", err)
		return
	}
	states, err := a.items.reviewStates(r.Context())
	if err != nil {
		writeLibraryError(w, "library read failed", err)
		return
	}

	writeJSON(w, http.StatusOK, buildReviewQueue(items, states, time.Now().UTC(), scope, limit))
}

// reviewRequest is the body of one graded card.
type reviewRequest struct {
	ItemID string `json:"item_id"`
	Grade  *int   `json:"grade"`
}

// createReviewHandler records one grade and returns the card's next due date.
func (a *app) createReviewHandler(w http.ResponseWriter, r *http.Request) {
	var body reviewRequest
	if !decodeItemBody(w, r, &body) {
		return
	}
	if body.ItemID == "" {
		writeError(w, http.StatusBadRequest, "missing item id")
		return
	}
	if body.Grade == nil || !validGrade(*body.Grade) {
		writeError(w, http.StatusBadRequest, "grade must be 0, 1 or 2")
		return
	}

	state, err := a.items.recordReview(r.Context(), body.ItemID, *body.Grade, time.Now().UTC())
	if err != nil {
		if errors.Is(err, errItemNotFound) {
			writeError(w, http.StatusNotFound, "item not found")
			return
		}
		log.Printf("review: %v", err)
		writeError(w, http.StatusInternalServerError, "review save failed")
		return
	}
	writeJSON(w, http.StatusOK, state)
}
