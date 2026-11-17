package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	_ "modernc.org/sqlite"
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
	storeFileName = "seta.db"

	// exportVersion is the JSON export's format, not the schema version. The
	// schema lives in PRAGMA user_version (see migrations).
	exportVersion = 2

	// maxChineseBytes caps a saved item's Chinese text. maxFieldBytes caps the
	// optional free-text fields; the tag limits keep the chip editor bearable.
	maxChineseBytes = 2000
	maxFieldBytes   = 2000
	maxTags         = 20
	maxTagBytes     = 40
)

// migrations is the schema, one entry per version: a fresh database gets every
// entry in order, an existing one only what it is missing. Released entries are
// never edited; new shape means a new entry.
var migrations = [][]string{
	{
		`CREATE TABLE items (
			id         TEXT PRIMARY KEY,
			chinese    TEXT NOT NULL,
			meaning    TEXT NOT NULL DEFAULT '',
			source     TEXT NOT NULL DEFAULT '',
			note       TEXT NOT NULL DEFAULT '',
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)`,
		`CREATE INDEX items_created ON items (created_at DESC, id)`,
		// position keeps the chip editor's order; the primary key means a tag
		// cannot be saved twice on the same item.
		`CREATE TABLE tags (
			item_id  TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
			tag      TEXT NOT NULL,
			position INTEGER NOT NULL,
			PRIMARY KEY (item_id, tag)
		) WITHOUT ROWID`,
	},
	{
		// The training log is append-only; review_state is the schedule that
		// log implies. Both leave with the item they belong to.
		`CREATE TABLE review_log (
			id          INTEGER PRIMARY KEY,
			item_id     TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
			mode        TEXT NOT NULL,
			grade       INTEGER NOT NULL CHECK (grade BETWEEN 0 AND 2),
			reviewed_at INTEGER NOT NULL
		)`,
		`CREATE INDEX review_log_item ON review_log (item_id, reviewed_at)`,
		`CREATE TABLE review_state (
			item_id       TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
			due_at        INTEGER NOT NULL,
			interval_days REAL NOT NULL DEFAULT 0,
			streak        INTEGER NOT NULL DEFAULT 0,
			lapses        INTEGER NOT NULL DEFAULT 0,
			reviewed_at   INTEGER NOT NULL
		) WITHOUT ROWID`,
		`CREATE INDEX review_state_due ON review_state (due_at)`,
	},
}

// store is the library: SQLite in one file, with the schema owned by this
// package. A personal notebook does not need a server, and the queries the
// training features need (what is due, what did I grade it) are what a table
// is for.
type store struct {
	db   *sql.DB
	path string
}

// newStore opens (or creates) the library under dir.
func newStore(ctx context.Context, dir string) (*store, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}
	path, err := filepath.Abs(filepath.Join(dir, storeFileName))
	if err != nil {
		return nil, fmt.Errorf("resolve library path: %w", err)
	}

	db, err := sql.Open("sqlite", sqliteDSN(path))
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	// One connection on purpose: a single user has nothing to gain from a pool,
	// and serialized access keeps SQLITE_BUSY out of the picture entirely.
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0)

	s := &store{db: db, path: path}
	if err := s.migrate(ctx); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}

// sqliteDSN pins what the app relies on: WAL so a reader never blocks a write,
// FULL so a committed write survives a crash the way the old atomic file write
// did, and foreign keys so deleting an item takes its tags and history with it.
func sqliteDSN(path string) string {
	return "file:" + filepath.ToSlash(path) +
		"?_pragma=busy_timeout(5000)" +
		"&_pragma=journal_mode(WAL)" +
		"&_pragma=synchronous(FULL)" +
		"&_pragma=foreign_keys(1)"
}

// Close hands the database back, checkpointing the WAL on the way out.
func (s *store) Close() error {
	if err := s.db.Close(); err != nil {
		return fmt.Errorf("close library: %w", err)
	}
	return nil
}

