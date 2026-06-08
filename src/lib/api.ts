/**
 * Central write API. Reads happen through realtime hooks (see useTable); this
 * module owns every mutation so offline behaviour and RLS expectations live in
 * one place.
 *
 *  - Work-status writes (compliance/engagement/document/checklist status, notes)
 *    go through `mutate()` so they queue offline and sync on reconnect.
 *  - Structural / partner-only writes go straight to Supabase (require online).
 */
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { mutate } from '@/lib/offline/sync';
import { isoDay } from '@/lib/utils';
import type {
  Client,
  Compliance,
  ComplianceStatus,
  AuditEngagement,
  AuditStage,
  DocumentRequest,
  DocumentStatus,
  ChecklistStatus,
  AppSettings,
  AssignmentRef,
} from '@/types';

async function direct(p: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await p;
  if (error) throw new Error(error.message);
}

/** Insert a row and return its new id. */
async function insertReturning(table: string, payload: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.from(table).insert(payload).select('id').single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

// =============================== CLIENTS ====================================

export const ClientsApi = {
  create: (input: Partial<Client>, createdBy: string) =>
    direct(supabase.from('clients').insert({ ...input, created_by: createdBy })),
  update: (id: string, patch: Partial<Client>) =>
    direct(supabase.from('clients').update(patch).eq('id', id)),
  remove: (id: string) => direct(supabase.from('clients').delete().eq('id', id)),
};

// ============================= COMPLIANCES ==================================

export const CompliancesApi = {
  create: (input: Partial<Compliance>, createdBy: string) =>
    insertReturning('compliances', { ...input, created_by: createdBy }),
  update: (id: string, patch: Partial<Compliance>) =>
    direct(supabase.from('compliances').update(patch).eq('id', id)),
  remove: (id: string) => direct(supabase.from('compliances').delete().eq('id', id)),
  /** Offline-capable status update (employee or partner). */
  setStatus: (id: string, status: ComplianceStatus, remarks?: string) =>
    mutate('compliances', 'update', remarks === undefined ? { status } : { status, remarks }, id),
};

// ============================ ENGAGEMENTS ===================================

export const EngagementsApi = {
  create: (input: Partial<AuditEngagement>, createdBy: string) =>
    insertReturning('audit_engagements', { ...input, created_by: createdBy }),
  update: (id: string, patch: Partial<AuditEngagement>) =>
    direct(supabase.from('audit_engagements').update(patch).eq('id', id)),
  remove: (id: string) => direct(supabase.from('audit_engagements').delete().eq('id', id)),
  /** Offline-capable stage update. */
  setStage: (id: string, stage: AuditStage, delayReason?: string) =>
    mutate(
      'audit_engagements',
      'update',
      delayReason === undefined ? { stage } : { stage, delay_reason: delayReason },
      id,
    ),
};

// ============================ ASSIGNMENTS ===================================

export const AssignmentsApi = {
  /** Replace the set of employees assigned to a work item (partner action). */
  async setEmployees(refType: AssignmentRef, refId: string, employeeIds: string[]) {
    await direct(
      supabase
        .from('assignments')
        .delete()
        .eq('reference_type', refType)
        .eq('reference_id', refId)
        .not('employee_id', 'in', `(${employeeIds.length ? employeeIds.join(',') : 'null'})`),
    );
    if (employeeIds.length) {
      await direct(
        supabase.from('assignments').upsert(
          employeeIds.map((employee_id) => ({
            reference_type: refType,
            reference_id: refId,
            employee_id,
          })),
          { onConflict: 'reference_type,reference_id,employee_id', ignoreDuplicates: true },
        ),
      );
    }
  },
  /** Employee marks their own portion done — offline-capable. */
  setStatus: (id: string, status: 'Pending' | 'Completed') =>
    mutate(
      'assignments',
      'update',
      { status, completed_date: status === 'Completed' ? isoDay(0) : null },
      id,
    ),
};

// ============================== DOCUMENTS ===================================

export const DocumentsApi = {
  create: (input: Partial<DocumentRequest>) => direct(supabase.from('documents').insert(input)),
  update: (id: string, patch: Partial<DocumentRequest>) =>
    direct(supabase.from('documents').update(patch).eq('id', id)),
  remove: (id: string) => direct(supabase.from('documents').delete().eq('id', id)),
  /** Offline-capable status update. */
  setStatus: (id: string, status: DocumentStatus, remarks?: string) =>
    mutate('documents', 'update', remarks === undefined ? { status } : { status, remarks }, id),
};

// ============================== CHECKLISTS ==================================

export const ChecklistApi = {
  createTemplate: (name: string, auditType: string) =>
    direct(supabase.from('checklist_templates').insert({ name, audit_type: auditType })),
  removeTemplate: (id: string) =>
    direct(supabase.from('checklist_templates').delete().eq('id', id)),
  addItem: (templateId: string, itemName: string, sortOrder: number) =>
    direct(
      supabase
        .from('checklist_items')
        .insert({ template_id: templateId, item_name: itemName, sort_order: sortOrder }),
    ),
  removeItem: (id: string) => direct(supabase.from('checklist_items').delete().eq('id', id)),

  /** Instantiate a template's items as progress rows for an engagement. */
  async applyTemplate(
    engagementId: string,
    items: { item_name: string }[],
    assignee: string | null,
  ) {
    if (!items.length) return;
    await direct(
      supabase.from('audit_checklist_progress').insert(
        items.map((it) => ({
          engagement_id: engagementId,
          item_name: it.item_name,
          assigned_employee: assignee,
        })),
      ),
    );
  },
  /** Offline-capable status update on a checklist item. */
  setStatus: (id: string, status: ChecklistStatus, reviewComment?: string) =>
    mutate(
      'audit_checklist_progress',
      'update',
      reviewComment === undefined ? { status } : { status, review_comment: reviewComment },
      id,
    ),
  setAssignee: (id: string, assigned_employee: string | null) =>
    direct(supabase.from('audit_checklist_progress').update({ assigned_employee }).eq('id', id)),
  removeProgress: (id: string) =>
    direct(supabase.from('audit_checklist_progress').delete().eq('id', id)),
};

// =========================== COMMUNICATIONS =================================

export const CommunicationsApi = {
  /** Add a communication note — offline-capable insert. */
  add: (
    input: {
      client_id: string;
      date: string;
      type: string;
      discussion_notes: string;
      decision_taken: string;
      next_action: string;
      responsible_person: string | null;
    },
    createdBy: string,
  ) => mutate('communication_logs', 'insert', { ...input, created_by: createdBy }),
  remove: (id: string) => direct(supabase.from('communication_logs').delete().eq('id', id)),
};

// =============================== USERS ======================================

/** Isolated client for partner-driven sign-ups (does not touch the partner session). */
function signupClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export const UsersApi = {
  /**
   * Create an employee login. Uses an isolated client so the partner stays
   * signed in. If e-mail confirmation is enabled in Supabase, the new user must
   * confirm before first login (disable it under Auth settings for instant use).
   */
  async addEmployee(input: { name: string; email: string; designation: string; password: string }) {
    const client = signupClient();
    const { error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { name: input.name, role: 'employee', designation: input.designation } },
    });
    if (error) throw new Error(error.message);
  },
  update: (id: string, patch: { name?: string; designation?: string; active?: boolean }) =>
    direct(supabase.from('users').update(patch).eq('id', id)),
  /** Soft-remove: deactivate (auth row removal requires the service role / dashboard). */
  deactivate: (id: string) => direct(supabase.from('users').update({ active: false }).eq('id', id)),
  reactivate: (id: string) => direct(supabase.from('users').update({ active: true }).eq('id', id)),
};

// ============================== SETTINGS ====================================

export const SettingsApi = {
  update: (patch: Partial<AppSettings>) =>
    direct(supabase.from('app_settings').update(patch).eq('id', 1)),
};

// ============================ NOTIFICATIONS =================================

export const NotificationsApi = {
  markRead: (id: string) =>
    direct(supabase.from('notifications').update({ read_status: true }).eq('id', id)),
  markAllRead: (userId: string) =>
    direct(
      supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('user_id', userId)
        .eq('read_status', false),
    ),
  remove: (id: string) => direct(supabase.from('notifications').delete().eq('id', id)),
  /** Ask the DB to generate due/overdue reminder rows (partner triggers on login). */
  generateReminders: () => supabase.rpc('generate_due_reminders'),
};
