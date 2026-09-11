'use server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { createSession, destroySession, getSession } from '@/lib/auth/session';
import { sendNotice } from '@/lib/providers/notify';
import { getOpenBySlug } from '@/modules/meritopens/queries';

function safeNext(v: FormDataEntryValue | null, fallback = '/account') {
  const s = typeof v === 'string' ? v : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : fallback;
}

/** Local provider sign-in: an existing user by email, or a new registrant. */
export async function signInLocal(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const next = safeNext(formData.get('next'));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect(`/sign-in?error=email&next=${encodeURIComponent(next)}`);
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({ data: { email, role: 'registrant' } });
    await audit({ actorId: user.id, actorRole: 'registrant', action: 'account.create', objectType: 'User', objectId: user.id });
  }
  await createSession(user);
  await audit({ actorId: user.id, actorRole: user.role, action: 'session.create', objectType: 'User', objectId: user.id });
  const home = user.role === 'admin' ? '/admin' : user.role === 'administrator' ? '/administrator' : user.role === 'auditor' ? '/auditor' : user.role === 'item_author' ? '/admin/opens' : next;
  redirect(next !== '/account' ? next : home);
}

export async function signOut() {
  await destroySession();
  redirect('/');
}

export async function updateProfile(formData: FormData) {
  const s = await getSession();
  if (!s) redirect('/sign-in');
  const next = safeNext(formData.get('next'));
  const dobRaw = String(formData.get('dob') ?? '');
  const data = {
    legalName: String(formData.get('legalName') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    dob: dobRaw ? new Date(dobRaw) : null,
    residenceState: String(formData.get('residenceState') ?? '').trim().toUpperCase() || null,
    residenceAddress: String(formData.get('residenceAddress') ?? '').trim() || null,
  };
  const before = await db.user.findUnique({ where: { id: s.userId } });
  const user = await db.user.update({ where: { id: s.userId }, data });
  // light verification for the reservation phase: email + phone + DOB + state present
  if (user.idvStatus === 'none' && user.phone && user.dob && user.residenceState) {
    await db.user.update({ where: { id: user.id }, data: { idvStatus: 'verified', idvLevel: 'light', idvVerifiedAt: new Date(), idvVendorRef: 'light_self_attested' } });
  }
  await audit({ actorId: s.userId, actorRole: s.role, action: 'account.update', objectType: 'User', objectId: s.userId, before: { legalName: before?.legalName, residenceState: before?.residenceState }, after: { legalName: data.legalName, residenceState: data.residenceState } });
  redirect(next);
}

/** Free, non-binding reservation (spec §4.1). */
export async function reserveAction(formData: FormData) {
  const s = await getSession();
  const slug = String(formData.get('openSlug') ?? '');
  if (!s) redirect(`/sign-in?next=${encodeURIComponent(`/opens/${slug}/reserve`)}`);
  const open = await getOpenBySlug(slug);
  if (!open) redirect('/opens');
  if (open.status !== 'reservation') redirect(`/opens/${slug}?error=reservation_closed`);
  const user = await db.user.findUnique({ where: { id: s.userId } });
  if (!user?.phone || !user.dob || !user.residenceState) redirect(`/account/profile?next=${encodeURIComponent(`/opens/${slug}/reserve`)}&reason=light_verification`);
  const existing = await db.reservation.findUnique({ where: { userId_meritOpenId: { userId: s.userId, meritOpenId: open.id } } });
  if (!existing) {
    const r = await db.reservation.create({ data: { userId: s.userId, meritOpenId: open.id, verified: user.idvStatus === 'verified' } });
    await audit({ actorId: s.userId, actorRole: s.role, action: 'reservation.create', objectType: 'Reservation', objectId: r.id });
    await sendNotice({ userId: s.userId, meritOpenId: open.id, kind: 'schedule', subject: `You are on the list for ${open.name}`, body: `This reservation is free and non-binding. Nothing is awarded at this stage. Paid registration opens only after the platform owns the home; as a reservation holder you will get a ${open.firstAccessHours}-hour first-access window before general opening.` });
  }
  redirect(`/opens/${slug}/reserve?done=1`);
}
