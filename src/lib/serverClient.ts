/**
 * Thin REST client for the local Room Builder server (Hono + SQLite).
 * All endpoints relative to `/api`, which Vite proxies to localhost:3001
 * in dev. In production (or when the client is served *by* the server),
 * the same-origin `/api` path also works.
 */

const BASE = '/api';

export interface ServerHealth {
  status: 'ok';
  schemaVersion: number;
  uptime: number;
}

export interface ServerPlan {
  id: string;
  name: string;
  savedAt: number;
  data: unknown;
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const r = await fetch(input, init);
  if (!r.ok) {
    let detail = '';
    try {
      detail = await r.text();
    } catch {
      /* ignore */
    }
    throw new ServerError(r.status, `${r.status} ${r.statusText} ${detail}`);
  }
  return (await r.json()) as T;
}

export class ServerError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ServerError';
  }
}

export const serverClient = {
  async health(signal?: AbortSignal): Promise<ServerHealth> {
    return fetchJson<ServerHealth>(`${BASE}/health`, { signal });
  },

  async getState<T = unknown>(): Promise<T | null> {
    const r = await fetchJson<{ data: T | null }>(`${BASE}/state`);
    return r.data ?? null;
  },

  async putState(data: unknown): Promise<void> {
    await fetchJson(`${BASE}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async listPlans(): Promise<ServerPlan[]> {
    const r = await fetchJson<{ plans: ServerPlan[] }>(`${BASE}/plans`);
    return r.plans;
  },

  async putPlan(plan: ServerPlan): Promise<void> {
    await fetchJson(`${BASE}/plans/${encodeURIComponent(plan.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: plan.name,
        savedAt: plan.savedAt,
        data: plan.data,
      }),
    });
  },

  async replaceAllPlans(plans: ServerPlan[]): Promise<void> {
    await fetchJson(`${BASE}/plans`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plans }),
    });
  },

  async deletePlan(id: string): Promise<void> {
    await fetchJson(`${BASE}/plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  blobUrl(key: string): string {
    return `${BASE}/blobs/${encodeURIComponent(key)}`;
  },

  async getBlob(key: string): Promise<Blob | null> {
    try {
      const r = await fetch(this.blobUrl(key));
      if (r.status === 404) return null;
      if (!r.ok) throw new ServerError(r.status, `${r.status} ${r.statusText}`);
      return await r.blob();
    } catch (e) {
      if (e instanceof ServerError) throw e;
      throw new ServerError(0, String(e));
    }
  },

  async putBlob(key: string, blob: Blob): Promise<void> {
    const r = await fetch(this.blobUrl(key), {
      method: 'PUT',
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
      body: blob,
    });
    if (!r.ok) {
      throw new ServerError(r.status, `${r.status} ${r.statusText}`);
    }
  },

  async deleteBlob(key: string): Promise<void> {
    await fetch(this.blobUrl(key), { method: 'DELETE' }).catch(() => null);
  },
};
