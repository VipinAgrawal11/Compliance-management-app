import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { EmptyState } from '@/components/ui/Misc';
import { StageBadge, Pill } from '@/components/ui/Badges';
import { SearchInput, Select } from '@/components/ui/Form';
import { EngagementFormModal } from '@/components/audit/EngagementForm';
import { formatDate, isOverdue } from '@/lib/utils';
import { AUDIT_TYPES, AUDIT_STAGES } from '@/types';

export function Audits() {
  const { profile } = useAuth();
  const { engagements, clients, users } = useData();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [stage, setStage] = useState('');
  const [adding, setAdding] = useState(false);

  const isPartner = profile?.role === 'partner';
  const clientName = (id: string) => clients.rows.find((c) => c.id === id)?.client_name ?? '—';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return engagements.rows.filter((e) => {
      if (type && e.audit_type !== type) return false;
      if (stage && e.stage !== stage) return false;
      if (!q) return true;
      return clientName(e.client_id).toLowerCase().includes(q) || e.audit_type.toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagements.rows, query, type, stage, clients.rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Audit Engagements</h1>
          <p className="text-sm text-navy-400">{engagements.rows.length} engagement(s).</p>
        </div>
        {isPartner && (
          <button className="btn-gold" onClick={() => setAdding(true)}>
            <Plus size={18} /> New
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={query} onChange={setQuery} placeholder="Search client or type…" />
        <Select value={type} onChange={setType} options={AUDIT_TYPES} allowEmpty="All types" className="sm:w-44" />
        <Select value={stage} onChange={setStage} options={AUDIT_STAGES} allowEmpty="All stages" className="sm:w-44" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<ClipboardCheck size={32} />} title="No engagements found" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => {
            const overdue = isOverdue(e.deadline) && e.stage !== 'Closed' && e.stage !== 'Report Issued';
            return (
              <Link key={e.id} to={`/audits/${e.id}`} className="card p-4 transition hover:border-gold-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-navy-800">{clientName(e.client_id)}</h3>
                  <Pill className="bg-navy-100 text-navy-700">{e.audit_type}</Pill>
                </div>
                <div className="mt-2">
                  <StageBadge stage={e.stage} />
                </div>
                <p className="mt-3 text-sm text-navy-500">
                  Lead: {e.assigned_employee ? users.nameOf(e.assigned_employee) : 'Unassigned'}
                </p>
                <p className={`text-sm ${overdue ? 'font-semibold text-red-600' : 'text-navy-500'}`}>
                  Deadline: {formatDate(e.deadline)} {overdue && '· Overdue'}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {adding && <EngagementFormModal engagement={null} onClose={() => setAdding(false)} />}
    </div>
  );
}
