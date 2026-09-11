const nfkc = (s: string) => s.normalize('NFKC');

/** Case-insensitive, whitespace-collapsed, trailing punctuation removed. */
export function normalizeString(raw: string): string {
  return nfkc(raw).trim().replace(/\s+/g, ' ').replace(/[.。!?]+$/u, '').trim().toLowerCase();
}

/** Canonical integer string or null. Accepts thousands separators and a leading sign. */
export function normalizeInteger(raw: string): string | null {
  const s = nfkc(raw).trim().replace(/[,\s_]/g, '').replace(/^\+/, '');
  if (!/^-?\d+$/.test(s)) return null;
  const neg = s.startsWith('-');
  const digits = s.replace('-', '').replace(/^0+(?=\d)/, '');
  return (neg && digits !== '0' ? '-' : '') + digits;
}

/** Canonical decimal string (no trailing zeros, no leading zeros) or null. */
export function normalizeDecimal(raw: string): string | null {
  let s = nfkc(raw).trim().replace(/[,\s_]/g, '').replace(/^\+/, '');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const neg = s.startsWith('-');
  s = s.replace('-', '');
  const [intPartRaw, fracRaw = ''] = s.split('.');
  let intPart = (intPartRaw ?? '').replace(/^0+(?=\d)/, '');
  if (intPart === '') intPart = '0';
  const frac = fracRaw.replace(/0+$/, '');
  const out = frac ? `${intPart}.${frac}` : intPart;
  return neg && out !== '0' ? `-${out}` : out;
}

/** Split a list answer on commas, semicolons, newlines, arrows, or '>' */
export function parseList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((v) => String(v));
  if (typeof raw !== 'string') return [];
  return raw
    .split(/[,;\n>→]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Parse "A→2, B→1" / "A=2; B=1" / "A: 2" / JSON object into a key→value map. */
export function parseAssignment(raw: unknown): Record<string, string> | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) out[normalizeString(k)] = normalizeString(String(v));
    return out;
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try { return parseAssignment(JSON.parse(trimmed)); } catch { return null; }
  }
  const out: Record<string, string> = {};
  for (const pair of trimmed.split(/[,;\n]+/u)) {
    if (!pair.trim()) continue;
    const m = pair.split(/\s*(?:→|->|=|:)\s*/u);
    if (m.length !== 2 || !m[0] || !m[1]) return null;
    out[normalizeString(m[0])] = normalizeString(m[1]);
  }
  return Object.keys(out).length ? out : null;
}

/** Parse an allocation "x1=40000, x3=60000" / JSON object into variable→number. */
export function parseAllocation(raw: unknown): Record<string, number> | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const n = normalizeDecimal(String(v));
      if (n === null) return null;
      out[normalizeString(k)] = Number(n);
    }
    return out;
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try { return parseAllocation(JSON.parse(trimmed)); } catch { return null; }
  }
  const out: Record<string, number> = {};
  for (const pair of trimmed.split(/[,;\n]+/u)) {
    if (!pair.trim()) continue;
    const m = pair.split(/\s*(?:→|->|=|:)\s*/u);
    if (m.length !== 2 || !m[0] || m[1] === undefined) return null;
    const n = normalizeDecimal(m[1]);
    if (n === null) return null;
    out[normalizeString(m[0])] = Number(n);
  }
  return Object.keys(out).length ? out : null;
}

export function roundTo(value: number, places: number): number {
  const f = 10 ** places;
  return Math.round((value + Number.EPSILON) * f) / f;
}
