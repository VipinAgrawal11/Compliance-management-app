import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, MapPin, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { EmptyState } from '@/components/ui/Misc';
import { Pill } from '@/components/ui/Badges';
import { SearchInput, Select } from '@/components/ui/Form';
import { ClientFormModal } from '@/components/clients/ClientForm';
import { ENTITY_TYPES, type Client } from '@/types';

export function Clients() {
  const { profile } = useAuth();
  const { clients } = useData();
  const [query, setQuery] = useState('');
  const [entity, setEntity] = useState('');
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);

  const isPartner = profile?.role === 'partner';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.rows.filter((c) => {
      if (entity && c.entity_type !== entity) return false;
      if (!q) return true;
      return (
        c.client_name.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.contact_person.toLowerCase().includes(q) ||
        c.tax_number.toLowerCase().includes(q)
      );
    });
  }, [clients.rows, query, entity]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Clients</h1>
          <p className="text-sm text-navy-400">{clients.rows.length} client(s) on file.</p>
        </div>
        {isPartner && (
          <button className="btn-gold" onClick={() => setCreating(true)}>
            <Plus size={18} /> Add Client
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, location, tax no…" />
        <Select value={entity} onChange={setEntity} options={ENTITY_TYPES} allowEmpty="All entity types" className="sm:w-52" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 size={32} />}
          title="No clients found"
          description={isPartner ? 'Add your first client to get started.' : 'No clients are assigned to you yet.'}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} to={`/clients/${c.id}`} className="card p-4 transition hover:border-gold-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-navy-800">{c.client_name}</h3>
                <Pill className="bg-navy-100 text-navy-700">{c.entity_type}</Pill>
              </div>
              <p className="mt-1 text-xs text-navy-400">
                {c.industry ?? 'Industry n/a'} · {c.tax_type ? `${c.tax_type} ${c.tax_number}` : 'No tax id'}
              </p>
              <div className="mt-3 space-y-1 text-sm text-navy-600">
                {c.location && (
                  <p className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-navy-400" /> {c.location}
                  </p>
                )}
                {c.contact_number && (
                  <p className="flex items-center gap-1.5">
                    <Phone size={14} className="text-navy-400" /> {c.contact_person} · {c.contact_number}
                  </p>
                )}
              </div>
              {c.services.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.services.slice(0, 4).map((s) => (
                    <span key={s} className="rounded bg-gold-50 px-1.5 py-0.5 text-[11px] font-medium text-gold-700">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ClientFormModal
          client={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