// migrate moves the database to the current schema version.
func (s *store) migrate(ctx context.Context) error {
	var version int
	if err := s.db.QueryRowContext(ctx, "PRAGMA user_version").Scan(&version); err != nil {
		return fmt.Errorf("read schema version: %w", err)
	}
	if version > len(migrations) {
		return fmt.Errorf("%s was written by a newer seta (schema %d)", s.path, version)
	}

	for i := version; i < len(migrations); i++ {
		tx, err := s.db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("begin schema %d: %w", i+1, err)
		}
		for _, statement := range migrations[i] {
			if _, err := tx.ExecContext(ctx, statement); err != nil {
				tx.Rollback()
				return fmt.Errorf("schema %d: %w", i+1, err)
			}
		}
		if _, err := tx.ExecContext(ctx, fmt.Sprintf("PRAGMA user_version = %d", i+1)); err != nil {
			tx.Rollback()
			return fmt.Errorf("record schema %d: %w", i+1, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit schema %d: %w", i+1, err)
		}
	}
	return nil
}

// List returns every item, newest first.
func (s *store) List(ctx context.Context) ([]Item, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, chinese, meaning, source, note, created_at, updated_at
		FROM items
		ORDER BY created_at DESC, id`)
	if err != nil {
		return nil, fmt.Errorf("list items: %w", err)
	}

	items := make([]Item, 0, 32)
	position := make(map[string]int, 32)
	for rows.Next() {
		var (
			item             Item
			created, updated int64
		)
		if err := rows.Scan(&item.ID, &item.Chinese, &item.Meaning, &item.Where,
			&item.Note, &created, &updated); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan item: %w", err)
		}
		item.CreatedAt = fromNanos(created)
		item.UpdatedAt = fromNanos(updated)
		item.Tags = []string{}
		position[item.ID] = len(items)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, fmt.Errorf("list items: %w", err)
	}
	// Close before the tag query: the pool has one connection.
	if err := rows.Close(); err != nil {
		return nil, fmt.Errorf("list items: %w", err)
	}
	if len(items) == 0 {
		return items, nil
	}

	tagRows, err := s.db.QueryContext(ctx,
		`SELECT item_id, tag FROM tags ORDER BY item_id, position`)
	if err != nil {
		return nil, fmt.Errorf("list tags: %w", err)
	}
	defer tagRows.Close()

	for tagRows.Next() {
		var (
			itemID string
			tag    string
		)
		if err := tagRows.Scan(&itemID, &tag); err != nil {
			return nil, fmt.Errorf("scan tag: %w", err)
		}
		if index, ok := position[itemID]; ok {
			items[index].Tags = append(items[index].Tags, tag)
		}
	}
	if err := tagRows.Err(); err != nil {
		return nil, fmt.Errorf("list tags: %w", err)
	}
	return items, nil
}

// Create stores a new item. Only Chinese is required.
func (s *store) Create(ctx context.Context, patch itemPatch) (Item, error) {
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

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Item{}, fmt.Errorf("begin save: %w", err)
	}
	defer tx.Rollback() // no-op once the commit below succeeds

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO items (id, chinese, meaning, source, note, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		item.ID, item.Chinese, item.Meaning, item.Where, item.Note,
		item.CreatedAt.UnixNano(), item.UpdatedAt.UnixNano()); err != nil {
		return Item{}, fmt.Errorf("insert item: %w", err)
	}
	if err := insertTags(ctx, tx, item); err != nil {
		return Item{}, err
	}
	if err := tx.Commit(); err != nil {
		return Item{}, fmt.Errorf("commit item: %w", err)
	}
	return item, nil
}

// Update applies the fields present in the patch, leaving the rest alone.
func (s *store) Update(ctx context.Context, id string, patch itemPatch) (Item, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Item{}, fmt.Errorf("begin update: %w", err)
	}
	defer tx.Rollback()

	var (
		item    Item
		created int64
	)
	err = tx.QueryRowContext(ctx, `
		SELECT id, chinese, meaning, source, note, created_at
		FROM items WHERE id = ?`, id).
		Scan(&item.ID, &item.Chinese, &item.Meaning, &item.Where, &item.Note, &created)
	if errors.Is(err, sql.ErrNoRows) {
		return Item{}, errItemNotFound
	}
	if err != nil {
		return Item{}, fmt.Errorf("read item: %w", err)
	}
	item.CreatedAt = fromNanos(created)

	tags, err := readTags(ctx, tx, id)
	if err != nil {
		return Item{}, err
	}
	item.Tags = tags

	tagsChanged := patch.Tags != nil
	if patch.Chinese != nil {
		chinese, err := cleanChinese(*patch.Chinese)
		if err != nil {
			return Item{}, err
		}
		item.Chinese = chinese
	}
	if err := patch.apply(&item); err != nil {
		return Item{}, err
	}
	item.UpdatedAt = time.Now().UTC()

	if _, err := tx.ExecContext(ctx, `
		UPDATE items SET chinese = ?, meaning = ?, source = ?, note = ?, updated_at = ?
		WHERE id = ?`,
		item.Chinese, item.Meaning, item.Where, item.Note,
		item.UpdatedAt.UnixNano(), item.ID); err != nil {
		return Item{}, fmt.Errorf("update item: %w", err)
	}
	if tagsChanged {
		if _, err := tx.ExecContext(ctx, `DELETE FROM tags WHERE item_id = ?`, item.ID); err != nil {
			return Item{}, fmt.Errorf("replace tags: %w", err)
		}
		if err := insertTags(ctx, tx, item); err != nil {
			return Item{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return Item{}, fmt.Errorf("commit update: %w", err)
	}
	return item, nil
}

// Delete removes one item. Its tags and review history go with it.
func (s *store) Delete(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM items WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete item: %w", err)
	}
	removed, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("count deleted items: %w", err)
	}
	if removed == 0 {
		return errItemNotFound
	}
	return nil
}

// count is the number the startup log prints.
func (s *store) count(ctx context.Context) (int, error) {
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM items`).Scan(&total); err != nil {
		return 0, fmt.Errorf("count items: %w", err)
	}
	return total, nil
}

