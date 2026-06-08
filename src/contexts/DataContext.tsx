import { createContext, useContext, type ReactNode } from 'react';
import { useTable, type TableApi } from '@/hooks/useTable';
import { useUsers } from '@/hooks/useUsers';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Client,
  Compliance,
  AuditEngagement,
  Assignment,
  ChecklistTemplate,
  ChecklistItem,
  AppSettings,
} from '@/types';

type UsersApi = ReturnType<typeof useUsers>;
type NotificationsApi = ReturnType<typeof useNotifications>;

interface DataState {
  users: UsersApi;
  notifications: NotificationsApi;
  clients: TableApi<Client>;
  compliances: TableApi<Compliance>;
  engagements: TableApi<AuditEngagement>;
  assignments: TableApi<Assignment>;
  templates: TableApi<ChecklistTemplate>;
  items: TableApi<ChecklistItem>;
  settings: TableApi<AppSettings>;
}

const DataContext = createContext<DataState | undefined>(undefined);

/**
 * Mounted once inside the authenticated area so each table keeps a single
 * realtime subscription shared by every page. RLS filters rows per role.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const users = useUsers();
  const notifications = useNotifications(session?.user.id);
  const clients = useTable<Client>('clients', { orderBy: 'client_name', ascending: true });
  const compliances = useTable<Compliance>('compliances', { orderBy: 'due_date', ascending: true });
  const engagements = useTable<AuditEngagement>('audit_engagements', {
    orderBy: 'deadline',
    ascending: true,
  });
  const assignments = useTable<Assignment>('assignments');
  const templates = useTable<ChecklistTemplate>('checklist_templates', {
    orderBy: 'name',
    ascending: true,
  });
  const items = useTable<ChecklistItem>('checklist_items', {
    orderBy: 'sort_order',
    ascending: true,
  });
  // app_settings has no created_at column, so order by its primary key instead.
  const settings = useTable<AppSettings>('app_settings', { orderBy: 'id', ascending: true });

  return (
    <DataContext.Provider
      value={{
        users,
        notifications,
        clients,
        compliances,
        engagements,
        assignments,
        templates,
        items,
        settings,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useFirmSettings = () => useData().settings.rows[0] as AppSettings | undefined;
