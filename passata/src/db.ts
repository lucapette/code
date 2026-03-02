import Database, { Database as DatabaseType } from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db: DatabaseType = new Database(join(__dirname, '..', 'passata.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS pomodoros (
    id TEXT PRIMARY KEY,
    tag TEXT,
    completed_at INTEGER NOT NULL,
    duration INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL UNIQUE
  );
`);

export interface Pomodoro {
  id: string;
  tag: string | null;
  completed_at: number;
  duration: number;
}

export interface Tag {
  id: string;
  value: string;
}

export const getPomodoros = () => {
  return db
    .prepare('SELECT * FROM pomodoros ORDER BY completed_at DESC')
    .all() as Pomodoro[];
};

export const createPomodoro = (pomodoro: Pomodoro) => {
  const stmt = db.prepare(
    'INSERT INTO pomodoros (id, tag, completed_at, duration) VALUES (?, ?, ?, ?)'
  );
  stmt.run(pomodoro.id, pomodoro.tag, pomodoro.completed_at, pomodoro.duration);
  return pomodoro;
};

export const getTags = () => {
  return db.prepare('SELECT * FROM tags ORDER BY value').all() as Tag[];
};

export const createTag = (tag: Tag) => {
  const stmt = db.prepare('INSERT INTO tags (id, value) VALUES (?, ?)');
  stmt.run(tag.id, tag.value);
  return tag;
};

export const deleteTag = (id: string) => {
  const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
  return stmt.run(id);
};

export const getStats = () => {
  const pomodoros = getPomodoros();

  const byDay: Record<string, number> = {};
  const byTag: Record<string, number> = {};

  for (const p of pomodoros) {
    const date = new Date(p.completed_at).toISOString().split('T')[0];
    byDay[date] = (byDay[date] || 0) + 1;

    if (p.tag) {
      byTag[p.tag] = (byTag[p.tag] || 0) + 1;
    }
  }

  return {
    total: pomodoros.length,
    byDay,
    byTag,
  };
};

export default db;
