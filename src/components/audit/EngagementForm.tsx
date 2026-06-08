import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Modal } from '@/components/ui/Modal';
import { Field, Select } from '@/components/ui/Form';
import { Spinner } from '@/components/ui/Misc';
import { EngagementsApi } from '@/lib/api';
import {
  AUDIT_TYPES,
  AUDIT_STAGES,
  type AuditEngagement,
  type AuditType,
  type AuditStage,
} from '@/types';

export function EngagementFormModal({
  engagement,
  fixedClientId,
  onClose,
}: {
  engagement: AuditEngagement | null;
  fixedClientId?: string;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const { clients, users } = useData();
  const editing = Boolean(engagement);

  const [clientId, setClientId] = useState(engagement?.client_id ?? fixedClientId ?? '');
  const [auditType, setAuditType] = useState<AuditType>(engagement?.audit_type ?? 'Statutory Audit');
  const [stage, setStage] = useState<AuditStage>(engagement?.stage ?? 'Not Started');
  const [assignee, setAssignee] = useState(engagement?.assigned_employee ?? '');
  const [startDate, setStartDate] = useState(engagement?.start_date ?? '');
  const [deadline, setDeadline] = useState(engagement?.deadline ?? '');
  const [delayReason, setDelayReason] = useState(engagement?.delay_reason ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!clientId || !profile) {
      setError('Client is required.');
      return;
    }
    setBusy(true);
    setError(null);
    const payload: Partial<AuditEngagement> = {
      client_id: clientId,
      audit_type: auditType,
      stage,
      assigned_employee: assignee || null,
      start_date: startDate || null,
      deadline: deadline || null,
      delay_reason: delayReason,
    };
    try {
      if (editing && engagement) await EngagementsApi.update(engagement.id, payload);
      else await EngagementsApi.create(payload, profile.id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={editing ? 'Edit Engagement' : 'New Audit Engagement'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-gold" onClick={save} disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />} {editing ? 'Save' : 'Create'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {!fixedClientId && (
          <Field label="Client">
            <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="" disabled>
                Select client…
              </option>
              {clients.rows.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.client_name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Audit Type">
            <Select value={auditType} onChange={(v) => setAuditType(v as AuditType)} options={AUDIT_TYPES} />
          </Field>
          <Field label="Stage">
            <Select value={stage} onChange={(v) => setStage(v as AuditStage)} options={AUDIT_STAGES} />
          </Field>
        </div>
        <Field label="Lead Employee">
          <select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Unassigned</option>
            {users.activeEmployees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Start Date">
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Deadline">
            <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>
        <Field label="Delay Reason" hint="Record why the engagement is behind, if applicable.">
          <input className="input" value={delayReason} onChange={(e) => setDelayReason(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
