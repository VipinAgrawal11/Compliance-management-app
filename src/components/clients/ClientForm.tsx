import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { Field, Select, ChipMultiSelect } from '@/components/ui/Form';
import { Spinner } from '@/components/ui/Misc';
import { ClientsApi } from '@/lib/api';
import {
  ENTITY_TYPES,
  INDUSTRIES,
  TAX_TYPES,
  CLIENT_SERVICES,
  type Client,
  type EntityType,
  type IndustryType,
  type TaxType,
} from '@/types';

export function ClientFormModal({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const { profile } = useAuth();
  const editing = Boolean(client);
  const [name, setName] = useState(client?.client_name ?? '');
  const [entity, setEntity] = useState<EntityType>(client?.entity_type ?? 'Pvt Ltd');
  const [industry, setIndustry] = useState<string>(client?.industry ?? '');
  const [registration, setRegistration] = useState(client?.registration_details ?? '');
  const [taxType, setTaxType] = useState<string>(client?.tax_type ?? '');
  const [taxNumber, setTaxNumber] = useState(client?.tax_number ?? '');
  const [location, setLocation] = useState(client?.location ?? '');
  const [contactPerson, setContactPerson] = useState(client?.contact_person ?? '');
  const [contactNumber, setContactNumber] = useState(client?.contact_number ?? '');
  const [services, setServices] = useState<string[]>(client?.services ?? []);
  const [otherService, setOtherService] = useState(client?.other_service ?? '');
  const [history, setHistory] = useState(client?.history_notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || !profile) {
      setError('Client name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    const payload: Partial<Client> = {
      client_name: name.trim(),
      entity_type: entity,
      industry: (industry || null) as IndustryType | null,
      registration_details: registration,
      tax_type: (taxType || null) as TaxType | null,
      tax_number: taxNumber,
      location,
      contact_person: contactPerson,
      contact_number: contactNumber,
      services,
      other_service: otherService,
      history_notes: history,
    };
    try {
      if (editing && client) await ClientsApi.update(client.id, payload);
      else await ClientsApi.create(payload, profile.id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      size="lg"
      title={editing ? 'Edit Client' : 'Add Client'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-gold" onClick={save} disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />} {editing ? 'Save Changes' : 'Create Client'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Field label="Client Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Entity Type">
            <Select value={entity} onChange={(v) => setEntity(v as EntityType)} options={ENTITY_TYPES} />
          </Field>
          <Field label="Industry">
            <Select value={industry} onChange={setIndustry} options={INDUSTRIES} allowEmpty="Not set" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tax Type">
            <Select value={taxType} onChange={setTaxType} options={TAX_TYPES} allowEmpty="Not set" />
          </Field>
          <Field label="Tax Number">
            <input className="input" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
          </Field>
        </div>
        <Field label="Registration Details">
          <input className="input" value={registration} onChange={(e) => setRegistration(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Location">
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
          <Field label="Contact Person">
            <input className="input" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          </Field>
        </div>
        <Field label="Contact Number">
          <input className="input" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
        </Field>
        <Field label="Services">
          <ChipMultiSelect
            options={CLIENT_SERVICES.map((s) => ({ id: s, label: s }))}
            selected={services}
            onToggle={(id) =>
              setServices((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
            }
          />
        </Field>
        {services.includes('Others') && (
          <Field label="Other Service (specify)">
            <input className="input" value={otherService} onChange={(e) => setOtherService(e.target.value)} />
          </Field>
        )}
        <Field label="History / Notes">
          <textarea className="input min-h-[80px]" value={history} onChange={(e) => setHistory(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
