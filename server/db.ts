import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DB_PATH = process.env.RB_DB_PATH ?? resolve(process.cwd(), 'data/room-builder.sqlite');

if (!existsSync(dirname(DB_PATH))) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS state (
    id TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    saved_at INTEGER NOT NULL,
    json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS blobs (
    key TEXT PRIMARY KEY,
    mime TEXT NOT NULL,
    bytes BLOB NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

interface StateRow {
  id: string;
  json: string;
  updated_at: number;
}

interface PlanRow {
  id: string;
  name: string;
  saved_at: number;
  json: string;
  updated_at: number;
}

interface BlobRow {
  key: string;
  mime: string;
  bytes: Buffer;
  updated_at: number;
}

const stmtGetState = db.prepare<[string], StateRow>(
  'SELECT id, json, updated_at FROM state WHERE id = ?',
);
const stmtPutState = db.prepare<[string, string, number]>(
  'INSERT INTO state (id, json, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at',
);

const stmtListPlans = db.prepare<[], PlanRow>(
  'SELECT id, name, saved_at, json, updated_at FROM plans ORDER BY saved_at DESC',
);
const stmtGetPlan = db.prepare<[string], PlanRow>(
  'SELECT id, name, saved_at, json, updated_at FROM plans WHERE id = ?',
);
const stmtPutPlan = db.prepare<[string, string, number, string, number]>(
  'INSERT INTO plans (id, name, saved_at, json, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, saved_at = excluded.saved_at, json = excluded.json, updated_at = excluded.updated_at',
);
const stmtDeletePlan = db.prepare<[string]>('DELETE FROM plans WHERE id = ?');
const stmtClearPlans = db.prepare('DELETE FROM plans');

const stmtGetBlob = db.prepare<[string], BlobRow>(
  'SELECT key, mime, bytes, updated_at FROM blobs WHERE key = ?',
);
const stmtPutBlob = db.prepare<[string, string, Buffer, number]>(
  'INSERT INTO blobs (key, mime, bytes, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET mime = excluded.mime, bytes = excluded.bytes, updated_at = excluded.updated_at',
);
const stmtDeleteBlob = db.prepare<[string]>('DELETE FROM blobs WHERE key = ?');

const KEY_CURRENT = 'current';

export function getState(): unknown | null {
  const row = stmtGetState.get(KEY_CURRENT);
  if (!row) return null;
  try {
    return JSON.parse(row.json);
  } catch {
    return null;
  }
}

export function putState(json: unknown): void {
  stmtPutState.run(KEY_CURRENT, JSON.stringify(json), Date.now());
}

export interface PlanRecord {
  id: string;
  name: string;
  savedAt: number;
  data: unknown;
}

export function listPlans(): PlanRecord[] {
  const rows = stmtListPlans.all();
  return rows.map((r) => {
    let data: unknown = null;
    try {
      data = JSON.parse(r.json);
    } catch {
      data = null;
    }
    return { id: r.id, name: r.name, savedAt: r.saved_at, data };
  });
}

export function getPlan(id: string): PlanRecord | null {
  const r = stmtGetPlan.get(id);
  if (!r) return null;
  let data: unknown = null;
  try {
    data = JSON.parse(r.json);
  } catch {
    data = null;
  }
  return { id: r.id, name: r.name, savedAt: r.saved_at, data };
}

export function putPlan(plan: PlanRecord): void {
  stmtPutPlan.run(plan.id, plan.name, plan.savedAt, JSON.stringify(plan.data), Date.now());
}

export function replaceAllPlans(plans: PlanRecord[]): void {
  const txn = db.transaction((batch: PlanRecord[]) => {
    stmtClearPlans.run();
    const now = Date.now();
    for (const p of batch) {
      stmtPutPlan.run(p.id, p.name, p.savedAt, JSON.stringify(p.data), now);
    }
  });
  txn(plans);
}

export function deletePlan(id: string): void {
  stmtDeletePlan.run(id);
}

export function getBlob(key: string): { mime: string; bytes: Buffer } | null {
  const row = stmtGetBlob.get(key);
  if (!row) return null;
  return { mime: row.mime, bytes: row.bytes };
}

export function putBlob(key: string, mime: string, bytes: Buffer): void {
  stmtPutBlob.run(key, mime, bytes, Date.now());
}

export function deleteBlob(key: string): void {
  stmtDeleteBlob.run(key);
}

console.log(`[server/db] using SQLite at ${DB_PATH}`);
