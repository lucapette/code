import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { Liquid } from 'liquidjs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import api from './api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Hono();
const liquid = new Liquid({
  root: join(__dirname, 'views'),
  extname: '.liquid',
});

const render = (template: string, data: Record<string, unknown> = {}) => {
  return liquid.renderFile(template, data);
};

app.get('/', async (c) => {
  const html = await render('home.liquid', { title: 'Get it done!' });
  return c.html(html);
});

app.get('/tags', async (c) => {
  const html = await render('tags.liquid', { title: 'Tags' });
  return c.html(html);
});

app.get('/stats', async (c) => {
  const html = await render('stats.liquid', { title: 'Stats' });
  return c.html(html);
});

app.route('/api', api);

app.get('*', async (c) => {
  const path = c.req.path;
  if (
    path.startsWith('/css/') ||
    path.startsWith('/js/') ||
    path === '/favicon.ico'
  ) {
    const fs = await import('fs');
    const filePath = join(__dirname, '..', 'public', path);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      const ext = path.split('.').pop();
      const contentTypes: Record<string, string> = {
        css: 'text/css',
        js: 'application/javascript',
        ico: 'image/x-icon',
      };
      return new Response(content, {
        headers: { 'Content-Type': contentTypes[ext || ''] || 'text/plain' },
      });
    }
  }
  return c.text('Not found', 404);
});

const port = parseInt(process.env.PORT || '3000');
console.log(`Server running at http://localhost:${port}`);
serve({ fetch: app.fetch, port });

export default app;
