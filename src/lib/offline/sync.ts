/**
 * Offline write helpers + sync engine.
 *
 * Mutations go through `mutate()`:
 *   - online  -> sent to Supabase immediately.
 *   - offline -> stored in the IndexedDB outbox and replayed by `flushOutbox()`
 *                when the browser fires `online` (or via Background Sync).
 */
import { supabase } from '@/lib/supabase';
import { enqueue, getOutbox, removeOutbox, type OutboxOp } from './db';

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

async function send(table: string, op: OutboxOp, payload: Record<string, unknown>, rowId?: string) {
  if (op === 'insert') {
    const { error } = await supabase.from(table).insert(payload);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from(table).update(payload).eq('id', rowId as string);
    if (error) throw new Error(error.message);
  }
}

/**
 * Perform a write. Returns `{ queued: true }` when stored offline instead of sent.
 */
export async function mutate(
  table: string,
  op: OutboxOp,
  payload: Record<string, unknown>,
  rowId?: string,
): Promise<{ queued: boolean }> {
  if (isOnline()) {
    try {
      await send(table, op, payload, rowId);
      // Opportunistically drain anything left from a previous offline spell.
      void flushOutbox();
      return { queued: false };
    } catch (err) {
      // Network blip mid-request: fall back to the outbox.
      if (!isOnline()) {
        await enqueue({ table, op, payload, rowId });
        window.dispatchEvent(new CustomEvent('outbox:queued'));
        await requestBackgroundSync();
        return { queued: true };
      }
      throw err;
    }
  }

  await enqueue({ table, op, payload, rowId });
  window.dispatchEvent(new CustomEvent('outbox:queued'));
  await requestBackgroundSync();
  return { queued: true };
}

let flushing = false;

/** Replay every queued write in order. Safe to call repeatedly. */
export async function flushOutbox(): Promise<{ synced: number; failed: number }> {
  if (flushing || !isOnline()) return { synced: 0, failed: 0 };
  flushing = true;
  let synced = 0;
  let failed = 0;
  try {
    const items = await getOutbox();
    for (const item of items) {
      try {
        await send(item.table, item.op, item.payload, item.rowId);
        await removeOutbox(item.id);
        synced += 1;
      } catch {
        // Leave it in the queue and stop — likely offline again or a transient error.
        failed += 1;
        break;
      }
    }
  } finally {
    flushing = false;
  }
  if (synced > 0) window.dispatchEvent(new CustomEvent('outbox:synced', { detail: { synced } }));
  return { synced, failed };
}

/** Ask the service worker to retry the queue in the background, if supported. */
async function requestBackgroundSync(): Promise<void> {
  try {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      };
      await reg.sync?.register('outbox-sync');
    }
  } catch {
    /* background sync unsupported (e.g. iOS Safari) — `online` listener covers it */
  }
}

/** Wire up automatic flushing. Call once at app start. */
export function initSync(): void {
  window.addEventListener('online', () => void flushOutbox());
  // Also try when the tab regains focus / becomes visible.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flushOutbox();
  });
  // The service worker pings us on a Background Sync event.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'flush-outbox') void flushOutbox();
    });
  }
  // Initial drain in case the app opened with a pending queue.
  void flushOutbox();
}
