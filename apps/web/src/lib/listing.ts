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
