import { Hono } from 'hono';
import { ulid } from 'ulid';
import {
  getPomodoros,
  createPomodoro,
  getTags,
  createTag,
  deleteTag,
  getStats,
  resetDb,
} from './db';

const api = new Hono();

api.get('/pomodoros', (c) => {
  const pomodoros = getPomodoros();
  return c.json(pomodoros);
});

api.post('/pomodoros', async (c) => {
  const body = await c.req.json();
  const pomodoro = {
    id: ulid(),
    tag: body.tag || null,
    completed_at: Date.now(),
    duration: body.duration || 25 * 60,
  };
  createPomodoro(pomodoro);
  return c.json(pomodoro, 201);
});

api.get('/tags', (c) => {
  const tags = getTags();
  return c.json(tags);
});

api.post('/tags', async (c) => {
  const body = await c.req.json();
  const tag = {
    id: ulid(),
    value: body.value.replace(/\s/g, '_'),
  };
  createTag(tag);
  return c.json(tag, 201);
});

api.delete('/tags/:id', (c) => {
  const id = c.req.param('id');
  deleteTag(id);
  return c.body(null, 204);
});

api.get('/stats', (c) => {
  const stats = getStats();
  return c.json(stats);
});

api.post('/test/reset', () => {
  resetDb();
  return new Response(null, { status: 204 });
});

export default api;
