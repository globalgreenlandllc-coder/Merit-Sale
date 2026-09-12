import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { assertRole, Forbidden } from '@/lib/auth/guards';
import { safeJson } from '@/lib/format';
import { removePhoto, storePhoto } from '@/lib/uploads';

import { allPhotos, type PropertyPhoto } from '@/lib/photos';
export type { PropertyPhoto } from '@/lib/photos';

const ALLOWED = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/avif', 'avif']]);
const MAX_BYTES = 12 * 1024 * 1024;

/** Route handlers must answer 403, not 500, when the realm guard rejects. */
function guarded<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T) => { try { return await fn(...args); } catch (e) { if (e instanceof Forbidden) return Response.json({ error: e.message }, { status: 403 }); throw e; } };
}

async function photosOf(id: string) {
  const p = await db.property.findUnique({ where: { id }, select: { photosJson: true } });
  if (!p) return null;
  return allPhotos(p);
}

/** Admin uploads property photography (multipart). Stored in Vercel Blob or under UPLOADS_DIR; never in `public`. */
export const POST = guarded(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await assertRole(['admin']);
  const { id } = await params;
  const existing = await photosOf(id);
  if (!existing) return Response.json({ error: 'Property not found' }, { status: 404 });
  const form = await req.formData();
  const caption = String(form.get('caption') ?? '').slice(0, 200);
  const credit = String(form.get('credit') ?? '').slice(0, 120);
  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return Response.json({ error: 'No files' }, { status: 400 });
  for (const f of files) {
    if (!ALLOWED.has(f.type)) return Response.json({ error: `Unsupported type ${f.type}` }, { status: 415 });
    if (f.size > MAX_BYTES) return Response.json({ error: `${f.name} exceeds 12 MB` }, { status: 413 });
  }
  const added: PropertyPhoto[] = [];
  for (const [i, f] of files.entries()) {
    const stem = f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase().slice(0, 40) || 'photo';
    const name = `${Date.now().toString(36)}-${i}-${randomBytes(3).toString('hex')}-${stem}.${ALLOWED.get(f.type)}`;
    const bytes = Buffer.from(await f.arrayBuffer());
    const url = await storePhoto(id, name, bytes, f.type);
    added.push({ url, caption, credit, addedAt: new Date().toISOString(), published: false, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const next = await db.$transaction(async (tx) => {
    const cur = safeJson<PropertyPhoto[]>((await tx.property.findUniqueOrThrow({ where: { id }, select: { photosJson: true } })).photosJson, []);
    const merged = [...cur, ...added];
    await tx.property.update({ where: { id }, data: { photosJson: JSON.stringify(merged) } });
    return merged;
  });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'property.photos.add', objectType: 'Property', objectId: id, detail: { added: added.map((a) => ({ url: a.url, sha256: a.sha256 })) } });
  return Response.json({ photos: next });
});

const PatchBody = z.object({ url: z.string().min(1), caption: z.string().max(200).optional(), credit: z.string().max(120).optional(), moveTo: z.number().int().min(0).optional(), published: z.boolean().optional() });

/** Update caption/credit, publish/unpublish (counsel gate), or reorder. */
export const PATCH = guarded(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await assertRole(['admin']);
  const { id } = await params;
  const existing = await photosOf(id);
  if (!existing) return Response.json({ error: 'Property not found' }, { status: 404 });
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Bad request' }, { status: 400 });
  const body = parsed.data;
  const idx = existing.findIndex((p) => p.url === body.url);
  if (idx < 0) return Response.json({ error: 'Photo not found' }, { status: 404 });
  const photo = { ...existing[idx]!, caption: body.caption ?? existing[idx]!.caption, credit: body.credit ?? existing[idx]!.credit, published: body.published ?? existing[idx]!.published };
  const next = existing.filter((_, i) => i !== idx);
  next.splice(body.moveTo !== undefined ? Math.min(next.length, body.moveTo) : idx, 0, photo);
  await db.property.update({ where: { id }, data: { photosJson: JSON.stringify(next) } });
  await audit({ actorId: s.userId, actorRole: s.role, action: body.published !== undefined ? (body.published ? 'property.photos.publish' : 'property.photos.unpublish') : 'property.photos.update', objectType: 'Property', objectId: id, detail: { url: body.url } });
  return Response.json({ photos: next });
});

export const DELETE = guarded(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await assertRole(['admin']);
  const { id } = await params;
  const existing = await photosOf(id);
  if (!existing) return Response.json({ error: 'Property not found' }, { status: 404 });
  const parsed = z.object({ url: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Bad request' }, { status: 400 });
  const { url } = parsed.data;
  if (!existing.some((p) => p.url === url)) return Response.json({ error: 'Photo not found' }, { status: 404 });
  await removePhoto(id, url);
  const next = existing.filter((p) => p.url !== url);
  await db.property.update({ where: { id }, data: { photosJson: JSON.stringify(next) } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'property.photos.remove', objectType: 'Property', objectId: id, detail: { url } });
  return Response.json({ photos: next });
});
