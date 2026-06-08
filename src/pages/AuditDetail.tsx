import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, ListChecks, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTable } from '@/hooks/useTable';
import { EmptyState, Spinner } from '@/components/ui/Misc';
import { StageBadge, ChecklistStatusBadge, DocStatusBadge } from '@/components/ui/Badges';
import { SectionTitle, Field } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { EngagementFormModal } from '@/components/audit/EngagementForm';
import { DocumentFormModal } from '@/components/documents/DocumentForm';
import { cn, formatDate } from '@/lib/utils';
import { EngagementsApi, ChecklistApi } from '@/lib/api';
import {
  AUDIT_STAGES,
  CHECKLIST_STATUSES,
  type ChecklistProgress,
  type ChecklistStatus,
  type DocumentRequest,
  type AuditStage,
} from '@/types';

export function AuditDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { engagements, clients, users, templates, items } = useData();
  const progress = useTable<ChecklistProgress>('audit_checklist_progress');
  const documents = useTable<DocumentRequest>('documents');

  const [editEng, setEditEng] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [addDoc, setAddDoc] = useState(false);
  const [savingStage, setSavingStage] = useState(false);

  const isPartner = profile?.role === 'partner';
  const eng = engagements.rows.find((e) => e.id === id);
  const isLead = eng?.assigned_employee === profile?.id;

  const myProgress = useMemo(
    () => progress.rows.filter((p) => p.engagement_id === id),
    [progress.rows, id],
  );
  const engDocs = useMemo(() => documents.rows.filter((d) => d.audit_id === id), [documents.rows, id]);

  if (!eng) {
    return (
      <div className="space-y-4">
        <Link to="/audits" className="inline-flex items-center gap-1 text-sm text-navy-500">
          <ArrowLeft size={16} /> Back to audits
        </Link>
        <EmptyState title="Engagement not found" />
      </div>
    );
  }

  const client = clients.rows.find((c) => c.id === eng.client_id);
  const canEditStage = isPartner || isLead;

  async function changeStage(stage: AuditStage) {
    setSavingStage(true);
    try {
      await EngagementsApi.setStage(eng!.id, stage);
    } finally {
      setSavingStage(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link to="/audits" className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
        <ArrowLeft size={16} /> Back to audits
      </Link>

      {/* Header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy-800">{client?.client_name ?? '—'}</h1>
            <p className="mt-0.5 text-sm text-navy-400">{eng.audit_type}</p>
          </div>
          {isPartner && (
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setEditEng(true)}>
                <Pencil size={16} /> Edit
              </button>
              <button
                className="btn-ghost text-red-600 hover:bg-red-50"
                onClick={async () => {
                  if (confirm(`Delete this ${eng.audit_type} engagement? This cannot be undone.`)) {
                    await EngagementsApi.remove(eng.id);
                    navigate('/audits');
                  }
                }}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-navy-600">
          <StageBadge stage={eng.stage} />
          <span>Lead: {eng.assigned_employee ? users.nameOf(eng.assigned_employee) : 'Unassigned'}</span>
          <span>Start: {formatDate(eng.start_date)}</span>
          <span>Deadline: {formatDate(eng.deadline)}</span>
        </div>
        {eng.delay_reason && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <span className="font-semibold">Delay:</span> {eng.delay_reason}
          </p>
        )}
      </div>

      {/* Stage stepper */}
      <div className="card p-4">
        <SectionTitle>Engagement Stage</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {AUDIT_STAGES.map((s, i) => {
            const currentIdx = AUDIT_STAGES.indexOf(eng.stage);
            const done = i <= currentIdx;
            return (
              <button
                key={s}
                disabled={!canEditStage || savingStage}
                onClick={() => changeStage(s)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition',
                  done ? 'bg-navy-700 text-white' : 'bg-navy-100 text-navy-500',
                  canEditStage && 'hover:ring-2 hover:ring-gold-300',
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
        {!canEditStage && (
          <p className="mt-2 text-xs text-navy-400">Only the lead employee or a partner can change the stage.</p>
        )}
      </div>

      {/* Checklist */}
      <div className="card p-4">
        <SectionTitle
          action={
            isPartner && (
              <button className="text-sm font-semibold text-gold-600" onClick={() => setApplyOpen(true)}>
                <ListChecks size={14} className="inline" /> Apply Template
              </button>
            )
          }
        >
          Audit Checklist
        </SectionTitle>
        {myProgress.length === 0 ? (
          <p className="py-3 text-center text-sm text-navy-400">
            No checklist items yet.{isPartner && ' Apply a template to begin.'}
          </p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {myProgress.map((p) => (
              <ChecklistRow key={p.id} item={p} canManage={isPartner} myId={profile?.id} />
            ))}
          </ul>
        )}
      </div>

      {/* Documents */}
      <div className="card p-4">
        <SectionTitle
          action={
            <button className="text-sm font-semibold text-gold-600" onClick={() => setAddDoc(true)}>
              <Plus size={14} className="inline" /> Add
            </button>
          }
        >
          Document Requests
        </SectionTitle>
        {engDocs.length === 0 ? (
          <p className="py-3 text-center text-sm text-navy-400">No documents linked to this engagement.</p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {engDocs.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy-800">{d.document_name}</p>
                  <p className="text-xs text-navy-400">Deadline {formatDate(d.deadline)}</p>
                </div>
                <DocStatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {editEng && <EngagementFormModal engagement={eng} onClose={() => setEditEng(false)} />}
      {addDoc && (
        <DocumentFormModal document={null} fixedClientId={eng.client_id} onClose={() => setAddDoc(false)} />
      )}
      {applyOpen && (
        <ApplyTemplateModal
          engagementId={eng.id}
          auditType={eng.audit_type}
          templates={templates.rows}
          items={items.rows}
          onClose={() => setApplyOpen(false)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------- //

function ChecklistRow({
  item,
  canManage,
  myId,
}: {
  item: ChecklistProgress;
  canManage: boolean;
  myId?: string;
}) {
  const { users } = useData();
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState(item.review_comment);
  const [editingComment, setEditingComment] = useState(false);
  const mine = item.assigned_employee === myId;

  async function setStatus(status: ChecklistStatus) {
    setBusy(true);
    try {
      await ChecklistApi.setStatus(item.id, status);
    } finally {
      setBusy(false);
    }
  }

  async function saveComment() {
    setBusy(true);
    try {
      await ChecklistApi.setStatus(item.id, item.status, comment);
      setEditingComment(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-navy-800">{item.item_name}</p>
          <p className="text-xs text-navy-400">
            {item.assigned_employee ? users.nameOf(item.assigned_employee) : 'Unassigned'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {busy && <Spinner className="h-4 w-4" />}
          <ChecklistStatusBadge status={item.status} />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {(mine || canManage) &&
          CHECKLIST_STATUSES.filter((s) => s !== 'Reviewed' || canManage).map((s) => (
            <button
              key={s}
              disabled={busy || item.status === s}
              onClick={() => setStatus(s)}
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                item.status === s ? 'bg-navy-700 text-white' : 'bg-navy-100 text-navy-600 hover:bg-navy-200',
              )}
            >
              {s}
            </button>
          ))}
        {canManage && (
          <button
            onClick={() => setEditingComment((v) => !v)}
            className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-medium text-gold-700"
          >
            Review note
          </button>
        )}
      </div>
      {item.review_comment && !editingComment && (
        <p className="mt-1 text-xs italic text-navy-500">“{item.review_comment}”</p>
      )}
      {editingComment && (
        <div className="mt-2 flex gap-2">
          <input
            className="input flex-1"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Reviewer comment…"
          />
          <button className="btn-gold" onClick={saveComment} disabled={busy}>
            Save
          </button>
        </div>
      )}
    </li>
  );
}

// --------------------------------------------------------------------------- //

function ApplyTemplateModal({
  engagementId,
  auditType,
  templates,
  items,
  onClose,
}: {
  engagementId: string;
  auditType: string;
  templates: import('@/types').ChecklistTemplate[];
  items: import('@/types').ChecklistItem[];
  onClose: () => void;
}) {
  const { users } = useData();
  const matching = templates.filter((t) => t.audit_type === auditType);
  const [templateId, setTemplateId] = useState(matching[0]?.id ?? templates[0]?.id ?? '');
  const [assignee, setAssignee] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templateItems = items.filter((i) => i.template_id === templateId);

  async function apply() {
    if (!templateId) {
      setError('Select a template.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await ChecklistApi.applyTemplate(
        engagementId,
        templateItems.map((i) => ({ item_name: i.item_name })),
        assignee || null,
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
      title="Apply Checklist Template"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-gold" onClick={apply} disabled={busy || templateItems.length === 0}>
            {busy && <Spinner className="h-4 w-4" />} Apply {templateItems.length} item(s)
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {templates.length === 0 ? (
          <p className="text-sm text-navy-500">
            No templates defined yet. Create one under Settings → Audit Templates.
          </p>
        ) : (
          <>
            <Field label="Template">
              <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.audit_type})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assign all items to (optional)">
              <select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {users.activeEmployees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="rounded-lg bg-navy-50 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-400">Items</p>
              {templateItems.length === 0 ? (
                <p className="text-sm text-navy-400">This template has no items.</p>
              ) : (
                <ul className="list-disc pl-5 text-sm text-navy-700">
                  {templateItems.map((i) => (
                    <li key={i.id}>{i.item_name}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
