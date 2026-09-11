import 'server-only';
import { db } from '@/lib/db';

/** Listing number the way an MLS number sits on a listing sheet: ETK-<year>-<sequence within year>. */
export async function listingNumber(open: { id: string; createdAt: Date }): Promise<string> {
  const year = open.createdAt.getUTCFullYear();
  const before = await db.meritOpen.count({ where: { createdAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: open.createdAt } } });
  return `ETK-${year}-${String(before + 1).padStart(3, '0')}`;
}

export function haversineMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.7613; const dLat = ((bLat - aLat) * Math.PI) / 180; const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** UTC instant for a wall-clock time in a timezone (DST-safe via two-pass offset). */
export function zoned(y: number, m: number, d: number, h: number, tz: string): Date {
  const guess = Date.UTC(y, m, d, h);
  const offsetAt = (t: number) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(t)).map((x) => [x.type, x.value])); return Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!) - t; };
  const first = guess - offsetAt(guess);
  return new Date(guess - offsetAt(first));
}

function dayParts(d: Date, tz: string) { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d).map((x) => [x.type, x.value])); return { y: +p.year!, m: +p.month! - 1, d: +p.day! }; }

export interface ProposedSchedule { r1: [Date, Date]; r2: [Date, Date]; r3: Date; final: Date; tiebreak1: Date; tiebreak2: Date }

/**
 * Proposes round times from the registration close, at sane wall-clock hours:
 * R1 window opens two days after close (9:00) for two days (to 21:00); R2 four days later;
 * R3 on the second Saturday after R2 at 10:00; the Final a week later at 9:00; tie-breaks 4h and 6h after.
 */
export function proposeSchedule(closeAt: Date, tz = 'America/Los_Angeles'): ProposedSchedule {
  const { y, m, d } = dayParts(closeAt, tz);
  const at = (offsetDays: number, hour: number) => zoned(y, m, d + offsetDays, hour, tz);
  const r3Day = (() => { for (let k = 14; k < 21; k++) if (zoned(y, m, d + k, 12, tz).getUTCDay() === 6) return k; return 14; })();
  const finalAt = at(r3Day + 7, 9);
  return { r1: [at(2, 9), at(4, 21)], r2: [at(6, 9), at(8, 21)], r3: at(r3Day, 10), final: finalAt, tiebreak1: new Date(finalAt.getTime() + 4 * 3600e3), tiebreak2: new Date(finalAt.getTime() + 6 * 3600e3) };
}
