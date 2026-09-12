import 'server-only';
import type { User } from '@prisma/client';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { detectState } from '@/lib/geo';
import { getSanctionsProvider } from '@/lib/providers/identity';
import { sendNotice } from '@/lib/providers/notify';
import { eligibleStates, type OpenFull } from '@/modules/meritopens/queries';
import { fmtDateTime, money } from '@/lib/format';

export interface EligibilityResult { ok: boolean; reasons: string[]; snapshot: Record<string, unknown> }

function ageOn(dob: Date, at: Date): number {
  let age = at.getFullYear() - dob.getFullYear();
  const m = at.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < dob.getDate())) age--;
  return age;
}

/** Eligibility pre-check (spec §4.2, Rules 2). Every reason is a hard block. */
export async function checkEligibility(user: User, open: OpenFull): Promise<EligibilityResult> {
  const reasons: string[] = [];
  const states = eligibleStates(open);
  const geo = await detectState();
  const now = new Date();

  const age = user.dob ? ageOn(user.dob, now) : null;
  if (age === null) reasons.push('Date of birth is required.');
  else if (age < 18) reasons.push('You must be at least 18.');

  if (!user.residenceState) reasons.push('State of residence is required.');
  else if (!states.includes(user.residenceState)) reasons.push(`Registration is open only to legal residents of: ${states.join(', ')}.`);

  if (geo.state && user.residenceState && geo.state !== user.residenceState) reasons.push(`Your current location (${geo.state}) does not match your stated state of residence (${user.residenceState}).`);
  if (!geo.state) reasons.push('We could not confirm your location. Disable VPN or proxy software and try again.');

  if (user.priorWinner) reasons.push('Prior winners are not eligible (Rules 2.2).');
  if (user.excludedReason) reasons.push(`Not eligible: ${user.excludedReason}.`);

  const domain = user.email.split('@')[1] ?? '';
  const exclusions = await db.exclusionEntry.findMany({ where: { OR: [{ matchType: 'email', value: user.email }, { matchType: 'domain', value: domain }, ...(user.legalName ? [{ matchType: 'name', value: user.legalName }] : [])] } });
  if (exclusions.length) reasons.push(`Not eligible: ${exclusions[0]!.category} of ${exclusions[0]!.party} (Rules 2.2).`);

  let sanctions = user.sanctionsStatus;
  if (sanctions !== 'clear' || !user.sanctionsCheckedAt || now.getTime() - user.sanctionsCheckedAt.getTime() > 30 * 86400e3) {
    const r = await getSanctionsProvider().screen({ legalName: user.legalName ?? user.email, dob: user.dob, state: user.residenceState });
    sanctions = r.status;
    await db.user.update({ where: { id: user.id }, data: { sanctionsStatus: r.status, sanctionsCheckedAt: now } });
  }
  if (sanctions === 'hit') reasons.push('Not eligible under applicable sanctions law (Rules 2.3).');

  const existing = await db.registration.findUnique({ where: { userId_meritOpenId: { userId: user.id, meritOpenId: open.id } } });
  if (existing && ['confirmed', 'disqualified'].includes(existing.status)) reasons.push('One registration per person. You already hold a registration for this Merit Open (Rules 2.4).');

  const snapshot = { state: user.residenceState, geoState: geo.state, geoSource: geo.source, age, sanctions, exclusions: exclusions.length, priorWinner: user.priorWinner, checkedAt: now.toISOString() };
  return { ok: reasons.length === 0, reasons, snapshot };
}

export function registrationWindow(open: OpenFull, hasReservation: boolean, now = new Date()) {
  if (open.status !== 'registration') return { open: false, firstAccess: false, reason: open.status === 'reservation' ? 'Paid registration has not opened. The platform must own the home first.' : 'The Registration Period has closed.' };
  const openAt = open.registrationOpenAt?.getTime() ?? 0;
  const closeAt = open.registrationCloseAt?.getTime() ?? Infinity;
  const t = now.getTime();
  if (t >= closeAt) return { open: false, firstAccess: false, reason: 'The Registration Period has closed and will not be extended (Rules 3.6).' };
  if (t >= openAt) return { open: true, firstAccess: false, reason: null };
  const firstAccessAt = openAt - open.firstAccessHours * 3600e3;
  if (hasReservation && t >= firstAccessAt) return { open: true, firstAccess: true, reason: null };
  return { open: false, firstAccess: false, reason: `Registration opens ${fmtDateTime(open.registrationOpenAt)}${hasReservation ? '' : `; reservation holders get access ${open.firstAccessHours} hours earlier`}.` };
}

