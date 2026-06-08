import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Plus, Trash2, X, Users } from 'lucide-react';
import { useData, useFirmSettings } from '@/contexts/DataContext';
import { Field, Select, SectionTitle } from '@/components/ui/Form';
import { Spinner } from '@/components/ui/Misc';
import { Pill } from '@/components/ui/Badges';
import { SettingsApi, ChecklistApi } from '@/lib/api';
import { AUDIT_TYPES, COMPLIANCE_CATEGORIES, COMPLIANCE_SUBCATEGORIES, type AuditType } from '@/types';

export function SettingsPage() {
  const settings = useFirmSettings();

  if (!settings) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Settings</h1>
        <p className="text-sm text-navy-400">Firm configuration — partners only.</p>
      </div>

      <FirmDetails firmName={settings.firm_name} />
      <NotificationTiming reminderDays={settings.reminder_days} notifyOverdue={settings.notify_overdue} />
      <Designations designations={settings.designations} />
      <AuditTemplates />
      <ComplianceReference />

      <div className="card flex items-center justify-between p-4">
        <div>
          <p className="font-semibold text-navy-800">Employee Management</p>
          <p className="text-sm text-navy-400">Add, edit, deactivate staff and view allocation.</p>
        </div>
        <Link to="/employees" className="btn-ghost">
          <Users size={16} /> Open
        </Link>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------- //

function FirmDetails({ firmName }: { firmName: string }) {
  const [name, setName] = useState(firmName);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      await SettingsApi.update({ firm_name: name.trim() });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <SectionTitle>Firm Details</SectionTitle>
      <Field label="Firm Name">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="mt-3 flex items-center gap-2">
        <button className="btn-gold" onClick={save} disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <Save size={16} />} Save
        </button>
        {saved && <span className="text-sm text-green-700">Saved</span>}
      </div>
    </div>
  );
}

function NotificationTiming({
  reminderDays,
  notifyOverdue,
}: {
  reminderDays: number[];
  notifyOverdue: boolean;
}) {
  const [days, setDays] = useState(reminderDays.join(', '));
  const [overdue, setOverdue] = useState(notifyOverdue);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    const parsed = Array.from(
      new Set(
        days
          .split(',')
          .map((d) => parseInt(d.trim(), 10))
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    ).sort((a, b) => b - a);
    setBusy(true);
    setSaved(false);
    try {
      await SettingsApi.update({ reminder_days: parsed, notify_overdue: overdue });
      setDays(parsed.join(', '));
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <SectionTitle>Notification Timing</SectionTitle>
      <Field label="Reminder days before deadline" hint="Comma-separated, e.g. 30, 15, 7, 1">
        <input className="input" value={days} onChange={(e) => setDays(e.target.value)} />
      </Field>
      <label className="mt-3 flex items-center gap-2 text-sm text-navy-700">
        <input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} />
        Send overdue alerts and escalate to partners
      </label>
      <div className="mt-3 flex items-center gap-2">
        <button className="btn-gold" onClick={save} disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <Save size={16} />} Save
        </button>
        {saved && <span className="text-sm text-green-700">Saved</span>}
      </div>
    </div>
  );
}

function Designations({ designations }: { designations: string[] }) {
  const [list, setList] = useState<string[]>(designations);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function persist(next: string[]) {
    setList(next);
    setBusy(true);
    try {
      await SettingsApi.update({ designations: next });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <SectionTitle>Designations</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {list.map((d) => (
          <Pill key={d} className="bg-navy-100 text-navy-700">
            {d}
            <button className="ml-1.5 text-navy-400 hover:text-red-500" onClick={() => persist(list.filter((x) => x !== d))}>
              <X size={12} />
            </button>
          </Pill>
        ))}
        {list.length === 0 && <span className="text-sm text-navy-400">No designations.</span>}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="input flex-1"
          value={draft}
          placeholder="Add designation…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              persist([...list, draft.trim()]);
              setDraft('');
            }
          }}
        />
        <button
          className="btn-ghost"
          disabled={busy || !draft.trim()}
          onClick={() => {
            persist([...list, draft.trim()]);
            setDraft('');
          }}
        >
          <Plus size={16} /> Add
        </button>
      </div>
    </div>
  );
}

function AuditTemplates() {
  const { templates, items } = useData();
  const [name, setName] = useState('');
  const [type, setType] = useState<AuditType>('Statutory Audit');
  const [busy, setBusy] = useState(false);

  async function createTemplate() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await ChecklistApi.createTemplate(name.trim(), type);
      setName('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <SectionTitle>Audit Checklist Templates</SectionTitle>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="input flex-1" value={name} placeholder="Template name…" onChange={(e) => setName(e.target.value)} />
        <Select value={type} onChange={(v) => setType(v as AuditType)} options={AUDIT_TYPES} className="sm:w-48" />
        <button className="btn-gold" onClick={createTemplate} disabled={busy || !name.trim()}>
          <Plus size={16} /> Create
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {templates.rows.length === 0 ? (
          <p className="text-sm text-navy-400">No templates yet.</p>
        ) : (
          templates.rows.map((t) => (
            <TemplateCard key={t.id} template={t} items={items.rows.filter((i) => i.template_id === t.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  items,
}: {
  template: import('@/types').ChecklistTemplate;
  items: import('@/types').ChecklistItem[];
}) {
  const [draft, setDraft] = useState('');

  async function addItem() {
    if (!draft.trim()) return;
    await ChecklistApi.addItem(template.id, draft.trim(), items.length);
    setDraft('');
  }

  return (
    <div className="rounded-lg border border-navy-100 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-navy-800">{template.name}</p>
          <Pill className="bg-navy-100 text-navy-600">{template.audit_type}</Pill>
        </div>
        <button
          className="text-navy-300 hover:text-red-500"
          onClick={() => confirm(`Delete template "${template.name}"?`) && void ChecklistApi.removeTemplate(template.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <ul className="mb-2 space-y-1">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between text-sm text-navy-700">
            <span>• {i.item_name}</span>
            <button className="text-navy-300 hover:text-red-500" onClick={() => void ChecklistApi.removeItem(i.id)}>
              <X size={13} />
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-navy-400">No items yet.</li>}
      </ul>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={draft}
          placeholder="Add checklist item…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <button className="btn-ghost" onClick={addItem} disabled={!draft.trim()}>
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

function ComplianceReference() {
  return (
    <div className="card p-4">
      <SectionTitle>Compliance Categories</SectionTitle>
      <p className="mb-3 text-sm text-navy-400">
        Standard statutory categories used when creating compliance items.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(COMPLIANCE_CATEGORIES) as (keyof typeof COMPLIANCE_CATEGORIES)[])
          .filter((k) => COMPLIANCE_SUBCATEGORIES[k].length > 0)
          .map((k) => (
            <div key={k} className="rounded-lg bg-navy-50 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-500">
                {COMPLIANCE_CATEGORIES[k]}
              </p>
              <div className="flex flex-wrap gap-1">
                {COMPLIANCE_SUBCATEGORIES[k].map((s) => (
                  <span key={s} className="rounded bg-white px-1.5 py-0.5 text-[11px] text-navy-600">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
