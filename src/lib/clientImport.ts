/**
 * Bulk client import from a spreadsheet (CSV — open & save from Excel).
 *
 * The template columns map 1:1 to the `clients` table. Multi-value "Services"
 * are separated by a semicolon inside the single cell so they don't clash with
 * the CSV comma.
 */
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

export const CLIENT_COLUMNS = [
  'Client Name',
  'Entity Type',
  'Industry',
  'Registration Details',
  'Tax Type',
  'Tax Number',
  'Location',
  'Contact Person',
  'Contact Number',
  'Services',
  'Other Service',
  'History Notes',
] as const;

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** A ready-to-fill template with one example row. */
export function clientTemplateCsv(): string {
  const header = CLIENT_COLUMNS.join(',');
  const example = [
    'Himalayan Foods Pvt Ltd',
    'Pvt Ltd',
    'Manufacturing',
    'Reg. No. 12345',
    'VAT',
    '600123456',
    'Kathmandu',
    'Hari Lama',
    '9801234567',
    'Audit;Accounting',
    '',
    'Example row — delete this line before importing',
  ]
    .map(csvCell)
    .join(',');
  return `${header}\n${example}\n`;
}

/** Minimal RFC-4180 CSV parser (handles quotes, commas and newlines in cells). */
function parseCsv(input: string): string[][] {
  const text = input.replace(/\r\n?/g, '\n');
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cur.push(field);
      field = '';
    } else if (ch === '\n') {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = '';
    } else {
      field += ch;
    }
  }
  cur.push(field);
  rows.push(cur);
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export interface ImportResult {
  clients: Partial<Client>[];
  errors: string[];
}

export function parseClientsCsv(textContent: string): ImportResult {
  const table = parseCsv(textContent);
  const errors: string[] = [];
  if (table.length === 0) return { clients: [], errors: ['The file is empty.'] };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name.toLowerCase());
  const c = {
    name: idx('Client Name'),
    entity: idx('Entity Type'),
    industry: idx('Industry'),
    reg: idx('Registration Details'),
    taxType: idx('Tax Type'),
    taxNo: idx('Tax Number'),
    loc: idx('Location'),
    person: idx('Contact Person'),
    number: idx('Contact Number'),
    services: idx('Services'),
    other: idx('Other Service'),
    history: idx('History Notes'),
  };
  if (c.name === -1) {
    return {
      clients: [],
      errors: ['Could not find a "Client Name" column. Please use the provided template.'],
    };
  }

  const clients: Partial<Client>[] = [];
  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    const get = (col: number) => (col >= 0 && col < row.length ? row[col].trim() : '');
    const name = get(c.name);
    if (!name) continue; // skip blank lines
    if (/^example row/i.test(get(c.history))) continue; // skip the sample line
    const line = r + 1;

    const entityRaw = get(c.entity);
    const entity = ENTITY_TYPES.find((e) => e.toLowerCase() === entityRaw.toLowerCase());
    if (entityRaw && !entity) errors.push(`Row ${line}: invalid Entity Type "${entityRaw}" (defaulted to Pvt Ltd).`);

    const industryRaw = get(c.industry);
    const industry = INDUSTRIES.find((e) => e.toLowerCase() === industryRaw.toLowerCase());
    if (industryRaw && !industry) errors.push(`Row ${line}: invalid Industry "${industryRaw}" (left blank).`);

    const taxRaw = get(c.taxType);
    const taxType = TAX_TYPES.find((e) => e.toLowerCase() === taxRaw.toLowerCase());
    if (taxRaw && !taxType) errors.push(`Row ${line}: invalid Tax Type "${taxRaw}" (left blank).`);

    const servicesRaw = get(c.services);
    const known: string[] = [];
    const extra: string[] = [];
    for (const s of servicesRaw.split(/[;,]/).map((x) => x.trim()).filter(Boolean)) {
      const match = CLIENT_SERVICES.find((k) => k.toLowerCase() === s.toLowerCase());
      if (match) known.push(match);
      else extra.push(s);
    }
    const other = [get(c.other), ...extra].filter(Boolean).join(', ');

    clients.push({
      client_name: name,
      entity_type: (entity ?? 'Pvt Ltd') as EntityType,
      industry: (industry ?? null) as IndustryType | null,
      registration_details: get(c.reg),
      tax_type: (taxType ?? null) as TaxType | null,
      tax_number: get(c.taxNo),
      location: get(c.loc),
      contact_person: get(c.person),
      contact_number: get(c.number),
      services: known,
      other_service: other,
      history_notes: get(c.history),
    });
  }

  if (clients.length === 0 && errors.length === 0) {
    errors.push('No client rows found. Fill in at least one row under the header.');
  }
  return { clients, errors };
}