// export is the escape hatch: every table, plus the format version and when it
// left the app. The review history is included so a backup is not just words.
func (s *store) export(ctx context.Context) (any, error) {
	items, err := s.List(ctx)
	if err != nil {
		return nil, err
	}
	reviews, err := s.reviewLog(ctx)
	if err != nil {
		return nil, err
	}
	states, err := s.reviewStates(ctx)
	if err != nil {
		return nil, err
	}

	progress := make([]reviewState, 0, len(states))
	for _, state := range states {
		progress = append(progress, state)
	}
	sort.Slice(progress, func(i, j int) bool { return progress[i].ItemID < progress[j].ItemID })

	return struct {
		Version    int           `json:"version"`
		ExportedAt time.Time     `json:"exported_at"`
		Items      []Item        `json:"items"`
		Reviews    []reviewEntry `json:"reviews"`
		Progress   []reviewState `json:"progress"`
	}{
		Version:    exportVersion,
		ExportedAt: time.Now().UTC(),
		Items:      items,
		Reviews:    reviews,
		Progress:   progress,
	}, nil
}

// insertTags writes the chips in their saved order.
func insertTags(ctx context.Context, tx *sql.Tx, item Item) error {
	for position, tag := range item.Tags {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO tags (item_id, tag, position) VALUES (?, ?, ?)`,
			item.ID, tag, position); err != nil {
			return fmt.Errorf("insert tag %q: %w", tag, err)
		}
	}
	return nil
}

// readTags returns one item's chips in the order the user arranged them.
func readTags(ctx context.Context, tx *sql.Tx, itemID string) ([]string, error) {
	rows, err := tx.QueryContext(ctx,
		`SELECT tag FROM tags WHERE item_id = ? ORDER BY position`, itemID)
	if err != nil {
		return nil, fmt.Errorf("read tags: %w", err)
	}
	defer rows.Close()

	tags := []string{}
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, fmt.Errorf("scan tag: %w", err)
		}
		tags = append(tags, tag)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read tags: %w", err)
	}
	return tags, nil
}

func fromNanos(nanos int64) time.Time {
	return time.Unix(0, nanos).UTC()
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
