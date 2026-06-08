import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cacheRows, getCachedRows } from '@/lib/offline/db';
import { isOnline } from '@/lib/offline/sync';

interface Options {
  orderBy?: string;
  ascending?: boolean;
  /** Cache rows to IndexedDB for offline reads (default true). */
  offline?: boolean;
}

export interface TableApi<T> {
  rows: T[];
  loading: boolean;
  error: string | null;
  /** True when showing IndexedDB-cached data because the network is unavailable. */
  stale: boolean;
  refetch: () => Promise<void>;
}

/**
 * Loads a table the current user is allowed to see (RLS filters server-side),
 * keeps it live via realtime, and caches rows to IndexedDB so the data is still
 * available offline.
 */
export function useTable<T>(table: string, opts: Options = {}): TableApi<T> {
  const { orderBy = 'created_at', ascending = false, offline = true } = opts;
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const mounted = useRef(true);

  const fetchRows = useCallback(async () => {
    if (!isOnline()) {
      const cached = await getCachedRows<T>(table);
      if (mounted.current) {
        setRows(cached);
        setStale(true);
        setLoading(false);
      }
      return;
    }
    const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending });
    if (!mounted.current) return;
    if (error) {
      // Network/permission failure: fall back to cache.
      const cached = await getCachedRows<T>(table);
      setRows(cached);
      setStale(cached.length > 0);
      setError(error.message);
    } else {
      const list = (data ?? []) as T[];
      setRows(list);
      setStale(false);
      setError(null);
      if (offline) void cacheRows(table, list);
    }
    setLoading(false);
  }, [table, orderBy, ascending, offline]);

  useEffect(() => {
    mounted.current = true;
    void fetchRows();

    const channel = supabase
      .channel(`${table}-stream`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        void fetchRows();
      })
      .subscribe();

    const onOnline = () => void fetchRows();
    window.addEventListener('online', onOnline);
    window.addEventListener('outbox:synced', onOnline);

    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('outbox:synced', onOnline);
    };
  }, [fetchRows, table]);

  return { rows, loading, error, stale, refetch: fetchRows };
}
