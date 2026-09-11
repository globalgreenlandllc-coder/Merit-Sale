'use server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getSession } from '@/lib/auth/session';

/** Accommodation request (Rules 8.7). Never alters items, keys, or scoring. */
export async function requestAccommodationAction(formData: FormData) {
  const s = await getSession();
  const slug = String(formData.get('openSlug') ?? '');
  if (!s) redirect(`/sign-in?next=/account/opens/${slug}/accommodation`);
  const request = String(formData.get('request') ?? '').trim();
  const open = await db.meritOpen.findUnique({ where: { slug } });
  if (!open || request.length < 10) redirect(`/account/opens/${slug}/accommodation?error=incomplete`);
  const row = await db.accommodation.upsert({
    where: { userId_meritOpenId: { userId: s.userId, meritOpenId: open.id } },
    create: { userId: s.userId, meritOpenId: open.id, request },
    update: { request, status: 'requested', decision: null, decidedAt: null },
  });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'accommodation.request', objectType: 'Accommodation', objectId: row.id });
  redirect(`/account/opens/${slug}/accommodation?done=1`);
}