/** Settlement (webhook or immediate) → registration confirmed + receipt. Idempotent. */
export async function settleRegistration(registrationId: string, args: { processorRef: string; custodianRef: string | null; provider: string; amountCents: number; feeCents?: number }) {
  const reg = await db.registration.findUnique({ where: { id: registrationId }, include: { meritOpen: { include: { rounds: { orderBy: { sequence: 'asc' } } } }, payment: true } });
  if (!reg) throw new Error('registration not found');
  if (reg.status === 'confirmed') return reg;
  const now = new Date();
  await db.payment.upsert({
    where: { registrationId },
    create: { registrationId, provider: args.provider, processorRef: args.processorRef, amountCents: args.amountCents, feeCents: args.feeCents ?? 0, status: 'settled', custodianSettlementRef: args.custodianRef, settledAt: now },
    update: { processorRef: args.processorRef, status: 'settled', custodianSettlementRef: args.custodianRef, settledAt: now },
  });
  const updated = await db.registration.update({ where: { id: registrationId }, data: { status: 'confirmed', confirmedAt: now } });
  await audit({ actorId: reg.userId, actorRole: 'registrant', action: 'registration.confirm', objectType: 'Registration', objectId: registrationId, after: { status: 'confirmed', processorRef: args.processorRef, custodianRef: args.custodianRef } });
  const schedule = reg.meritOpen.rounds.map((r) => `${r.number.toUpperCase()}: ${r.windowStart ? `${fmtDateTime(r.windowStart)} – ${fmtDateTime(r.windowEnd)}` : fmtDateTime(r.scheduledAt)}`).join('\n');
  await sendNotice({ userId: reg.userId, meritOpenId: reg.meritOpenId, kind: 'receipt', subject: `Registration confirmed — ${reg.meritOpen.name}`, body: `Registration ID ${registrationId}. Fee ${money(args.amountCents)} settled to the Custodian (ref ${args.custodianRef ?? 'pending'}). Your seat at the test is confirmed.\n\nSchedule:\n${schedule}\n\nTechnical requirements: a current desktop or mobile browser for Rounds 1–2; a desktop with webcam for Round 3 and the Final. Full-screen mode is required during every round.` });
  return updated;
}

/** A refund executed at the processor is mirrored here so the custody ledger matches the statement. Idempotent. */
export async function markProcessorRefund(processorRef: string, amountRefundedCents: number, refundRef: string | null) {
  const payment = await db.payment.findFirst({ where: { processorRef }, include: { refunds: true } });
  if (!payment || payment.status === 'refunded') return null;
  const now = new Date();
  const already = payment.refunds.reduce((a, r) => a + (r.status === 'completed' ? r.amountCents : 0), 0);
  if (amountRefundedCents > already) await db.refund.create({ data: { paymentId: payment.id, amountCents: amountRefundedCents - already, status: 'completed', reason: 'Refund executed at the processor', processorRef: refundRef, attemptedAt: now } });
  if (amountRefundedCents >= payment.amountCents) {
    await db.payment.update({ where: { id: payment.id }, data: { status: 'refunded', refundedAt: now } });
    await db.registration.update({ where: { id: payment.registrationId }, data: { status: 'refunded' } });
  }
  await audit({ actorRole: 'system', action: 'payment.refund.mirrored', objectType: 'Payment', objectId: payment.id, detail: { processorRef, refundRef, amountRefundedCents } });
  return payment;
}

/** Chargebacks disqualify (Rules 12.5) unless an admin later records the unauthorised-use exception. */
export async function markChargeback(processorRef: string) {
  const payment = await db.payment.findFirst({ where: { processorRef } });
  if (!payment) return null;
  await db.payment.update({ where: { id: payment.id }, data: { status: 'chargeback' } });
  const reg = await db.registration.update({ where: { id: payment.registrationId }, data: { status: 'disqualified', disqualifiedReason: 'Chargeback initiated (Rules 12.5)' } });
  await audit({ actorRole: 'system', action: 'registration.disqualify.chargeback', objectType: 'Registration', objectId: reg.id, detail: { processorRef } });
  return reg;
}
