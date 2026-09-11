import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { uploadsRoot } from '@/lib/uploads';

const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' };

/** Serves uploaded photography from the uploads root; the path is confined to that root. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const root = uploadsRoot();
  const target = resolve(root, ...path.map((p) => p.replace(/[^a-z0-9._-]/gi, '')));
  if (!target.startsWith(root + sep)) return new Response('Not found', { status: 404 });
  const type = TYPES[extname(target).toLowerCase()];
  if (!type) return new Response('Not found', { status: 404 });
  try {
    const [bytes, info] = await Promise.all([readFile(target), stat(target)]);
    return new Response(bytes, { headers: { 'content-type': type, 'content-length': String(info.size), 'cache-control': 'public, max-age=31536000, immutable' } });
  } catch { return new Response('Not found', { status: 404 }); }
}
