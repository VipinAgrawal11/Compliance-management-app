/**
 * Dependency-free report export.
 *
 *  - Excel : an HTML-table workbook saved as `.xls` (opens natively in Excel /
 *            Google Sheets / LibreOffice). No SheetJS dependency required.
 *  - PDF   : a styled print window; the browser's "Save as PDF" produces the
 *            file. Works on desktop and mobile.
 */

export interface Column<T> {
  header: string;
  value: (row: T) => string | number;
}

function escapeHtml(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function tableHtml<T>(columns: Column<T>[], rows: T[]): string {
  const head = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('');
  const body = rows
    .map(
      (r) => `<tr>${columns.map((c) => `<td>${escapeHtml(c.value(r))}</td>`).join('')}</tr>`,
    )
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportToExcel<T>(title: string, columns: Column<T>[], rows: T[]): void {
  const html = `<html><head><meta charset="utf-8" /></head><body>${tableHtml(
    columns,
    rows,
  )}</body></html>`;
  download(`${title.replace(/\s+/g, '_')}_${stamp()}.xls`, html, 'application/vnd.ms-excel');
}

export function exportToPDF<T>(title: string, columns: Column<T>[], rows: T[]): void {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow pop-ups to export the PDF report.');
    return;
  }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      * { font-family: Inter, Arial, sans-serif; }
      h1 { color: #0f2747; font-size: 18px; }
      .meta { color: #456499; font-size: 12px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #0f2747; color: #fff; text-align: left; padding: 6px 8px; }
      td { border-bottom: 1px solid #d4def0; padding: 6px 8px; color: #0a1c34; }
      tr:nth-child(even) td { background: #f5f8fc; }
      @media print { @page { margin: 14mm; } }
    </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Generated ${new Date().toLocaleString()} &middot; ${rows.length} record(s)</div>
    ${tableHtml(columns, rows)}
    <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`);
  win.document.close();
}
