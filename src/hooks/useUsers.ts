import { useMemo } from 'react';
import { useTable } from './useTable';
import type { AppUser } from '@/types';

/** Loads the staff directory and exposes lookup maps + role groupings. */
export function useUsers() {
  const { rows, loading, refetch } = useTable<AppUser>('users', {
    orderBy: 'name',
    ascending: true,
  });

  const byId = useMemo(() => {
    const map = new Map<string, AppUser>();
    for (const u of rows) map.set(u.id, u);
    return map;
  }, [rows]);

  const employees = useMemo(() => rows.filter((u) => u.role === 'employee'), [rows]);
  const activeEmployees = useMemo(() => employees.filter((u) => u.active), [employees]);
  const partners = useMemo(() => rows.filter((u) => u.role === 'partner'), [rows]);

  const nameOf = (id: string | null | undefined) => (id ? byId.get(id)?.name ?? '—' : '—');

  return { users: rows, employees, activeEmployees, partners, byId, nameOf, loading, refetch };
}
