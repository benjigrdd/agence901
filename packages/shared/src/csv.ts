import Papa from 'papaparse';

/** Lecture CSV (RFC 4180, papaparse) : separateur `;`, `,` ou tabulation detecte, BOM, fins de ligne Windows. */
export type CsvTable = { headers: string[]; rows: Record<string, string>[] };

export type CsvEncoding = 'utf-8' | 'windows-1252';

export function detectDelimiter(firstLine: string): ';' | ',' | '\t' {
  const counts = { ';': 0, ',': 0, '\t': 0 };
  let quoted = false;
  for (const c of firstLine) {
    if (c === '"') quoted = !quoted;
    else if (!quoted && (c === ';' || c === ',' || c === '\t')) counts[c] += 1;
  }
  return counts[';'] >= counts[','] && counts[';'] >= counts['\t']
    ? ';'
    : counts[','] >= counts['\t']
      ? ','
      : '\t';
}

/**
 * Decode un fichier CSV : UTF-8 s'il est valide, sinon Windows-1252 (export Excel « CSV (separateur :
 * point-virgule) »). L'appelant previent l'utilisateur dans le second cas.
 */
export function decodeCsvBytes(bytes: Uint8Array): { text: string; encoding: CsvEncoding } {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'windows-1252' };
  }
}

export function parseCsv(text: string): CsvTable {
  const input = text.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(input.split(/\r?\n/, 1)[0] ?? '');
  const { data } = Papa.parse<string[]>(input, { delimiter, skipEmptyLines: 'greedy' });
  const headers = (data[0] ?? []).map((h) => h.trim());
  const rows = data
    .slice(1)
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
  return { headers, rows };
}

/** Normalise un nom de colonne pour la correspondance automatique (« Latitude (WGS84) » → `latitude`). */
export function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Premiere colonne dont le nom normalise figure parmi les alias. */
export function findColumn(headers: readonly string[], aliases: readonly string[]): string | null {
  return headers.find((h) => aliases.includes(normalizeHeader(h))) ?? null;
}

/** Cellule CSV sure : guillemets si necessaire, neutralisation des formules (=, +, -, @). */
export function csvCell(value: unknown): string {
  const s =
    value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV lisible par Excel (BOM UTF-8, point-virgule, fins de ligne Windows). */
export function toCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return `\uFEFF${[headers.map(csvCell).join(';'), ...rows.map((r) => r.map(csvCell).join(';'))].join('\r\n')}\r\n`;
}
