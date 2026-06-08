import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTable } from '@/hooks/useTable';
import { EmptyState } from '@/components/ui/Misc';
import { DocStatusBadge } from '@/components/ui/Badges';
import { SearchInput, Select } from '@/components/ui/Form';
import { DocumentFormModal } from '@/components/documents/DocumentForm';
import { DocumentsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { DOCUMENT_STATUSES, type DocumentRequest, type DocumentStatus } from '@/types';

export function Documents() {
  const { profile } = useAuth();
  const { clients } = useData();
  const documents = useTable<DocumentRequest>('documents', { orderBy: 'deadline', ascending: true });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<DocumentRequest | null>(null);
  const [adding, setAdding] = useState(false);

  const isPartner = profile?.role === 'partner';
  const clientName = (id: string) => clients.rows.find((c) => c.id === id)?.client_name ?? '—';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.rows.filter((d) => {
      if (status && d.status !== status) return false;
      if (!q) return true;
      return d.document_name.toLowerCase().includes(q) || clientName(d.client_id).toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents.rows, query, status, clients.rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Documents</h1>
          <p className="text-sm text-navy-400">Request tracker — status only, no file storage.</p>
        </div>
        <button className="btn-gold" onClick={() => setAdding(true)}>
          <Plus size={18} /> Request
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={query} onChange={setQuery} placeholder="Search document or client…" />
        <Select value={status} onChange={setStatus} options={DOCUMENT_STATUSES} allowEmpty="All statuses" className="sm:w-48" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FileText size={32} />} title="No document requests" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-navy-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-800">{d.document_name}</td>
                  <td className="px-4 py-3">
                    <Link to={`/clients/${d.client_id}`} className="text-navy-600 hover:text-gold-600">
                      {clientName(d.client_id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-navy-600">{formatDate(d.deadline)}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-navy-200 bg-white px-2 py-1 text-xs font-semibold text-navy-700"
                      value={d.status}
                      onChange={(e) => void DocumentsApi.setStatus(d.id, e.target.value as DocumentStatus)}
                    >
                      {DOCUMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button className="text-xs font-semibold text-gold-600" onClick={() => setEditing(d)}>
                        Edit
                      </button>
                      {isPartner && (
                        <button
                          className="ml-2 text-navy-300 hover:text-red-500"
                          onClick={() => confirm('Delete this request?') && void DocumentsApi.remove(d.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-xs text-navy-400 lg:hidden">
        Showing {filtered.length} request(s). Tap a status to update; works offline.
      </p>

      {(adding || editing) && (
        <DocumentFormModal
          document={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {DOCUMENT_STATUSES.map((s) => (
          <DocStatusBadge key={s} status={s} />
        ))}
      </div>
    </div>
  );
}
