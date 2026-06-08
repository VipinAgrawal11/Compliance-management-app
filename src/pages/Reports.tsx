import { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useTable } from '@/hooks/useTable';
import { Select, Field } from '@/components/ui/Form';
import { EmptyState } from '@/components/ui/Misc';
import { exportToExcel, exportToPDF, type Column } from '@/lib/export';
import { formatDate, isOverdue } from '@/lib/utils';
import { employeePerformance, inMonth } from '@/lib/selectors';
import {
  COMPLIANCE_STATUSES,
  type CommunicationLog as CommLog,
  type Compliance,
  type AuditEngagement,
} from '@/types';

type ReportType =
  | 'Compliance Report'
  | 'Audit Status Report'
  | 'Employee Performance Report'
  | 'Pending Work Report'
  | 'Overdue Report'
  | 'Client History Report';

const REPORT_TYPES: ReportType[] = [
  'Compliance Report',
  'Audit Status Report',
  'Employee Performance Report',
  'Pending Work Report',
  'Overdue Report',
  'Client History Report',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type Row = Record<string, string | number>;

export function Reports() {
  const { clients, compliances, engagements, assignments, users } = useData();
  const communications = useTable<CommLog>('communication_logs');

  const [report, setReport] = useState<ReportType>('Compliance Report');
  const [month, setMonth] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState('');

  const clientName = (id: string) => clients.rows.find((c) => c.id === id)?.client_name ?? '—';
  const year = new Date().getFullYear();

  const { columns, rows } = useMemo<{ columns: Column<Row>[]; rows: Row[] }>(() => {
    const col = (header: string): Column<Row> => ({ header, value: (r) => r[header] ?? '' });
    const cols = (headers: string[]) => headers.map(col);
    const passMonth = (date: string | null) => month === '' || inMonth(date, year, MONTHS.indexOf(month));
    const passClient = (cid: string) => clientId === '' || cid === clientId;

    if (report === 'Compliance Report') {
      const data = compliances.rows
        .filter((c) => passClient(c.client_id) && passMonth(c.due_date) && (status === '' || c.status === status))
        .map<Row>((c) => ({
          Client: clientName(c.client_id),
          Category: c.category,
          Type: c.subcategory,
          'Due Date': formatDate(c.due_date),
          Status: c.status,
          Assignees: assignments.rows
            .filter((a) => a.reference_type === 'compliance' && a.reference_id === c.id)
            .map((a) => users.nameOf(a.employee_id))
            .join(', '),
        }));
      return { columns: cols(['Client', 'Category', 'Type', 'Due Date', 'Status', 'Assignees']), rows: data };
    }

    if (report === 'Audit Status Report') {
      const data = engagements.rows.filter((e) => passClient(e.client_id)).map<Row>((e) => ({
        Client: clientName(e.client_id),
        'Audit Type': e.audit_type,
        Stage: e.stage,
        Lead: e.assigned_employee ? users.nameOf(e.assigned_employee) : 'Unassigned',
        Deadline: formatDate(e.deadline),
        'Delay Reason': e.delay_reason || '—',
      }));
      return { columns: cols(['Client', 'Audit Type', 'Stage', 'Lead', 'Deadline', 'Delay Reason']), rows: data };
    }

    if (report === 'Employee Performance Report') {
      const perf = employeePerformance(
        users.employees.filter((u) => employeeId === '' || u.id === employeeId),
        assignments.rows,
        compliances.rows,
        engagements.rows,
      );
      const data = perf.map<Row>((p) => ({
        Employee: p.user.name,
        Designation: p.user.designation,
        Assigned: p.assigned,
        Completed: p.completed,
        'On Time': p.completedOnTime,
        Late: p.completedLate,
        Pending: p.pending,
        Overdue: p.overdue,
      }));
      return {
        columns: cols(['Employee', 'Designation', 'Assigned', 'Completed', 'On Time', 'Late', 'Pending', 'Overdue']),
        rows: data,
      };
    }

    if (report === 'Pending Work Report') {
      const dueOf = new Map<string, string | null>();
      compliances.rows.forEach((c) => dueOf.set(`compliance:${c.id}`, c.due_date));
      engagements.rows.forEach((e) => dueOf.set(`engagement:${e.id}`, e.deadline));
      const data = assignments.rows
        .filter((a) => a.status !== 'Completed' && (employeeId === '' || a.employee_id === employeeId))
        .map<Row>((a) => {
          const comp = a.reference_type === 'compliance' ? compliances.rows.find((c) => c.id === a.reference_id) : undefined;
          const eng = a.reference_type === 'engagement' ? engagements.rows.find((e) => e.id === a.reference_id) : undefined;
          const cid = comp?.client_id ?? eng?.client_id ?? '';
          return {
            Employee: users.nameOf(a.employee_id),
            Work: comp?.subcategory ?? eng?.audit_type ?? '—',
            Client: cid ? clientName(cid) : '—',
            Type: a.reference_type,
            Due: formatDate(dueOf.get(`${a.reference_type}:${a.reference_id}`) ?? null),
            _cid: cid,
          };
        })
        .filter((r) => passClient(String(r._cid)))
        .map(({ _cid, ...rest }) => {
          void _cid;
          return rest;
        });
      return { columns: cols(['Employee', 'Work', 'Client', 'Type', 'Due']), rows: data };
    }

    if (report === 'Overdue Report') {
      const overdueComp = compliances.rows
        .filter((c) => c.status !== 'Completed' && isOverdue(c.due_date) && passClient(c.client_id))
        .map<Row>((c: Compliance) => ({
          Client: clientName(c.client_id),
          Item: c.subcategory,
          Type: 'Compliance',
          Due: formatDate(c.due_date),
          Assignees: assignments.rows
            .filter((a) => a.reference_type === 'compliance' && a.reference_id === c.id)
            .map((a) => users.nameOf(a.employee_id))
            .join(', '),
        }));
      const overdueEng = engagements.rows
        .filter(
          (e) => e.stage !== 'Closed' && e.stage !== 'Report Issued' && isOverdue(e.deadline) && passClient(e.client_id),
        )
        .map<Row>((e: AuditEngagement) => ({
          Client: clientName(e.client_id),
          Item: e.audit_type,
          Type: 'Engagement',
          Due: formatDate(e.deadline),
          Assignees: e.assigned_employee ? users.nameOf(e.assigned_employee) : '—',
        }));
      return { columns: cols(['Client', 'Item', 'Type', 'Due', 'Assignees']), rows: [...overdueComp, ...overdueEng] };
    }

    // Client History Report
    const data = communications.rows
      .filter((l) => passClient(l.client_id) && passMonth(l.date))
      .map<Row>((l) => ({
        Client: clientName(l.client_id),
        Date: formatDate(l.date),
        Type: l.type,
        Discussion: l.discussion_notes,
        Decision: l.decision_taken,
        'Next Action': l.next_action,
        Responsible: l.responsible_person ? users.nameOf(l.responsible_person) : '—',
      }));
    return {
      columns: cols(['Client', 'Date', 'Type', 'Discussion', 'Decision', 'Next Action', 'Responsible']),
      rows: data,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, month, employeeId, clientId, status, compliances.rows, engagements.rows, assignments.rows, communications.rows, clients.rows, users]);

  const usesMonth = report === 'Compliance Report' || report === 'Client History Report';
  const usesEmployee = report === 'Employee Performance Report' || report === 'Pending Work Report';
  const usesStatus = report === 'Compliance Report';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Reports</h1>
        <p className="text-sm text-navy-400">Filter, preview and export to Excel or PDF.</p>
      </div>

      <div className="card space-y-3 p-4">
        <Field label="Report Type">
          <Select value={report} onChange={(v) => setReport(v as ReportType)} options={REPORT_TYPES} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {usesMonth && (
            <Field label="Month">
              <Select value={month} onChange={setMonth} options={MONTHS} allowEmpty="All months" />
            </Field>
          )}
          {usesEmployee && (
            <Field label="Employee">
              <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">All employees</option>
                {users.employees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Client">
            <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">All clients</option>
              {clients.rows.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.client_name}
                </option>
              ))}
            </select>
          </Field>
          {usesStatus && (
            <Field label="Status">
              <Select value={status} onChange={setStatus} options={COMPLIANCE_STATUSES} allowEmpty="All statuses" />
            </Field>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" disabled={rows.length === 0} onClick={() => exportToExcel(report, columns, rows)}>
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button className="btn-gold" disabled={rows.length === 0} onClick={() => exportToPDF(report, columns, rows)}>
            <FileDown size={16} /> PDF
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No data" description="No records match the selected filters." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
                {columns.map((c) => (
                  <th key={c.header} className="whitespace-nowrap px-3 py-2.5">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-navy-100 last:border-0">
                  {columns.map((c) => (
                    <td key={c.header} className="px-3 py-2.5 text-navy-700">
                      {c.value(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
