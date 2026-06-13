/**
 * Tiny RFC 4180-ish CSV parser tuned for bank exports.
 *
 * Features:
 * - Strips UTF-8 BOM.
 * - Auto-detects separator from `,`, `;`, or `\t` based on the header line.
 * - Honors quoted fields with escaped double-quotes (`""` → `"`).
 * - Tolerates `\r\n`, `\n`, `\r` line endings.
 */

export type CsvSeparator = ',' | ';' | '\t';

export interface ParsedCsv {
  separator: CsvSeparator;
  /** Raw header row, in source column order. */
  headers: string[];
  /** Each row: array of strings, same length and order as `headers`. */
  rows: string[][];
}

/** Strip the UTF-8 BOM (`\ufeff`) if present at the start of the string. */
export function stripBom(input: string): string {
  return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
}

/** Pick the most likely separator by counting candidates in the first non-empty line. */
export function detectSeparator(text: string): CsvSeparator {
  const head = stripBom(text).split(/\r\n|\n|\r/, 1)[0] ?? '';
  let inQuote = false;
  const counts: Record<CsvSeparator, number> = { ',': 0, ';': 0, '\t': 0 };
  for (let i = 0; i < head.length; i++) {
    const ch = head[i];
    if (ch === '"') inQuote = !inQuote;
    else if (!inQuote && (ch === ',' || ch === ';' || ch === '\t')) counts[ch]++;
  }
  if (counts[';'] > counts[','] && counts[';'] >= counts['\t']) return ';';
  if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t';
  return ',';
}

/** Parse CSV text into header + rows. Throws an Error with a 1-based line number on hard parse errors. */
export function parseCsv(input: string, separator?: CsvSeparator): ParsedCsv {
  const text = stripBom(input);
  const sep = separator ?? detectSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuote = false;
  let line = 1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        if (ch === '\n') line++;
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      if (field.length === 0) inQuote = true;
      else field += ch;
      continue;
    }
    if (ch === sep) {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      line++;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      line++;
      continue;
    }
    field += ch;
  }

  if (inQuote) {
    throw new Error(`Unterminated quoted field at line ${line}`);
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === '')) {
    rows.pop();
  }

  if (rows.length === 0) {
    return { separator: sep, headers: [], rows: [] };
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  const normalized = dataRows.map((r) => {
    if (r.length === headers.length) return r;
    if (r.length < headers.length) {
      const padded = r.slice();
      while (padded.length < headers.length) padded.push('');
      return padded;
    }
    return r.slice(0, headers.length);
  });

  return { separator: sep, headers, rows: normalized };
}

/** Build a header → column-index map for fast row lookups. */
export function indexOfHeaders(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, i) => map.set(h.trim(), i));
  return map;
}
