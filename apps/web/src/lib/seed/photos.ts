import type { PrismaClient } from '@prisma/client';
import { allPhotos, type PropertyPhoto } from '@/lib/photos';

/**
 * Demo photography for the seeded properties. Licensed stock photographs (Unsplash licence)
 * standing in for the listing photographer's work; each carries a visible credit and is
 * replaced through the console once real photography is approved.
 */
const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
const ph = (id: string, caption: string, addedAt: string): PropertyPhoto => ({ url: U(id), caption, credit: 'Unsplash · demo photograph', addedAt, published: true });

export const DEMO_PHOTOS: Record<string, PropertyPhoto[]> = {
  'larkspur-residence': [
    ph('1600585154340-be6161a56a0c', 'Street elevation at dusk', '2026-08-20T18:00:00.000Z'),
    ph('1600607688969-a5bfcd646154', 'Rear terrace and lawn', '2026-08-20T18:01:00.000Z'),
    ph('1600607687939-ce8a6c25118c', 'Great room toward the kitchen', '2026-08-20T18:02:00.000Z'),
    ph('1600607686527-6fb886090705', 'Kitchen island and pantry wall', '2026-08-20T18:03:00.000Z'),
    ph('1600573472591-ee6b68d14c68', 'Primary suite toward the covered terrace', '2026-08-20T18:04:00.000Z'),
    ph('1600566752355-35792bedcfea', 'Primary bath', '2026-08-20T18:05:00.000Z'),
  ],
  'alder-ridge-house': [
    ph('1568605114967-8130f3a36994', 'Ridge elevation · construction nearing completion', '2026-09-01T18:00:00.000Z'),
  ],
};

/** Loads demo photography onto seeded properties that have none yet. Idempotent; never touches a property that already has photographs. */
export async function backfillDemoPhotos(db: PrismaClient): Promise<number> {
  let n = 0;
  for (const [slug, photos] of Object.entries(DEMO_PHOTOS)) {
    const p = await db.property.findUnique({ where: { slug }, select: { id: true, photosJson: true } });
    if (!p || allPhotos(p).length > 0) continue;
    await db.property.update({ where: { id: p.id }, data: { photosJson: JSON.stringify(photos) } });
    n++;
  }
  return n;
}
