import { useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Modal } from '@/components/ui/Modal';
import { Field, Select } from '@/components/ui/Form';
import { Spinner } from '@/components/ui/Misc';
import { DocumentsApi } from '@/lib/api';
import { isoDay } from '@/lib/utils';
import { DOCUMENT_STATUSES, type DocumentRequest, type DocumentStatus } from '@/types';

export function DocumentFormModal({
  document,
  fixedClientId,
  onClose,
}: {
  document: DocumentRequest | null;
  fixedClientId?: string;
  onClose: () => void;
}) {
  const { clients, engagements } = useData();
  const editing = Boolean(document);

  const [clientId, setClientId] = useState(document?.client_id ?? fixedClientId ?? '');
  const [auditId, setAuditId] = useState(document?.audit_id ?? '');
  const [name, setName] = useState(document?.document_name ?? '');
  const [requestedDate, setRequestedDate] = useState(document?.requested_date ?? isoDay(0));
  const [deadline, setDeadline] = useState(document?.deadline ?? '');
  const [status, setStatus] = useState<DocumentStatus>(document?.status ?? 'Requested');
  const [remarks, setRemarks] = useState(document?.remarks ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientEngagements = useMemo(
    () => engagements.rows.filter((e) => e.client_id === clientId),
    [engagements.rows, clientId],
  );

  async function save() {
    if (!clientId || !name.trim()) {
      setError('Client and document name are required.');
      return;
    }
    setBusy(true);
    setError(null);
    const payload: Partial<DocumentRequest> = {
      client_id: clientId,
      audit_id: auditId || null,
      document_name: name.trim(),
      requested_date: requestedDate || null,
      deadline: deadline || null,
      status,
      remarks,
    };
    try {
      if (editing && document) await DocumentsApi.update(document.id, payload);
      else await DocumentsApi.create(payload);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={editing ? 'Edit Document Request' : 'New Document Request'}
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
        <Field label="Linked Engagement (optional)">
          <select className="input" value={auditId} onChange={(e) => setAuditId(e.target.value)}>
            <option value="">None</option>
            {clientEngagements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.audit_type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Document Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Requested Date">
            <input type="date" className="input" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
          </Field>
          <Field label="Deadline">
            <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>
        <Field label="Status">
          <Select value={status} onChange={(v) => setStatus(v as DocumentStatus)} options={DOCUMENT_STATUSES} />
        </Field>
        <Field label="Remarks">
          <input className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
