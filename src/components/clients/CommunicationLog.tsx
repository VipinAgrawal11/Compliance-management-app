import { useMemo, useState } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTable } from '@/hooks/useTable';
import { Modal } from '@/components/ui/Modal';
import { Field, Select, SectionTitle } from '@/components/ui/Form';
import { Spinner } from '@/components/ui/Misc';
import { Pill } from '@/components/ui/Badges';
import { CommunicationsApi } from '@/lib/api';
import { formatDate, isoDay } from '@/lib/utils';
import { COMMUNICATION_TYPES, type CommunicationLog as CommLog, type CommunicationType } from '@/types';

export function CommunicationLog({ clientId }: { clientId: string }) {
  const { profile } = useAuth();
  const { users } = useData();
  const logs = useTable<CommLog>('communication_logs', { orderBy: 'date', ascending: false });
  const [adding, setAdding] = useState(false);

  const clientLogs = useMemo(
    () => logs.rows.filter((l) => l.client_id === clientId),
    [logs.rows, clientId],
  );

  async function remove(id: string) {
    if (confirm('Delete this communication note?')) await CommunicationsApi.remove(id);
  }

  return (
    <div className="card p-4">
      <SectionTitle
        action={
          <button className="text-sm font-semibold text-gold-600" onClick={() => setAdding(true)}>
            <Plus size={14} className="inline" /> Add Note
          </button>
        }
      >
        Communication Log
      </SectionTitle>

      {clientLogs.length === 0 ? (
        <p className="flex flex-col items-center gap-2 py-4 text-center text-sm text-navy-400">
          <MessageSquare size={24} className="text-navy-300" />
          No communication recorded yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {clientLogs.map((l) => (
            <li key={l.id} className="rounded-lg border border-navy-100 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="bg-navy-100 text-navy-700">{l.type}</Pill>
                  <span className="text-xs text-navy-400">{formatDate(l.date)}</span>
                </div>
                {(profile?.role === 'partner' || l.created_by === profile?.id) && (
                  <button onClick={() => remove(l.id)} className="text-navy-300 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              {l.discussion_notes && <p className="mt-2 text-sm text-navy-700">{l.discussion_notes}</p>}
              {l.decision_taken && (
                <p className="mt-1 text-xs text-navy-500">
                  <span className="font-semibold">Decision:</span> {l.decision_taken}
                </p>
              )}
              {l.next_action && (
                <p className="mt-0.5 text-xs text-navy-500">
                  <span className="font-semibold">Next:</span> {l.next_action}
                  {l.responsible_person && ` · ${users.nameOf(l.responsible_person)}`}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && <CommunicationFormModal clientId={clientId} onClose={() => setAdding(false)} />}
    </div>
  );
}

function CommunicationFormModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { profile } = useAuth();
  const { users } = useData();
  const [date, setDate] = useState(isoDay(0));
  const [type, setType] = useState<CommunicationType>('Meeting');
  const [notes, setNotes] = useState('');
  const [decision, setDecision] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [responsible, setResponsible] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      await CommunicationsApi.add(
        {
          client_id: clientId,
          date,
          type,
          discussion_notes: notes,
          decision_taken: decision,
          next_action: nextAction,
          responsible_person: responsible || null,
        },
        profile.id,
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title="Add Communication"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-gold" onClick={save} disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />} Save
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date">
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(v) => setType(v as CommunicationType)} options={COMMUNICATION_TYPES} />
          </Field>
        </div>
        <Field label="Discussion Notes">
          <textarea className="input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field label="Decision Taken">
          <input className="input" value={decision} onChange={(e) => setDecision(e.target.value)} />
        </Field>
        <Field label="Next Action">
          <input className="input" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
        </Field>
        <Field label="Responsible Person">
          <select className="input" value={responsible} onChange={(e) => setResponsible(e.target.value)}>
            <option value="">Unassigned</option>
            {users.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
