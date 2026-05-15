import { useSyncExternalStore } from 'react';
import { ServerError, type ServerPlan } from './serverClient';
import { remote } from './remote';

/** Public sync state surface for UI badges. */
export type SyncStatus =
  | 'connecting'
  | 'online'
  | 'offline'
  | 'syncing'
  | 'error';

interface InternalState {
  status: SyncStatus;
  lastSync: number | null;
  lastError: string | null;
  /** True after we have probed the server at least once this session. */
  probed: boolean;
}

const state: InternalState = {
  status: 'connecting',
  lastSync: null,
  lastError: null,
  probed: false,
};

const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function snapshot(): InternalState {
  return state;
}

function setStatus(next: Partial<InternalState>): void {
  Object.assign(state, next);
  emit();
}

const HEARTBEAT_MS = 8000;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

async function probe(): Promise<boolean> {
  try {
    await remote.health();
    state.probed = true;
    if (state.status !== 'syncing') setStatus({ status: 'online', lastError: null });
    else state.lastError = null;
    return true;
  } catch (e) {
    state.probed = true;
    setStatus({
      status: 'offline',
      lastError: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

export function startSyncHeartbeat(): void {
  if (heartbeatTimer) return;
  void probe();
  heartbeatTimer = setInterval(() => {
    if (state.status !== 'syncing') void probe();
  }, HEARTBEAT_MS);
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void probe());
    window.addEventListener('offline', () =>
      setStatus({ status: 'offline', lastError: 'browser offline' }),
    );
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void probe();
    });
  }
}

export function stopSyncHeartbeat(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

/** Run a server write; auto-flips status on transient failures. */
export async function withSync<T>(
  op: () => Promise<T>,
): Promise<T | undefined> {
  if (state.status === 'offline') {
    // Fast path: don't even try, but probe again so we recover quickly.
    void probe();
    return undefined;
  }
  setStatus({ status: 'syncing' });
  try {
    const result = await op();
    setStatus({ status: 'online', lastSync: Date.now(), lastError: null });
    return result;
  } catch (e) {
    if (e instanceof ServerError && e.status >= 400 && e.status < 500) {
      // 4xx is a real error from the server (not a network drop).
      setStatus({ status: 'error', lastError: e.message });
    } else {
      setStatus({
        status: 'offline',
        lastError: e instanceof Error ? e.message : String(e),
      });
    }
    return undefined;
  }
}

export function getSyncState(): InternalState {
  return state;
}

export function isOnline(): boolean {
  return state.status === 'online' || state.status === 'syncing';
}

export function useSyncStatus(): InternalState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Pull current state from the server. Returns null if server has nothing
 * stored or is unreachable.
 */
export async function pullState<T>(): Promise<T | null> {
  try {
    setStatus({ status: 'syncing' });
    const r = await remote.getState<T>();
    setStatus({ status: 'online', lastSync: Date.now(), lastError: null });
    return r;
  } catch (e) {
    setStatus({
      status: 'offline',
      lastError: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

/** Pull all saved plans. Returns null if server unreachable. */
export async function pullPlans(): Promise<ServerPlan[] | null> {
  try {
    setStatus({ status: 'syncing' });
    const list = await remote.listPlans();
    setStatus({ status: 'online', lastSync: Date.now(), lastError: null });
    return list;
  } catch (e) {
    setStatus({
      status: 'offline',
      lastError: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

export async function manualResync(): Promise<void> {
  await probe();
}
