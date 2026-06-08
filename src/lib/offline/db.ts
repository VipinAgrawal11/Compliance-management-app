/**
 * Minimal IndexedDB layer (no dependencies) for offline support.
 *
 *  - `cache`  : last-known rows per table, so the app renders while offline.
 *  - `outbox` : queued writes (status updates / notes) made while offline,
 *               replayed to Supabase when connectivity returns.
 */

const DB_NAME = 'compliance-offline';
const DB_VERSION = 1;
const CACHE_STORE = 'cache';
const OUTBOX_STORE = 'outbox';

export type OutboxOp = 'update' | 'insert';

export interface OutboxItem {
  id: string; // client-generated uuid for the queue entry
  table: string; // supabase table name
  op: OutboxOp;
  rowId?: string; // target row id for updates
  payload: Record<string, unknown>;
  created_at: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE); // key = table name -> rows[]
      }
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// --- Row cache ---------------------------------------------------------------

export async function cacheRows<T>(table: string, rows: T[]): Promise<void> {
  try {
    await tx(CACHE_STORE, 'readwrite', (s) => s.put(rows, table));
  } catch {
    /* private mode / quota — caching is best-effort */
  }
}

export async function getCachedRows<T>(table: string): Promise<T[]> {
  try {
    const rows = await tx<T[]>(CACHE_STORE, 'readonly', (s) => s.get(table));
    return rows ?? [];
  } catch {
    return [];
  }
}

// --- Outbox ------------------------------------------------------------------

export async function enqueue(item: Omit<OutboxItem, 'id' | 'created_at'>): Promise<OutboxItem> {
  const full: OutboxItem = {
    ...item,
    id: crypto.randomUUID(),
    created_at: Date.now(),
  };
  await tx(OUTBOX_STORE, 'readwrite', (s) => s.put(full));
  return full;
}

export async function getOutbox(): Promise<OutboxItem[]> {
  const items = await tx<OutboxItem[]>(OUTBOX_STORE, 'readonly', (s) => s.getAll());
  return (items ?? []).sort((a, b) => a.created_at - b.created_at);
}

export async function removeOutbox(id: string): Promise<void> {
  await tx(OUTBOX_STORE, 'readwrite', (s) => s.delete(id));
}

export async function outboxCount(): Promise<number> {
  const c = await tx<number>(OUTBOX_STORE, 'readonly', (s) => s.count());
  return c ?? 0;
}
