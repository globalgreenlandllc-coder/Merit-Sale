'use server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { getSession } from '@/lib/auth/session';
import { getIdentityProvider } from '@/lib/providers/identity';
import { getPaymentProvider } from '@/lib/providers/payments';
import { getOpenBySlug, latestRuleset } from '@/modules/meritopens/queries';
import { checkEligibility, registrationWindow, settleRegistration } from './service';

async function ctx(formData: FormData) {
  const s = await getSession();
  const slug = String(formData.get('openSlug') ?? '');
  if (!s) redirect(`/sign-in?next=${encodeURIComponent(`/opens/${slug}/register`)}`);
  const open = await getOpenBySlug(slug);
  if (!open) redirect('/opens');
  const user = await db.user.findUniqueOrThrow({ where: { id: s.userId } });
  return { s, slug, open, user };
}

/** Step 1: eligibility pre-check → pending registration with a frozen snapshot. */
export async function beginRegistration(formData: FormData) {
  const { s, slug, open, user } = await ctx(formData);
  const hasReservation = !!(await db.reservation.findUnique({ where: { userId_meritOpenId: { userId: user.id, meritOpenId: open.id } } }));
  const win = registrationWindow(open, hasReservation);
  if (!win.open) redirect(`/opens/${slug}/register?blocked=${encodeURIComponent(win.reason ?? 'closed')}`);
  const elig = await checkEligibility(user, open);
  if (!elig.ok) redirect(`/opens/${slug}/register?step=eligibility&reasons=${encodeURIComponent(elig.reasons.join('|'))}`);
  const reg = await db.registration.upsert({
    where: { userId_meritOpenId: { userId: user.id, meritOpenId: open.id } },
    create: { userId: user.id, meritOpenId: open.id, status: 'pending', eligibilitySnapshotJson: JSON.stringify(elig.snapshot) },
    update: { eligibilitySnapshotJson: JSON.stringify(elig.snapshot) },
  });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'registration.begin', objectType: 'Registration', objectId: reg.id, detail: elig.snapshot });
  redirect(`/opens/${slug}/register?step=identity`);
}

/** Step 2: full identity verification via vendor. Vendor reference only; no images stored. */
export async function completeIdentity(formData: FormData) {
  const { s, slug, user } = await ctx(formData);
  const legalName = String(formData.get('legalName') ?? '').trim();
  const dobRaw = String(formData.get('dob') ?? '');
  const residenceState = String(formData.get('residenceState') ?? '').trim().toUpperCase();
  const residenceAddress = String(formData.get('residenceAddress') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  if (!legalName || !dobRaw || !residenceState || !residenceAddress || formData.get('biometricConsent') !== 'on') redirect(`/opens/${slug}/register?step=identity&error=incomplete`);
  const dob = new Date(dobRaw);
  await db.user.update({ where: { id: user.id }, data: { legalName, dob, residenceState, residenceAddress, phone: phone || user.phone } });
  const r = await getIdentityProvider().verify({ userId: user.id, level: 'full', legalName, dob, state: residenceState });
  await db.user.update({ where: { id: user.id }, data: { idvVendorRef: r.vendorRef, idvStatus: r.status, idvLevel: 'full', idvVerifiedAt: r.status === 'verified' ? new Date() : null } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'identity.verify', objectType: 'User', objectId: user.id, after: { vendorRef: r.vendorRef, status: r.status, level: 'full' } });
  if (r.status !== 'verified') redirect(`/opens/${slug}/register?step=identity&error=${r.status}`);
  redirect(`/opens/${slug}/register?step=accept`);
}

/** Step 3: affirmative acceptance, recorded with the locked rules hash. */
export async function acceptRules(formData: FormData) {
  const { s, slug, open, user } = await ctx(formData);
  const required = ['acceptRules', 'acceptTerms', 'acceptPrivacy', 'consentProctoring', 'oneRegistration'];
  if (required.some((k) => formData.get(k) !== 'on')) redirect(`/opens/${slug}/register?step=accept&error=all_required`);
  const rs = latestRuleset(open);
  const reg = await db.registration.findUnique({ where: { userId_meritOpenId: { userId: user.id, meritOpenId: open.id } } });
  if (!reg) redirect(`/opens/${slug}/register`);
  const now = new Date();
  await db.registration.update({ where: { id: reg.id }, data: { acceptedRulesHash: open.rulesHash ?? rs?.hash ?? null, acceptedTermsVersion: rs?.termsVersion ?? null, acceptedAt: now, proctoringConsentAt: now } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'registration.accept', objectType: 'Registration', objectId: reg.id, after: { rulesHash: open.rulesHash, termsVersion: rs?.termsVersion, at: now.toISOString() } });
  redirect(`/opens/${slug}/register?step=payment`);
}

/** Step 4: payment. Settlement destination is the custodian (Rules 12.1). */
export async function startPayment(formData: FormData) {
  const { s, slug, open, user } = await ctx(formData);
  const reg = await db.registration.findUnique({ where: { userId_meritOpenId: { userId: user.id, meritOpenId: open.id } }, include: { payment: true } });
  if (!reg || !reg.acceptedAt) redirect(`/opens/${slug}/register?step=accept`);
  if (user.idvStatus !== 'verified' || user.idvLevel !== 'full') redirect(`/opens/${slug}/register?step=identity`);
  if (reg.status === 'confirmed') redirect(`/opens/${slug}/register?step=confirmed`);
  const provider = getPaymentProvider();
  const result = await provider.createCheckout({
    registrationId: reg.id, amountCents: open.registrationFeeCents, currency: 'usd', email: user.email,
    description: `Registration — ${open.name}`,
    successUrl: `${env.siteUrl}/opens/${slug}/register?step=confirmed`,
    cancelUrl: `${env.siteUrl}/opens/${slug}/register?step=payment&error=cancelled`,
  });
  if (result.kind === 'settled') {
    await settleRegistration(reg.id, { processorRef: result.processorRef, custodianRef: result.custodianRef, provider: provider.name, amountCents: open.registrationFeeCents });
    redirect(`/opens/${slug}/register?step=confirmed`);
  }
  await db.payment.upsert({
    where: { registrationId: reg.id },
    create: { registrationId: reg.id, provider: provider.name, processorRef: result.processorRef, amountCents: open.registrationFeeCents, status: 'authorized' },
    update: { processorRef: result.processorRef, status: 'authorized' },
  });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'payment.checkout', objectType: 'Registration', objectId: reg.id, detail: { provider: provider.name, ref: result.processorRef } });
  redirect(result.url);
}
