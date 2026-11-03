// CSV export for statements (Relevé). Semicolon-separated with a UTF-8 BOM so
// French Excel opens it with accents and columns intact.

export type CsvCell = string | number | null | undefined;

function cell(v: CsvCell): string {
  let s = v == null ? '' : String(v);
  // Text starting with = + - @ (or a tab/CR) would run as a formula in Excel;
  // a leading apostrophe makes it plain text. Numbers keep their sign.
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  return '﻿' + [header, ...rows].map(r => r.map(cell).join(';')).join('\r\n') + '\r\n';
}

export function csvBlob(header: string[], rows: CsvCell[][]): Blob {
  return new Blob([toCsv(header, rows)], { type: 'text/csv;charset=utf-8' });
}
