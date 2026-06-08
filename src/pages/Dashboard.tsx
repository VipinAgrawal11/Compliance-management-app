import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ClipboardCheck,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { StatCard, EmptyState } from '@/components/ui/Misc';
import { ComplianceStatusBadge, StageBadge, OverdueBadge } from '@/components/ui/Badges';
import { SectionTitle } from '@/components/ui/Form';
import { formatDate, isOverdue, daysUntil } from '@/lib/utils';
import { NotificationsApi } from '@/lib/api';
import {
  dueThisMonth,
  overdueCompliances,
  upcomingDeadlines,
  employeePerformance,
} from '@/lib/selectors';
import type { Client, Compliance, AuditEngagement, Assignment, AppUser } from '@/types';

export function Dashboard() {
  const { profile } = useAuth();
  const { clients, compliances, engagements, assignments, users } = useData();

  // Partners opportunistically trigger reminder generation on free tier (no cron).
  useEffect(() => {
    if (profile?.role === 'partner') void NotificationsApi.generateReminders();
  }, [profile?.role]);

  if (!profile) return null;
  const clientName = (id: string) => clients.rows.find((c) => c.id === id)?.client_name ?? '—';

  return profile.role === 'partner' ? (
    <PartnerDashboard
      clients={clients.rows}
      compliances={compliances.rows}
      engagements={engagements.rows}
      assignments={assignments.rows}
      employees={users.employees}
      clientName={clientName}
    />
  ) : (
    <EmployeeDashboard
      myId={profile.id}
      compliances={compliances.rows}
      engagements={engagements.rows}
      assignments={assignments.rows}
      clientName={clientName}
    />
  );
}

// --------------------------------------------------------------------------- //

