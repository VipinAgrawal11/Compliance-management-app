import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTable } from '@/hooks/useTable';
import { EmptyState } from '@/components/ui/Misc';
import { ComplianceStatusBadge, StageBadge, DocStatusBadge, CategoryBadge } from '@/components/ui/Badges';
import { SectionTitle } from '@/components/ui/Form';
import { ClientFormModal } from '@/components/clients/ClientForm';
import { ComplianceFormModal } from '@/components/compliance/ComplianceForm';
import { EngagementFormModal } from '@/components/audit/EngagementForm';
import { CommunicationLog } from '@/components/clients/CommunicationLog';
import { DocumentFormModal } from '@/components/documents/DocumentForm';
import { ClientsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { DocumentRequest } from '@/types';

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { clients, compliances, engagements } = useData();
  const documents = useTable<DocumentRequest>('documents');
  const [editClient, setEditClient] = useState(false);
  const [addCompliance, setAddCompliance] = useState(false);
  const [addEngagement, setAddEngagement] = useState(false);
  const [addDocument, setAddDocument] = useState(false);

  const isPartner = profile?.role === 'partner';
  const client = clients.rows.find((c) => c.id === id);

  const clientCompliances = useMemo(
    () => compliances.rows.filter((c) => c.client_id === id),
    [compliances.rows, id],
  );
  const clientEngagements = useMemo(
    () => engagements.rows.filter((e) => e.client_id === id),
    [engagements.rows, id],
  );
  const clientDocuments = useMemo(
    () => documents.rows.filter((d) => d.client_id === id),
    [documents.rows, id],
  );

  if (!client) {
    return (
      <div className="space-y-4">
        <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-navy-500">
          <ArrowLeft size={16} /> Back to clients
        </Link>
        <EmptyState title="Client not found" description="It may have been removed or you don't have access." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
        <ArrowLeft size={16} /> Back to clients
      </Link>

      {/* Header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy-800">{client.client_name}</h1>
            <p className="mt-0.5 text-sm text-navy-400">
              {client.entity_type} · {client.industry ?? 'Industry n/a'}
            </p>
          </div>
          {isPartner && (
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setEditClient(true)}>
                <Pencil size={16} /> Edit
              </button>
              <button
                className="btn-ghost text-red-600 hover:bg-red-50"
                onClick={async () => {
                  if (
                    confirm(
                      `Delete "${client.client_name}"? This also removes its compliances, engagements, documents and communication — this cannot be undone.`,
                    )
                  ) {
                    await ClientsApi.remove(client.id);
                    navigate('/clients');
                  }
                }}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm lg:grid-cols-3">
          <Info label="Tax" value={client.tax_type ? `${client.tax_type} · ${client.tax_number}` : '—'} />
          <Info label="Registration" value={client.registration_details || '—'} />
          <Info label="Location" value={client.location || '—'} />
          <Info label="Contact Person" value={client.contact_person || '—'} />
          <Info label="Contact Number" value={client.contact_number || '—'} />
          <Info label="Services" value={[...client.services, client.other_service].filter(Boolean).join(', ') || '—'} />
        </dl>
        {client.history_notes && (
          <div className="mt-4 rounded-lg bg-navy-50 p-3 text-sm text-navy-600">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-400">History / Notes</p>
            {client.history_notes}
          </div>
        )}
      </div>

      {/* Compliances */}
      <div className="card p-4">
        <SectionTitle
          action={
            isPartner && (
              <button className="text-sm font-semibold text-gold-600" onClick={() => setAddCompliance(true)}>
                <Plus size={14} className="inline" /> Add
              </button>
            )
          }
        >
          Compliances
        </SectionTitle>
        {clientCompliances.length === 0 ? (
          <p className="py-3 text-center text-sm text-navy-400">No compliance items.</p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {clientCompliances.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy-800">{c.subcategory}</p>
                  <p className="text-xs text-navy-400">Due {formatDate(c.due_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <CategoryBadge category={c.category} />
                  <ComplianceStatusBadge status={c.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Engagements */}
      <div className="card p-4">
        <SectionTitle
          action={
            isPartner && (
              <button className="text-sm font-semibold text-gold-600" onClick={() => setAddEngagement(true)}>
                <Plus size={14} className="inline" /> Add
              </button>
            )
          }
        >
          Audit Engagements
        </SectionTitle>
        {clientEngagements.length === 0 ? (
          <p className="py-3 text-center text-sm text-navy-400">No engagements.</p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {clientEngagements.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 py-2.5">
                <Link to={`/audits/${e.id}`} className="min-w-0 hover:text-gold-600">
                  <p className="truncate text-sm font-medium text-navy-800">{e.audit_type}</p>
                  <p className="text-xs text-navy-400">Deadline {formatDate(e.deadline)}</p>
                </Link>
                <StageBadge stage={e.stage} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Documents */}
      <div className="card p-4">
        <SectionTitle
          action={
            <button className="text-sm font-semibold text-gold-600" onClick={() => setAddDocument(true)}>
              <Plus size={14} className="inline" /> Add
            </button>
          }
        >
          Document Requests
        </SectionTitle>
        {clientDocuments.length === 0 ? (
          <p className="py-3 text-center text-sm text-navy-400">No document requests.</p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {clientDocuments.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 py-2.5">
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

      {/* Communication log */}
      <CommunicationLog clientId={client.id} />

      {/* Modals */}
      {editClient && <ClientFormModal client={client} onClose={() => setEditClient(false)} />}
      {addCompliance && (
        <ComplianceFormModal compliance={null} fixedClientId={client.id} onClose={() => setAddCompliance(false)} />
      )}
      {addEngagement && (
        <EngagementFormModal engagement={null} fixedClientId={client.id} onClose={() => setAddEngagement(false)} />
      )}
      {addDocument && (
        <DocumentFormModal document={null} fixedClientId={client.id} onClose={() => setAddDocument(false)} />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className="mt-0.5 text-navy-800">{value}</dd>
    </div>
  );
}
