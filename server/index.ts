import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  deleteBlob,
  deletePlan,
  getBlob,
  getPlan,
  getState,
  listPlans,
  putBlob,
  putPlan,
  putState,
  replaceAllPlans,
  type PlanRecord,
} from './db';

const PORT = Number(process.env.RB_PORT ?? 3001);
const SCHEMA_VERSION = 3;

const app = new Hono();

app.use(
  '/*',
  cors({
    origin: '*', // local/intranet only
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 600,
  }),
);

app.get('/api/health', (c) =>
  c.json({ status: 'ok', schemaVersion: SCHEMA_VERSION, uptime: process.uptime() }),
);

// ----- state (current editing) -----
app.get('/api/state', (c) => {
  const data = getState();
  if (data === null) return c.json({ data: null });
  return c.json({ data });
});

app.put('/api/state', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid json' }, 400);
  }
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'expected object body' }, 400);
  }
  putState(body);
  return c.json({ ok: true });
});

// ----- plans -----
app.get('/api/plans', (c) => c.json({ plans: listPlans() }));

app.get('/api/plans/:id', (c) => {
  const id = c.req.param('id');
  const plan = getPlan(id);
  if (!plan) return c.json({ error: 'not found' }, 404);
  return c.json({ plan });
});

app.put('/api/plans/:id', async (c) => {
  const id = c.req.param('id');
  const body = (await c.req.json()) as Partial<PlanRecord>;
  if (typeof body.name !== 'string' || typeof body.savedAt !== 'number') {
    return c.json({ error: 'invalid plan shape' }, 400);
  }
  putPlan({
    id,
    name: body.name,
    savedAt: body.savedAt,
    data: body.data ?? null,
  });
  return c.json({ ok: true });
});

app.delete('/api/plans/:id', (c) => {
  deletePlan(c.req.param('id'));
  return c.json({ ok: true });
});

/** Bulk replace (used for migration / import-replace). */
app.put('/api/plans', async (c) => {
  const body = (await c.req.json()) as { plans?: unknown };
  if (!Array.isArray(body.plans)) {
    return c.json({ error: 'expected { plans: [] }' }, 400);
  }
  const valid: PlanRecord[] = [];
  for (const p of body.plans) {
    if (!p || typeof p !== 'object') continue;
    const r = p as Partial<PlanRecord>;
    if (
      typeof r.id !== 'string' ||
      typeof r.name !== 'string' ||
      typeof r.savedAt !== 'number'
    )
      continue;
    valid.push({ id: r.id, name: r.name, savedAt: r.savedAt, data: r.data ?? null });
  }
  replaceAllPlans(valid);
  return c.json({ ok: true, count: valid.length });
});

// ----- blobs (background images) -----
app.get('/api/blobs/:key', (c) => {
  const blob = getBlob(c.req.param('key'));
  if (!blob) return c.notFound();
  return new Response(new Uint8Array(blob.bytes), {
    headers: {
      'Content-Type': blob.mime,
      'Cache-Control': 'no-cache',
    },
  });
});

app.put('/api/blobs/:key', async (c) => {
  const key = c.req.param('key');
  const mime = c.req.header('Content-Type') ?? 'application/octet-stream';
  const buf = Buffer.from(await c.req.arrayBuffer());
  const MAX_BYTES = 32 * 1024 * 1024;
  if (buf.length > MAX_BYTES) {
    return c.json({ error: 'blob too large (>32MB)' }, 413);
  }
  putBlob(key, mime, buf);
  return c.json({ ok: true, size: buf.length });
});

app.delete('/api/blobs/:key', (c) => {
  deleteBlob(c.req.param('key'));
  return c.json({ ok: true });
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[room-builder server] listening on http://localhost:${info.port}`);
});
