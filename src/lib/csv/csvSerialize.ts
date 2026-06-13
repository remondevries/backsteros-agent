/**
 * Serialize rows to RFC 4180 CSV. Always writes:
 * - LF line endings,
 * - quotes around any field containing a separator, quote, CR, LF, or leading/trailing whitespace,
 * - escaped double-quotes (`"` → `""`).
 */

const NEEDS_QUOTING = /[",\r\n;\t]|^\s|\s$/;

function quoteField(value: string): string {
  if (value === '') return '';
  if (!NEEDS_QUOTING.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export function serializeCsv(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string>>,
): string {
  const lines: string[] = [];
  lines.push(headers.map(quoteField).join(','));
  for (const row of rows) {
    lines.push(row.map(quoteField).join(','));
  }
  return lines.join('\n') + '\n';
}
