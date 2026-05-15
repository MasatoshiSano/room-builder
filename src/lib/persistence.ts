import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'room-builder';
const DB_VERSION = 1;
const STORE_STATE = 'state';
const STORE_PLANS = 'plans';
const STORE_BLOBS = 'blobs';

const KEY_CURRENT = 'current-state';

interface DBSchema {
  state: { key: string; value: unknown };
  plans: { key: string; value: unknown };
  blobs: { key: string; value: Blob };
}

let dbPromise: Promise<IDBPDatabase<DBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<DBSchema>> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (!dbPromise) {
    dbPromise = openDB<DBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_STATE)) {
          db.createObjectStore(STORE_STATE);
        }
        if (!db.objectStoreNames.contains(STORE_PLANS)) {
          db.createObjectStore(STORE_PLANS);
        }
        if (!db.objectStoreNames.contains(STORE_BLOBS)) {
          db.createObjectStore(STORE_BLOBS);
        }
      },
    });
  }
  return dbPromise;
}

export async function idbGetState<T>(): Promise<T | null> {
  try {
    const db = await getDB();
    const v = await db.get(STORE_STATE, KEY_CURRENT);
    return (v as T) ?? null;
  } catch {
    return null;
  }
}

export async function idbPutState(value: unknown): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_STATE, value, KEY_CURRENT);
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }
}

export async function idbGetPlans<T>(): Promise<T[] | null> {
  try {
    const db = await getDB();
    const v = await db.get(STORE_PLANS, 'all');
    return (v as T[]) ?? null;
  } catch {
    return null;
  }
}

export async function idbPutPlans(plans: unknown[]): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_PLANS, plans, 'all');
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }
}

export async function idbPutBlob(key: string, blob: Blob): Promise<void> {
  const db = await getDB();
  await db.put(STORE_BLOBS, blob, key);
}

export async function idbGetBlob(key: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    const b = await db.get(STORE_BLOBS, key);
    return (b as Blob) ?? null;
  } catch {
    return null;
  }
}

export async function idbDeleteBlob(key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_BLOBS, key);
  } catch {
    /* ignore */
  }
}

export async function idbListBlobKeys(): Promise<string[]> {
  try {
    const db = await getDB();
    const keys = await db.getAllKeys(STORE_BLOBS);
    return keys.map((k) => String(k));
  } catch {
    return [];
  }
}

/** Convert a data URL to a Blob (for migrating old localStorage data). */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  try {
    const bin = atob(m[2]);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return new Blob([buf], { type: mime });
  } catch {
    return null;
  }
}

/** Object URL cache so the same Blob always serves the same URL. */
const blobUrlCache = new Map<string, string>();

export async function getBlobObjectUrl(key: string): Promise<string | null> {
  const cached = blobUrlCache.get(key);
  if (cached) return cached;
  let blob = await idbGetBlob(key);
  if (!blob) {
    // Cache miss → ask the remote backend (server or S3) and warm IDB.
    try {
      const { remote } = await import('./remote');
      blob = await remote.getBlob(key);
      if (blob) {
        await idbPutBlob(key, blob).catch(() => null);
      }
    } catch {
      /* offline → return null */
    }
  }
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  blobUrlCache.set(key, url);
  return url;
}

export function revokeBlobObjectUrl(key: string): void {
  const url = blobUrlCache.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    blobUrlCache.delete(key);
  }
}
