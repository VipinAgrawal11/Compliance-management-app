/**
 * Pure derivations over the loaded domain arrays — used by dashboards, the staff
 * allocation module and reports. Keeping them here keeps components declarative.
 */
import { parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { isOverdue } from '@/lib/utils';
import type { Compliance, AuditEngagement, Assignment, AppUser } from '@/types';

export function inMonth(date: string | null, year: number, month: number): boolean {
  if (!date) return false;
  const d = parseISO(date);
  return d.getFullYear() === year && d.getMonth() === month;
}

export function dueThisMonth(compliances: Compliance[], ref = new Date()): Compliance[] {
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);
  return compliances.filter(
    (c) => c.due_date && isWithinInterval(parseISO(c.due_date), { start, end }),
  );
}

export function overdueCompliances(compliances: Compliance[]): Compliance[] {
  return compliances.filter((c) => c.status !== 'Completed' && isOverdue(c.due_date));
}

/** Upcoming deadlines across compliances + engagements within `days`. */
export interface Deadline {
  id: string;
  kind: 'Compliance' | 'Engagement';
  title: string;
  client_id: string;
  due_date: string;
  done: boolean;
}

export function upcomingDeadlines(
  compliances: Compliance[],
  engagements: AuditEngagement[],
  days = 30,
): Deadline[] {
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + days);
  const out: Deadline[] = [];

  for (const c of compliances) {
    if (!c.due_date) continue;
    const d = parseISO(c.due_date);
    if (d >= now && d <= horizon && c.status !== 'Completed') {
      out.push({
        id: c.id,
        kind: 'Compliance',
        title: c.subcategory,
        client_id: c.client_id,
        due_date: c.due_date,
        done: false,
      });
    }
  }
  for (const e of engagements) {
    if (!e.deadline) continue;
    const d = parseISO(e.deadline);
    const done = e.stage === 'Report Issued' || e.stage === 'Closed';
    if (d >= now && d <= horizon && !done) {
      out.push({
        id: e.id,
        kind: 'Engagement',
        title: e.audit_type,
        client_id: e.client_id,
        due_date: e.deadline,
        done,
      });
    }
  }
  return out.sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export interface EmployeeStats {
  user: AppUser;
  assigned: number;
  completed: number;
  pending: number;
  overdue: number;
  completedOnTime: number;
  completedLate: number;
}

/** Staff allocation / performance metrics built from the assignments table. */
export function employeePerformance(
  employees: AppUser[],
  assignments: Assignment[],
  compliances: Compliance[],
  engagements: AuditEngagement[],
): EmployeeStats[] {
  const dueOf = new Map<string, string | null>();
  for (const c of compliances) dueOf.set(`compliance:${c.id}`, c.due_date);
  for (const e of engagements) dueOf.set(`engagement:${e.id}`, e.deadline);

  return employees.map((user) => {
    const mine = assignments.filter((a) => a.employee_id === user.id);
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    let completedOnTime = 0;
    let completedLate = 0;

    for (const a of mine) {
      const due = dueOf.get(`${a.reference_type}:${a.reference_id}`) ?? null;
      if (a.status === 'Completed') {
        completed += 1;
        if (due && a.completed_date) {
          if (a.completed_date <= due) completedOnTime += 1;
          else completedLate += 1;
        } else {
          completedOnTime += 1;
        }
      } else {
        pending += 1;
        if (isOverdue(due)) overdue += 1;
      }
    }

    return {
      user,
      assigned: mine.length,
      completed,
      pending,
      overdue,
      completedOnTime,
      completedLate,
    };
  });
}
