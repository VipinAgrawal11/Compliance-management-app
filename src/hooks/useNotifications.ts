import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showNotification } from '@/lib/notifications';
import type { AppNotification } from '@/types';

/** Loads the current user's notifications live and surfaces new ones via the OS. */
export function useNotifications(userId: string | undefined) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const primed = useRef(false);

  const fetchItems = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error) setItems((data ?? []) as AppNotification[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void fetchItems();
    const channel = supabase
      .channel('notifications-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          void fetchItems();
          if (payload.eventType === 'INSERT' && primed.current) {
            const n = payload.new as AppNotification;
            void showNotification('Compliance Manager', n.message, n.link ?? '/');
          }
        },
      )
      .subscribe();
    const t = setTimeout(() => (primed.current = true), 1500);
    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [userId, fetchItems]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read_status).length, [items]);

  return { items, unreadCount, loading, refetch: fetchItems };
}
