import { format, isPast, isToday, parseISO, differenceInCalendarDays } from 'date-fns';
import type {
  Compliance,
  ComplianceStatus,
  AuditStage,
  DocumentStatus,
  ChecklistStatus,
  AssignmentStatus,
  DueState,
} from '@/types';

/** Tiny classnames joiner (avoids an extra dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function formatDate(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  try {
    return format(parseISO(value), 'd MMM yyyy');
  } catch {
    return fallback;
  }
}

export function formatDateTime(value: string): string {
  try {
    return format(parseISO(value), 'd MMM yyyy, HH:mm');
  } catch {
    return value;
  }
}

/** Days until a date (negative = overdue). Null when no date. */
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  return differenceInCalendarDays(parseISO(date), new Date());
}

export function isOverdue(date: string | null | undefined): boolean {
  if (!date) return false;
  const d = parseISO(date);
  return isPast(d) && !isToday(d);
}

/**
 * Calendar/heat colour for a compliance item:
 *   completed -> green, overdue -> red, upcoming/due -> yellow, no date -> none.
 */
export function dueState(item: Pick<Compliance, 'status' | 'due_date'>): DueState {
  if (item.status === 'Completed') return 'completed';
  if (!item.due_date) return 'none';
  return isOverdue(item.due_date) ? 'overdue' : 'upcoming';
}

export const DUE_STATE_STYLES: Record<DueState, string> = {
  completed: 'bg-green-100 text-green-800 border-green-300',
  upcoming: 'bg-gold-100 text-gold-700 border-gold-300',
  overdue: 'bg-red-100 text-red-700 border-red-300',
  none: 'bg-navy-100 text-navy-600 border-navy-200',
};

export const DUE_STATE_DOT: Record<DueState, string> = {
  completed: 'bg-green-500',
  upcoming: 'bg-gold-500',
  overdue: 'bg-red-500',
  none: 'bg-navy-300',
};

// --- Status colour maps ------------------------------------------------------

export const COMPLIANCE_STATUS_STYLES: Record<ComplianceStatus, string> = {
  Pending: 'bg-navy-100 text-navy-700',
  'In Progress': 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
};

export const STAGE_STYLES: Record<AuditStage, string> = {
  'Not Started': 'bg-navy-100 text-navy-700',
  Planning: 'bg-blue-100 text-blue-800',
  'Documents Requested': 'bg-indigo-100 text-indigo-800',
  'Documents Received': 'bg-cyan-100 text-cyan-800',
  'Field Work': 'bg-purple-100 text-purple-800',
  Review: 'bg-gold-100 text-gold-700',
  'Partner Approval': 'bg-orange-100 text-orange-800',
  'Report Issued': 'bg-green-100 text-green-800',
  Closed: 'bg-navy-200 text-navy-800',
};

export const DOC_STATUS_STYLES: Record<DocumentStatus, string> = {
  Requested: 'bg-blue-100 text-blue-800',
  Received: 'bg-green-100 text-green-800',
  Pending: 'bg-gold-100 text-gold-700',
  'Not Applicable': 'bg-navy-100 text-navy-600',
};

export const CHECKLIST_STATUS_STYLES: Record<ChecklistStatus, string> = {
  Pending: 'bg-navy-100 text-navy-700',
  Completed: 'bg-blue-100 text-blue-800',
  Reviewed: 'bg-green-100 text-green-800',
};

export const ASSIGNMENT_STATUS_STYLES: Record<AssignmentStatus, string> = {
  Pending: 'bg-gold-100 text-gold-700',
  Completed: 'bg-green-100 text-green-800',
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** YYYY-MM-DD for a date offset from today (used in forms & seeds). */
export function isoDay(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
