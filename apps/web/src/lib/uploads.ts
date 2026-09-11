import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve, sep } from 'node:path';

/**
 * Photography storage. With BLOB_READ_WRITE_TOKEN set (Vercel Blob) files go to object
 * storage and get absolute URLs; otherwise they live under UPLOADS_DIR (default ./uploads,
 * outside `public`) and are served by /api/uploads. The filesystem on Vercel is read-only.
 */
export function uploadsRoot(): string {
  return resolve(process.env.UPLOADS_DIR ?? resolve(process.cwd(), 'uploads'));
}

export const usingBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function storePhoto(propertyId: string, name: string, bytes: Buffer, contentType: string): Promise<string> {
  if (usingBlob()) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`properties/${propertyId}/${name}`, bytes, { access: 'public', contentType, addRandomSuffix: false });
    return blob.url;
  }
  const dir = join(uploadsRoot(), propertyId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), bytes);
  return `/api/uploads/${propertyId}/${name}`;
}

/** Removes a stored photo. Local paths are confined to the property's folder; blob URLs must be blob URLs. */
export async function removePhoto(propertyId: string, url: string): Promise<void> {
  if (url.startsWith('https://') && url.includes('.blob.vercel-storage.com/')) {
    if (!usingBlob()) return;
    const { del } = await import('@vercel/blob');
    await del(url).catch(() => undefined);
    return;
  }
  const base = resolve(uploadsRoot(), propertyId);
  const target = resolve(base, basename(url));
  if (!target.startsWith(base + sep)) return;
  await unlink(target).catch(() => undefined);
}
