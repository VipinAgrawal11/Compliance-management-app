import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { initSync, flushOutbox } from '@/lib/offline/sync';
import { outboxCount } from '@/lib/offline/db';

interface OfflineState {
  online: boolean;
  pending: number; // queued writes awaiting sync
  refreshPending: () => void;
}

const OfflineContext = createContext<OfflineState | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pending, setPending] = useState(0);

  const refreshPending = useMemo(
    () => () => {
      void outboxCount().then(setPending);
    },
    [],
  );

  useEffect(() => {
    initSync();
    refreshPending();

    const goOnline = () => {
      setOnline(true);
      void flushOutbox().then(refreshPending);
    };
    const goOffline = () => setOnline(false);
    const onSynced = () => refreshPending();
    const onQueued = () => refreshPending();

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('outbox:synced', onSynced);
    window.addEventListener('outbox:queued', onQueued);

    const poll = setInterval(refreshPending, 4000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('outbox:synced', onSynced);
      window.removeEventListener('outbox:queued', onQueued);
      clearInterval(poll);
    };
  }, [refreshPending]);

  return (
    <OfflineContext.Provider value={{ online, pending, refreshPending }}>
      {children}
    </OfflineContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOffline(): OfflineState {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used within an OfflineProvider');
  return ctx;
}
