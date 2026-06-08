import { useRef, useState } from 'react';
import { Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Misc';
import { ClientsApi } from '@/lib/api';
import { clientTemplateCsv, parseClientsCsv, CLIENT_COLUMNS } from '@/lib/clientImport';
import type { Client } from '@/types';

export function ImportClientsModal({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Partial<Client>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);

  function downloadTemplate() {
    const blob = new Blob([clientTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const text = await file.text();
    const res = parseClientsCsv(text);
    setParsed(res.clients);
    setErrors(res.errors);
  }

  async function doImport() {
    if (!profile || parsed.length === 0) return;
    setBusy(true);
    let ok = 0;
    let failed = 0;
    for (const client of parsed) {
      try {
        await ClientsApi.create(client, profile.id);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    setBusy(false);
    setResult({ ok, failed });
  }

  return (
    <Modal
      open
      size="lg"
      title="Import Clients from Spreadsheet"
      onClose={onClose}
      footer={
        result ? (
          <button className="btn-gold" onClick={onClose}>
            Done
          </button>
        ) : (
          <>
            <button className="btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="btn-gold" onClick={doImport} disabled={busy || parsed.length === 0}>
              {busy && <Spinner className="h-4 w-4" />} Import {parsed.length || ''} client(s)
            </button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2 font-semibold text-green-700">
            <CheckCircle2 size={18} /> Imported {result.ok} client(s).
          </p>
          {result.failed > 0 && (
            <p className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={18} /> {result.failed} row(s) failed (possibly duplicates or invalid data).
            </p>
          )}
          <p className="text-navy-400">The client list will refresh automatically.</p>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          {/* Step 1 */}
          <div className="rounded-lg bg-navy-50 p-3">
            <p className="mb-2 font-semibold text-navy-800">1. Download the template & fill it in Excel</p>
            <button className="btn-ghost" onClick={downloadTemplate}>
              <Download size={16} /> Download CSV template
            </button>
            <p className="mt-2 text-xs text-navy-500">
              Columns: {CLIENT_COLUMNS.join(', ')}.<br />
              Separate multiple <strong>Services</strong> with a semicolon, e.g.{' '}
              <code className="rounded bg-white px-1">Audit;Internal Audit</code>. In Excel, fill your
              rows, then <strong>File → Save As → CSV</strong> before uploading. Delete the example row.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-lg bg-navy-50 p-3">
            <p className="mb-2 font-semibold text-navy-800">2. Upload the filled CSV</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-700 file:px-3 file:py-2 file:text-white"
            />
            {fileName && <p className="mt-1 text-xs text-navy-400">Loaded: {fileName}</p>}
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              <p className="mb-1 flex items-center gap-1 font-semibold">
                <AlertTriangle size={14} /> {errors.length} note(s):
              </p>
              <ul className="list-disc space-y-0.5 pl-4">
                {errors.slice(0, 8).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {errors.length > 8 && <li>…and {errors.length - 8} more.</li>}
              </ul>
            </div>
          )}

          {parsed.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-2 font-semibold text-navy-800">
                <Upload size={16} /> Preview — {parsed.length} client(s) ready
              </p>
              <div className="max-h-56 overflow-auto rounded-lg border border-navy-100">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-navy-50 text-left text-navy-500">
                    <tr>
                      <th className="px-2 py-1.5">Name</th>
                      <th className="px-2 py-1.5">Entity</th>
                      <th className="px-2 py-1.5">Tax</th>
                      <th className="px-2 py-1.5">Location</th>
                      <th className="px-2 py-1.5">Services</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((c, i) => (
                      <tr key={i} className="border-t border-navy-100">
                        <td className="px-2 py-1.5 font-medium text-navy-800">{c.client_name}</td>
                        <td className="px-2 py-1.5">{c.entity_type}</td>
                        <td className="px-2 py-1.5">{c.tax_type ? `${c.tax_type} ${c.tax_number ?? ''}` : '—'}</td>
                        <td className="px-2 py-1.5">{c.location || '—'}</td>
                        <td className="px-2 py-1.5">{(c.services ?? []).join(', ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
