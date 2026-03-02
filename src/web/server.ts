import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { apiRoutes } from './routes';
import * as fs from 'fs';
import * as path from 'path';

const app = new Hono();

// Mount API routes
app.route('/api', apiRoutes);

// Serve index.html for root path
app.get('/', (c) => {
  const htmlPath = path.join(__dirname, '../../src/web/public/index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  return c.html(html);
});

const port = parseInt(process.env.WEB_PORT || '3000', 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Web UI running at http://localhost:${port}`);
});
