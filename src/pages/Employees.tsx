import { useMemo, useState } from 'react';
import { UserPlus, Pencil, UserX, UserCheck } from 'lucide-react';
import { useData, useFirmSettings } from '@/contexts/DataContext';
import { Modal } from '@/components/ui/Modal';
import { Field, Select, SectionTitle } from '@/components/ui/Form';
import { Avatar, Spinner, EmptyState } from '@/components/ui/Misc';
import { Pill } from '@/components/ui/Badges';
import { UsersApi } from '@/lib/api';
import { employeePerformance } from '@/lib/selectors';
import type { AppUser } from '@/types';

export function Employees() {
  const { users, assignments, compliances, engagements } = useData();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);

  const perf = useMemo(
    () => employeePerformance(users.employees, assignments.rows, compliances.rows, engagements.rows),
    [users.employees, assignments.rows, compliances.rows, engagements.rows],
  );
  const statsById = new Map(perf.map((p) => [p.user.id, p]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Employees</h1>
          <p className="text-sm text-navy-400">Manage staff, designations and allocation.</p>
        </div>
        <button className="btn-gold" onClick={() => setAdding(true)}>
          <UserPlus size={18} /> Add Employee
        </button>
      </div>

      {/* Partners */}
      <div className="card p-4">
        <SectionTitle>Partners</SectionTitle>
        <ul className="divide-y divide-navy-100">
          {users.partners.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2.5">
              <Avatar name={u.name} size={36} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-navy-800">{u.name}</p>
                <p className="text-xs text-navy-400">{u.designation}</p>
              </div>
              <Pill className="bg-gold-100 text-gold-700">Partner</Pill>
            </li>
          ))}
        </ul>
      </div>

      {/* Employees + allocation */}
      <div className="card p-4">
        <SectionTitle>Staff Allocation</SectionTitle>
        {users.employees.length === 0 ? (
          <EmptyState title="No employees yet" description="Add your first employee to start assigning work." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                  <th className="py-2 pr-3">Employee</th>
                  <th className="px-2">Assigned</th>
                  <th className="px-2">On&nbsp;Time</th>
                  <th className="px-2">Late</th>
                  <th className="px-2">Pending</th>
                  <th className="px-2">Overdue</th>
                  <th className="px-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.employees.map((u) => {
                  const s = statsById.get(u.id);
                  return (
                    <tr key={u.id} className="border-t border-navy-100">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={u.name} size={30} />
                          <div>
                            <p className={`font-medium ${u.active ? 'text-navy-800' : 'text-navy-400 line-through'}`}>
                              {u.name}
                            </p>
                            <p className="text-xs text-navy-400">{u.designation}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2">{s?.assigned ?? 0}</td>
                      <td className="px-2 text-green-700">{s?.completedOnTime ?? 0}</td>
                      <td className="px-2 text-orange-600">{s?.completedLate ?? 0}</td>
                      <td className="px-2 text-gold-700">{s?.pending ?? 0}</td>
                      <td className="px-2 text-red-600">{s?.overdue ?? 0}</td>
                      <td className="px-2">
                        <div className="flex justify-end gap-1">
                          <button className="rounded p-1.5 text-navy-400 hover:bg-navy-100" onClick={() => setEditing(u)} title="Edit">
                            <Pencil size={15} />
                          </button>
                          {u.active ? (
                            <button
                              className="rounded p-1.5 text-navy-400 hover:bg-red-50 hover:text-red-500"
                              title="Deactivate"
                              onClick={() => confirm(`Deactivate ${u.name}?`) && void UsersApi.deactivate(u.id)}
                            >
                              <UserX size={15} />
                            </button>
                          ) : (
                            <button
                              className="rounded p-1.5 text-navy-400 hover:bg-green-50 hover:text-green-600"
                              title="Reactivate"
                              onClick={() => void UsersApi.reactivate(u.id)}
                            >
                              <UserCheck size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && <AddEmployeeModal onClose={() => setAdding(false)} />}
      {editing && <EditEmployeeModal user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// --------------------------------------------------------------------------- //

function AddEmployeeModal({ onClose }: { onClose: () => void }) {
  const settings = useFirmSettings();
  const designations = settings?.designations ?? ['Audit Associate'];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState(designations[0] ?? 'Audit Associate');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function save() {
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Name, email and a password of at least 6 characters are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await UsersApi.addEmployee({ name: name.trim(), email: email.trim(), designation, password });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title="Add Employee"
      onClose={onClose}
      footer={
        done ? (
          <button className="btn-gold" onClick={onClose}>
            Done
          </button>
        ) : (
          <>
            <button className="btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="btn-gold" onClick={save} disabled={busy}>
              {busy && <Spinner className="h-4 w-4" />} Create Account
            </button>
          </>
        )
      }
    >
      {done ? (
        <div className="space-y-2 text-sm text-navy-700">
          <p className="font-semibold text-green-700">Employee account created.</p>
          <p>
            Share these credentials with <strong>{name}</strong>:
          </p>
          <div className="rounded-lg bg-navy-50 p-3 font-mono text-xs">
            <p>Email: {email}</p>
            <p>Password: {password}</p>
          </div>
          <p className="text-xs text-navy-400">
            If e-mail confirmation is enabled in Supabase, the employee must confirm before first login.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Field label="Full Name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Designation">
            <Select value={designation} onChange={setDesignation} options={designations} />
          </Field>
          <Field label="Temporary Password" hint="At least 6 characters. The employee can change it later.">
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

function EditEmployeeModal({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const settings = useFirmSettings();
  const designations = settings?.designations ?? [user.designation];
  const [name, setName] = useState(user.name);
  const [designation, setDesignation] = useState(user.designation);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await UsersApi.update(user.id, { name: name.trim(), designation });
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const options = designations.includes(designation) ? designations : [designation, ...designations];

  return (
    <Modal
      open
      title="Edit Employee"
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
        <Field label="Full Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Designation">
          <Select value={designation} onChange={setDesignation} options={options} />
        </Field>
      </div>
    </Modal>
  );
}
