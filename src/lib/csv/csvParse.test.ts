import { describe, expect, test } from 'bun:test';
import { detectSeparator, parseCsv, stripBom } from '../csv/csvParse';

describe('financials/csvParse', () => {
  test('strips UTF-8 BOM', () => {
    expect(stripBom('\ufeffhello')).toBe('hello');
    expect(stripBom('hello')).toBe('hello');
  });

  test('auto-detects semicolon separator', () => {
    const text = 'date;amount\n2026-05-01;10';
    expect(detectSeparator(text)).toBe(';');
    const parsed = parseCsv(text);
    expect(parsed.headers).toEqual(['date', 'amount']);
    expect(parsed.rows).toEqual([['2026-05-01', '10']]);
  });

  test('handles quoted fields with embedded commas', () => {
    const text = 'date,description\n2026-05-01,"Hello, world"';
    const parsed = parseCsv(text);
    expect(parsed.rows[0]).toEqual(['2026-05-01', 'Hello, world']);
  });

  test('handles escaped double-quotes in quoted fields', () => {
    const text = 'a,b\n1,"He said ""hi"""';
    const parsed = parseCsv(text);
    expect(parsed.rows[0]).toEqual(['1', 'He said "hi"']);
  });

  test('throws on unterminated quoted field with line number', () => {
    expect(() => parseCsv('a,b\n"oops')).toThrow(/line/);
  });

  test('pads short rows to header length', () => {
    const parsed = parseCsv('a,b,c\n1,2');
    expect(parsed.rows[0]).toEqual(['1', '2', '']);
  });
});
