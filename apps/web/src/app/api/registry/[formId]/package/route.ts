import { db } from '@/lib/db';

/** Serves the exact released bytes so `shasum -a 256` reproduces the committed hash. */
export async function GET(_req: Request, { params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const form = await db.form.findUnique({ where: { id: formId }, include: { meritOpen: { select: { slug: true } } } });
  if (!form?.releasedPackage) return new Response('Not released', { status: 404 });
  return new Response(form.releasedPackage, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${form.meritOpen.slug}-${form.roundNumber}-${form.label}.json"`,
      'x-package-sha256': form.packageHash ?? '',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
