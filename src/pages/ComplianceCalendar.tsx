import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Modal } from '@/components/ui/Modal';
import { ComplianceStatusBadge, CategoryBadge } from '@/components/ui/Badges';
import { Spinner } from '@/components/ui/Misc';
import { ComplianceFormModal } from '@/components/compliance/ComplianceForm';
import { cn, dueState, DUE_STATE_DOT, formatDate } from '@/lib/utils';
import { CompliancesApi, AssignmentsApi } from '@/lib/api';
import { bsMonthGrid, stepBsMonth, todayBs, toBs, formatBsAd, WEEKDAYS } from '@/lib/nepaliDate';
import type { Compliance } from '@/types';

const todayIso = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

export function ComplianceCalendar() {
  const { profile } = useAuth();
  const { compliances, clients } = useData();
  const initial = todayBs();
  const [bsY, setBsY] = useState(initial.year);
  const [bsM, setBsM] = useState(initial.month);
  const [selected, setSelected] = useState<Compliance | null>(null);
  const [adding, setAdding] = useState(false);

  const isPartner = profile?.role === 'partner';
  const clientName = (id: string) => clients.rows.find((c) => c.id === id)?.client_name ?? '—';

  const grid = useMemo(() => bsMonthGrid(bsY, bsM), [bsY, bsM]);

  // Bucket compliances by their AD date (so they land on the right BS cell).
  const byDay = useMemo(() => {
    const map = new Map<string, Compliance[]>();
    for (const c of compliances.rows) {
      if (!c.due_date) continue;
      const key = c.due_date.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }, [compliances.rows]);

  // Items whose BS month matches the current view (for the mobile list).
  const monthItems = useMemo(
    () =>
      compliances.rows
        .filter((c) => {
          const b = toBs(c.due_date);
          return b && b.year === bsY && b.month === bsM;
        })
        .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),
    [compliances.rows, bsY, bsM],
  );

  const go = (delta: number) => {
    const next = stepBsMonth(bsY, bsM, delta);
    setBsY(next.year);
    setBsM(next.month);
  };
  const goToday = () => {
    const t = todayBs();
    setBsY(t.year);
    setBsM(t.month);
  };

  const leading = Array.from({ length: grid.firstWeekday });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Compliance Calendar</h1>
          <p className="text-sm text-navy-400">
            Nepali (Bikram Sambat) · Green = completed · Yellow = upcoming · Red = overdue
          </p>
        </div>
        {isPartner && (
          <button className="btn-gold" onClick={() => setAdding(true)}>
            <Plus size={18} /> Add
          </button>
        )}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-xl border border-navy-100 bg-white px-3 py-2">
        <button className="rounded-lg p-2 hover:bg-navy-100" onClick={() => go(-1)} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="font-bold text-navy-800">
              {grid.monthName} {grid.year} BS
            </span>
            <button className="text-xs font-semibold text-gold-600" onClick={goToday}>
              Today
            </button>
          </div>
          <p className="text-xs text-navy-400">{grid.adRangeLabel} AD</p>
        </div>
        <button className="rounded-lg p-2 hover:bg-navy-100" onClick={() => go(1)} aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Desktop month grid */}
      <div className="hidden rounded-xl border border-navy-100 bg-white p-3 lg:block">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-navy-400">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {leading.map((_, i) => (
            <div key={`blank-${i}`} className="min-h-[92px] rounded-lg bg-navy-50/40" />
          ))}
          {grid.cells.map((cell) => {
            const items = byDay.get(cell.adIso) ?? [];
            const adLabel = formatDate(cell.adIso).replace(/ \d{4}$/, ''); // "29 Nov"
            return (
              <div
                key={cell.adIso}
                className={cn(
                  'min-h-[92px] rounded-lg border border-navy-100 bg-white p-1.5',
                  cell.adIso === todayIso && 'ring-1 ring-gold-400',
                )}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-navy-700">{cell.day}</span>
                  <span className="text-[10px] text-navy-300">{adLabel}</span>
                </div>
                <div className="mt-1 space-y-1">
                  {items.slice(0, 3).map((c) => {
                    const st = dueState(c);
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelected(c)}
                        className={cn(
                          'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] font-medium',
                          st === 'completed' && 'bg-green-50 text-green-800',
                          st === 'upcoming' && 'bg-gold-50 text-gold-700',
                          st === 'overdue' && 'bg-red-50 text-red-700',
                          st === 'none' && 'bg-navy-50 text-navy-600',
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DUE_STATE_DOT[st])} />
                        <span className="truncate">{c.subcategory}</span>
                      </button>
                    );
                  })}
                  {items.length > 3 && <p className="px-1 text-[10px] text-navy-400">+{items.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile / list view for the month */}
      <div className="card p-4 lg:hidden">
        <h2 className="mb-2 text-sm font-bold text-navy-700">
          {grid.monthName} {grid.year} BS
        </h2>
        {monthItems.length === 0 ? (
          <p className="flex flex-col items-center gap-2 py-6 text-center text-sm text-navy-400">
            <CalendarDays size={24} className="text-navy-300" /> Nothing due this month.
          </p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {monthItems.map((c) => {
              const st = dueState(c);
              return (
                <li key={c.id}>
                  <button onClick={() => setSelected(c)} className="flex w-full items-center justify-between gap-2 py-2.5 text-left">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', DUE_STATE_DOT[st])} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-navy-800">{c.subcategory}</p>
                        <p className="truncate text-xs text-navy-400">
                          {clientName(c.client_id)} · {formatBsAd(c.due_date)}
                        </p>
                      </div>
                    </div>
                    <ComplianceStatusBadge status={c.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected && (
        <ComplianceDetailModal
          compliance={selected}
          clientName={clientName(selected.client_id)}
          onClose={() => setSelected(null)}
        />
      )}
      {adding && <ComplianceFormModal compliance={null} onClose={() => setAdding(false)} />}
    </div>
  );
}

// --------------------------------------------------------------------------- //

function ComplianceDetailModal({
  compliance,
  clientName,
  onClose,
}: {
  compliance: Compliance;
  clientName: string;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const { assignments, users } = useData();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const isPartner = profile?.role === 'partner';
  const team = assignments.rows.filter(
    (a) => a.reference_type === 'compliance' && a.reference_id === compliance.id,
  );
  const mine = team.find((a) => a.employee_id === profile?.id);

  async function toggleMine() {
    if (!mine) return;
    setBusy(true);
    try {
      await AssignmentsApi.setStatus(mine.id, mine.status === 'Completed' ? 'Pending' : 'Completed');
    } finally {
      setBusy(false);
      onClose();
    }
  }

  async function partnerComplete() {
    setBusy(true);
    try {
      await CompliancesApi.setStatus(compliance.id, 'Completed');
    } finally {
      setBusy(false);
      onClose();
    }
  }

  async function partnerDelete() {
    if (!confirm(`Delete "${compliance.subcategory}" for ${clientName}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await CompliancesApi.remove(compliance.id);
    } finally {
      setBusy(false);
      onClose();
    }
  }

  if (editing) {
    return <ComplianceFormModal compliance={compliance} onClose={onClose} />;
  }

  return (
    <Modal
      open
      title="Compliance Detail"
      onClose={onClose}
      footer={
        <>
          {isPartner && (
            <>
              <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={partnerDelete} disabled={busy}>
                Delete
              </button>
              <button className="btn-ghost" onClick={() => setEditing(true)}>
                Edit
              </button>
              {compliance.status !== 'Completed' && (
                <button className="btn-primary" onClick={partnerComplete} disabled={busy}>
                  {busy && <Spinner className="h-4 w-4" />} Mark Completed
                </button>
              )}
            </>
          )}
          {mine && (
            <button className="btn-gold" onClick={toggleMine} disabled={busy}>
              {busy && <Spinner className="h-4 w-4" />}
              {mine.status === 'Completed' ? 'Mark My Part Pending' : 'Mark My Part Done'}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <Row label="Client" value={clientName} />
        <Row label="Compliance" value={compliance.subcategory} />
        <div className="flex items-center gap-2">
          <CategoryBadge category={compliance.category} />
          <ComplianceStatusBadge status={compliance.status} />
        </div>
        <Row label="Deadline" value={formatBsAd(compliance.due_date)} />
        {compliance.remarks && <Row label="Remarks" value={compliance.remarks} />}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-400">Assigned Employees</p>
          {team.length === 0 ? (
            <p className="text-navy-400">No one assigned.</p>
          ) : (
            <ul className="space-y-1">
              {team.map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span className="text-navy-700">{users.nameOf(a.employee_id)}</span>
                  <span className={cn('text-xs font-semibold', a.status === 'Completed' ? 'text-green-700' : 'text-gold-700')}>
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-navy-400">{label}: </span>
      <span className="text-navy-800">{value}</span>
    </div>
  );
}
