import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Modal } from '@/components/ui/Modal';
import { Field, Select, ChipMultiSelect } from '@/components/ui/Form';
import { Spinner } from '@/components/ui/Misc';
import { CompliancesApi, AssignmentsApi } from '@/lib/api';
import {
  COMPLIANCE_CATEGORIES,
  COMPLIANCE_SUBCATEGORIES,
  COMPLIANCE_STATUSES,
  type Compliance,
  type ComplianceCategory,
  type ComplianceStatus,
} from '@/types';

export function ComplianceFormModal({
  compliance,
  fixedClientId,
  onClose,
}: {
  compliance: Compliance | null;
  fixedClientId?: string;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const { clients, assignments, users } = useData();
  const editing = Boolean(compliance);

  const [clientId, setClientId] = useState(compliance?.client_id ?? fixedClientId ?? '');
  const [category, setCategory] = useState<ComplianceCategory>(compliance?.category ?? 'TAX');
  const [subcategory, setSubcategory] = useState(compliance?.subcategory ?? '');
  const [dueDate, setDueDate] = useState(compliance?.due_date ?? '');
  const [status, setStatus] = useState<ComplianceStatus>(compliance?.status ?? 'Pending');
  const [remarks, setRemarks] = useState(compliance?.remarks ?? '');
  const existingTeam = useMemo(
    () =>
      compliance
        ? assignments.rows
            .filter((a) => a.reference_type === 'compliance' && a.reference_id === compliance.id)
            .map((a) => a.employee_id)
        : [],
    [assignments.rows, compliance],
  );
  const [team, setTeam] = useState<string[]>(existingTeam);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subOptions = COMPLIANCE_SUBCATEGORIES[category];
  const manualSub = category === 'OTHER' || subOptions.length === 0;

  async function save() {
    if (!clientId || !subcategory.trim() || !profile) {
      setError('Client and compliance type are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing && compliance) {
        await CompliancesApi.update(compliance.id, {
          client_id: clientId,
          category,
          subcategory: subcategory.trim(),
          due_date: dueDate || null,
          status,
          remarks,
        });
        await AssignmentsApi.setEmployees('compliance', compliance.id, team);
      } else {
        const newId = await CompliancesApi.create(
          {
            client_id: clientId,
            category,
            subcategory: subcategory.trim(),
            due_date: dueDate || null,
            status,
            remarks,
          },
          profile.id,
        );
        if (team.length) await AssignmentsApi.setEmployees('compliance', newId, team);
      }
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={editing ? 'Edit Compliance' : 'Add Compliance'}
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
          <Field label="Category">
            <Select
              value={category}
              onChange={(v) => {
                setCategory(v as ComplianceCategory);
                setSubcategory('');
              }}
              options={Object.keys(COMPLIANCE_CATEGORIES)}
            />
          </Field>
          <Field label="Compliance Type">
            {manualSub ? (
              <input
                className="input"
                value={subcategory}
                placeholder="Enter type…"
                onChange={(e) => setSubcategory(e.target.value)}
              />
            ) : (
              <Select value={subcategory} onChange={setSubcategory} options={subOptions} placeholder="Select…" />
            )}
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Due Date">
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(v) => setStatus(v as ComplianceStatus)} options={COMPLIANCE_STATUSES} />
          </Field>
        </div>
        <Field label="Assign Employees" hint="Item is complete only when every assignee finishes.">
          <ChipMultiSelect
            options={users.activeEmployees.map((u) => ({ id: u.id, label: u.name }))}
            selected={team}
            onToggle={(id) =>
              setTeam((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
            }
          />
        </Field>
        <Field label="Remarks">
          <textarea className="input min-h-[70px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
