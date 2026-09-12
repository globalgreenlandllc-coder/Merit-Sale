export function money(cents: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (cents === null || cents === undefined) return '—';
  const dollars = cents / 100;
  if (opts.compact && dollars >= 1000) return `$${Math.round(dollars).toLocaleString('en-US')}`;
  return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: dollars % 1 === 0 ? 0 : 2 });
}

const TZ = 'America/Los_Angeles';

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: TZ });
}
/** A calendar date with no time (YYYY-MM-DD), formatted without any timezone shift. */
export function fmtDay(d: string | null | undefined): string {
  if (!d) return '—';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return d;
  return new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: TZ, timeZoneName: 'short' });
}
export function fmtTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ, timeZoneName: 'short' });
}
export function fmtDuration(seconds: number): string {
  if (seconds < 90) return `${seconds}s`;
  const m = Math.floor(seconds / 60), s = seconds % 60;
  if (m < 90) return s ? `${m}m ${s}s` : `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
export function shortHash(h: string | null | undefined, n = 10): string {
  return h ? `${h.slice(0, n)}…` : '—';
}
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}
export function sqft(n: number | null | undefined): string {
  return n ? `${n.toLocaleString('en-US')} sq ft` : '—';
}
export function roundLabel(number: string): string {
  if (number === 'r1') return 'Round 1 · Qualifier';
  if (number === 'r2') return 'Round 2';
  if (number === 'r3') return 'Round 3 · Proctored';
  if (number === 'final') return 'Final';
  if (number.startsWith('tiebreak')) return `Tie-break ${number.split('_')[1] ?? ''}`.trim();
  return number;
}
export function safeJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

const CERT_LABEL: Record<string, string> = { lock: 'Rules lock', r1_pass_list: 'Round 1 pass list', r2_advancement: 'Round 2 advancement', r3_advancement: 'Round 3 advancement', winner: 'Certified result', cancellation: 'Cancellation', release: 'Package release' };
/** Public label for a certification type; the enum value itself never reaches a page. */
export function certLabel(type: string): string {
  return CERT_LABEL[type] ?? type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
export function fmtDocket(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles', timeZoneName: 'short' });
}