function PartnerDashboard({
  clients,
  compliances,
  engagements,
  assignments,
  employees,
  clientName,
}: {
  clients: Client[];
  compliances: Compliance[];
  engagements: AuditEngagement[];
  assignments: Assignment[];
  employees: AppUser[];
  clientName: (id: string) => string;
}) {
  const activeAudits = engagements.filter((e) => e.stage !== 'Closed' && e.stage !== 'Report Issued');
  const dueMonth = dueThisMonth(compliances);
  const overdue = overdueCompliances(compliances);
  const upcoming = upcomingDeadlines(compliances, engagements, 30);
  const pendingApprovals = engagements.filter((e) => e.stage === 'Partner Approval');
  const perf = useMemo(
    () => employeePerformance(employees, assignments, compliances, engagements),
    [employees, assignments, compliances, engagements],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Firm Dashboard</h1>
        <p className="text-sm text-navy-400">Overview of clients, compliance and engagements.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total Clients" value={clients.length} icon={<Building2 size={20} />} accent="bg-navy-100 text-navy-700" />
        <StatCard label="Active Audits" value={activeAudits.length} icon={<ClipboardCheck size={20} />} accent="bg-blue-100 text-blue-700" />
        <StatCard label="Compliance Due (Month)" value={dueMonth.length} icon={<CalendarClock size={20} />} accent="bg-gold-100 text-gold-700" />
        <StatCard label="Overdue Compliance" value={overdue.length} icon={<AlertTriangle size={20} />} accent="bg-red-100 text-red-700" />
        <StatCard label="Upcoming (30d)" value={upcoming.length} icon={<ListTodo size={20} />} accent="bg-indigo-100 text-indigo-700" />
        <StatCard label="Pending Approvals" value={pendingApprovals.length} icon={<CheckCircle2 size={20} />} accent="bg-orange-100 text-orange-700" />
      </div>

      <div className="card p-4">
        <SectionTitle action={<Link to="/employees" className="text-sm font-semibold text-gold-600">Manage</Link>}>
          Employee Performance
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="py-2 pr-4">Employee</th>
                <th className="px-2">Assigned</th>
                <th className="px-2">Completed</th>
                <th className="px-2">Pending</th>
                <th className="px-2">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {perf.map((p) => (
                <tr key={p.user.id} className="border-t border-navy-100">
                  <td className="py-2 pr-4 font-medium text-navy-800">{p.user.name}</td>
                  <td className="px-2">{p.assigned}</td>
                  <td className="px-2 text-green-700">{p.completed}</td>
                  <td className="px-2 text-gold-700">{p.pending}</td>
                  <td className="px-2 text-red-600">{p.overdue}</td>
                </tr>
              ))}
              {perf.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-navy-400">
                    No employees yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4">
        <SectionTitle action={<Link to="/calendar" className="text-sm font-semibold text-gold-600">Calendar</Link>}>
          Upcoming Deadlines
        </SectionTitle>
        {upcoming.length === 0 ? (
          <p className="py-4 text-center text-sm text-navy-400">Nothing due in the next 30 days.</p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {upcoming.slice(0, 8).map((d) => (
              <li key={`${d.kind}-${d.id}`} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy-800">{d.title}</p>
                  <p className="truncate text-xs text-navy-400">
                    {clientName(d.client_id)} · {d.kind}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-navy-700">{formatDate(d.due_date)}</p>
                  <p className="text-xs text-navy-400">in {daysUntil(d.due_date)} day(s)</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------- //

function EmployeeDashboard({
  myId,
  compliances,
  engagements,
  assignments,
  clientName,
}: {
  myId: string;
  compliances: Compliance[];
  engagements: AuditEngagement[];
  assignments: Assignment[];
  clientName: (id: string) => string;
}) {
  const myAssignments = assignments.filter((a) => a.employee_id === myId);
  const complianceById = new Map(compliances.map((c) => [c.id, c]));
  const engById = new Map(engagements.map((e) => [e.id, e]));

  const rows = myAssignments
    .map((a) => {
      if (a.reference_type === 'compliance') {
        const c = complianceById.get(a.reference_id);
        return c
          ? { aId: a.id, status: a.status, kind: 'Compliance' as const, title: c.subcategory, client_id: c.client_id, due: c.due_date }
          : null;
      }
      const e = engById.get(a.reference_id);
      return e
        ? { aId: a.id, status: a.status, kind: 'Engagement' as const, title: e.audit_type, client_id: e.client_id, due: e.deadline }
        : null;
    })
    .filter(Boolean) as {
    aId: string;
    status: 'Pending' | 'Completed';
    kind: 'Compliance' | 'Engagement';
    title: string;
    client_id: string;
    due: string | null;
  }[];

  const pending = rows.filter((r) => r.status === 'Pending');
  const overdue = pending.filter((r) => isOverdue(r.due));
  const completed = rows.filter((r) => r.status === 'Completed');
  const myEngagements = engagements.filter((e) => e.assigned_employee === myId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-800">My Work</h1>
        <p className="text-sm text-navy-400">Your assigned compliance and audit work.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="My Assignments" value={rows.length} icon={<ListTodo size={20} />} accent="bg-navy-100 text-navy-700" />
        <StatCard label="Pending" value={pending.length} icon={<CalendarClock size={20} />} accent="bg-gold-100 text-gold-700" />
        <StatCard label="Overdue" value={overdue.length} icon={<AlertTriangle size={20} />} accent="bg-red-100 text-red-700" />
        <StatCard label="Completed" value={completed.length} icon={<CheckCircle2 size={20} />} accent="bg-green-100 text-green-700" />
      </div>

      <div className="card p-4">
        <SectionTitle>My Assignments</SectionTitle>
        {rows.length === 0 ? (
          <EmptyState title="Nothing assigned yet" description="Work assigned to you will appear here." />
        ) : (
          <ul className="divide-y divide-navy-100">
            {rows
              .slice()
              .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''))
              .map((r) => (
                <li key={r.aId} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-800">{r.title}</p>
                    <p className="truncate text-xs text-navy-400">
                      {clientName(r.client_id)} · {r.kind} · due {formatDate(r.due)}
                    </p>
                  </div>
                  {r.status === 'Completed' ? (
                    <ComplianceStatusBadge status="Completed" />
                  ) : isOverdue(r.due) ? (
                    <OverdueBadge />
                  ) : (
                    <ComplianceStatusBadge status="Pending" />
                  )}
                </li>
              ))}
          </ul>
        )}
      </div>

      {myEngagements.length > 0 && (
        <div className="card p-4">
          <SectionTitle action={<Link to="/audits" className="text-sm font-semibold text-gold-600">All audits</Link>}>
            My Engagements
          </SectionTitle>
          <ul className="divide-y divide-navy-100">
            {myEngagements.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <Link to={`/audits/${e.id}`} className="truncate text-sm font-medium text-navy-800 hover:text-gold-600">
                    {e.audit_type}
                  </Link>
                  <p className="truncate text-xs text-navy-400">
                    {clientName(e.client_id)} · due {formatDate(e.deadline)}
                  </p>
                </div>
                <StageBadge stage={e.stage} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
