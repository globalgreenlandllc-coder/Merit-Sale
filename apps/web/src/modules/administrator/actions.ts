'use server';
import { redirect } from 'next/navigation';
import { buildPackage, sealPackage, unsealPackage, validateForm, verifyPackage, type AuthoredItemInput } from '@etk/items';
import { hashRuleset, hashObject, CANCELLATION_REASONS, type MeritOpenStatus } from '@etk/rules-config';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { assertRole } from '@/lib/auth/guards';
import { getPaymentProvider } from '@/lib/providers/payments';
import { broadcastNotice } from '@/lib/providers/notify';
import { getOpenById, latestRuleset, parseConfig } from '@/modules/meritopens/queries';
import { transitionOpen } from '@/modules/meritopens/state';
import { certifyRound, unsealAndScoreRound } from '@/modules/scoring/service';
import { safeJson } from '@/lib/format';

function back(formData: FormData, fallback: string) {
  const b = String(formData.get('back') ?? '');
  return b.startsWith('/') ? b : fallback;
}
function fail(path: string, msg: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}`);
}

/**
 * Lock ceremony (spec §4.3): parse + hash the ruleset, validate every form, build and
 * hash each package, seal under the Administrator key, wipe plaintext keys, publish hashes.
 * After this the platform cannot read a key and nobody can change a rule.
 */
export async function lockMeritOpenAction(formData: FormData) {
  const s = await assertRole(['administrator']);
  const openId = String(formData.get('openId') ?? '');
  const path = `/administrator/opens/${openId}/lock`;
  const open = await getOpenById(openId);
  if (!open) redirect('/administrator');
  if (open.lockedAt) fail(path, 'Already locked.');
  if (!env.sealKey) fail(path, 'ADMINISTRATOR_SEAL_KEY is not configured on this host.');
  const rs = open.rulesets[0];
  if (!rs) fail(path, 'No ruleset drafted.');
  const cfg = parseConfig(rs);
  if (!cfg) fail(path, 'Ruleset config does not parse against the schema.');
  if (!open.registrationCloseAt || !open.registrationOpenAt) fail(path, 'Registration open/close must be set before lock; they are immutable afterwards.');

  const forms = await db.form.findMany({ where: { meritOpenId: openId }, include: { items: { orderBy: { position: 'asc' } } } });
  for (const round of open.rounds) {
    if (!round.formId) fail(path, `${round.number}: no primary form assigned.`);
    if (!round.reserveFormId && !round.number.startsWith('tiebreak')) fail(path, `${round.number}: no reserve form assigned (Rules 8.9).`);
  }
  const published: { formId: string; hash: string; round: string; label: string }[] = [];
  const now = new Date();
  for (const f of forms) {
    if (f.hashPublishedAt) continue;
    const items: AuthoredItemInput[] = f.items.map((it) => ({
      id: it.id, position: it.position, prompt: it.prompt, inputType: it.inputType as AuthoredItemInput['inputType'],
      scoring: safeJson(it.scoringSpecJson, null) as unknown as AuthoredItemInput['scoring'], maxPoints: it.maxPoints, tieOrderFlag: it.tieOrderFlag,
      calculatorPermitted: it.calculatorPermitted, inputHint: it.inputHint ?? undefined, fields: safeJson(it.fieldsJson, undefined) ?? undefined,
    }));
    if (!items.length) fail(path, `Form ${f.roundNumber}/${f.label} has no items.`);
    const v = validateForm(items);
    if (!v.ok) fail(path, `Form ${f.roundNumber}/${f.label}: ${v.problems.slice(0, 3).join('; ')}`);
    const pkg = buildPackage({ meritOpenSlug: open.slug, round: f.roundNumber, label: f.label as 'primary' | 'reserve' | 'tiebreak', formId: f.id, items: v.reports.map((r) => r.item!), authoredAt: now.toISOString() });
    const sealed = sealPackage(pkg.plaintext, env.sealKey);
    await db.$transaction([
      db.form.update({ where: { id: f.id }, data: { packageHash: pkg.hash, hashPublishedAt: now, sealedPackage: sealed } }),
      db.item.updateMany({ where: { formId: f.id }, data: { scoringSpecJson: null } }),
    ]);
    published.push({ formId: f.id, hash: pkg.hash, round: f.roundNumber, label: f.label });
  }
  const rulesHash = hashRuleset(cfg, rs.officialRulesText);
  await db.$transaction([
    db.ruleset.update({ where: { id: rs.id }, data: { hash: rulesHash, lockedAt: now } }),
    db.meritOpen.update({ where: { id: openId }, data: { rulesHash, rulesVersion: rs.version, lockedAt: now, lockedById: s.userId } }),
  ]);
  const doc = { meritOpen: open.slug, lockedAt: now.toISOString(), rulesVersion: rs.version, rulesHash, forms: published, administrator: s.userId };
  await db.certification.create({ data: { meritOpenId: openId, type: 'lock', documentJson: JSON.stringify(doc), hash: hashObject(doc), signedById: s.userId, signedAt: now } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'meritopen.lock', objectType: 'MeritOpen', objectId: openId, after: doc });
  redirect(`/administrator/opens/${openId}?locked=1`);
}

export async function transitionOpenAction(formData: FormData) {
  const s = await assertRole(['administrator']);
  const openId = String(formData.get('openId') ?? '');
  const to = String(formData.get('to') ?? '') as MeritOpenStatus;
  const justification = String(formData.get('justification') ?? '').trim() || undefined;
  const b = back(formData, `/administrator/opens/${openId}`);
  const r = await transitionOpen(openId, to, s, { justification });
  if (!r.ok) fail(b, r.error);
  redirect(b);
}

export async function setRoundStatusAction(formData: FormData) {
  const s = await assertRole(['administrator']);
  const roundId = String(formData.get('roundId') ?? '');
  const status = String(formData.get('status') ?? '');
  const b = back(formData, '/administrator');
  const round = await db.round.findUniqueOrThrow({ where: { id: roundId }, include: { form: true } });
  if (status === 'open' && !round.form?.hashPublishedAt) fail(b, 'Cannot open: the form hash has not been published (Rules 7.1).');
  if (!['open', 'closed'].includes(status)) fail(b, 'Invalid status');
  await db.round.update({ where: { id: roundId }, data: { status } });
  await audit({ actorId: s.userId, actorRole: s.role, action: `round.${status}`, objectType: 'Round', objectId: roundId });
  redirect(b);
}

export async function unsealRoundAction(formData: FormData) {
  const s = await assertRole(['administrator']);
  const roundId = String(formData.get('roundId') ?? '');
  const b = back(formData, '/administrator');
  try {
    const r = await unsealAndScoreRound(roundId, s);
    redirect(`${b}?scored=${r.scored}&flags=${r.flags}`);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    fail(b, e instanceof Error ? e.message : String(e));
  }
}

export async function certifyRoundAction(formData: FormData) {
  const s = await assertRole(['administrator']);
  const roundId = String(formData.get('roundId') ?? '');
  const b = back(formData, '/administrator');
  if (formData.get('attest') !== 'on') fail(b, 'You must attest that the list was produced solely under Sections 5.1–5.5.');
  try {
    const r = await certifyRound(roundId, s);
    redirect(`${b}?certified=${r.certificationId}`);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    fail(b, e instanceof Error ? e.message : String(e));
  }
}

/** Release the committed package after certification + dispute window (Rules 7.2). */
export async function releasePackageAction(formData: FormData) {
  const s = await assertRole(['administrator']);
  const formId = String(formData.get('formId') ?? '');
  const b = back(formData, '/administrator');
  const form = await db.form.findUniqueOrThrow({ where: { id: formId }, include: { primaryOf: true, reserveOf: true, meritOpen: true } });
  if (!form.sealedPackage || !form.packageHash) fail(b, 'Nothing sealed.');
  if (form.releasedPackage) redirect(b);
  const round = form.primaryOf ?? form.reserveOf;
  const isTiebreak = form.label === 'tiebreak';
  if (isTiebreak) {
    if (!form.meritOpen.winnerRegistrationId || !['closing', 'complete'].includes(form.meritOpen.status)) fail(b, 'Tie-break sets are released only after the winner is certified (Rules 7.3).');
  } else if (form.label === 'primary') {
    if (round?.status !== 'certified') fail(b, 'The round must be certified before release.');
    if (round.disputeDeadlineAt && Date.now() < round.disputeDeadlineAt.getTime()) fail(b, `The dispute window is open until ${round.disputeDeadlineAt.toISOString()}.`);
  } else if (form.label === 'reserve') {
    if (!['complete', 'cancelled'].includes(form.meritOpen.status) && round?.status !== 'certified') fail(b, 'Reserve forms are released with their round or when the Merit Open completes.');
  }
  const plaintext = unsealPackage(form.sealedPackage, env.sealKey);
  if (!verifyPackage(plaintext, form.packageHash)) fail(b, 'Package does not match the published hash. Release halted.');
  const now = new Date();
  await db.form.update({ where: { id: formId }, data: { releasedPackage: plaintext, packageReleasedAt: now } });
  const doc = { formId, round: form.roundNumber, label: form.label, hash: form.packageHash, releasedAt: now.toISOString() };
  await db.certification.create({ data: { meritOpenId: form.meritOpenId, roundId: round?.id ?? null, type: 'release', documentJson: JSON.stringify(doc), hash: hashObject(doc), signedById: s.userId, signedAt: now } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'form.release', objectType: 'Form', objectId: formId, after: doc });
  redirect(b);
}

/** Cancellation (Rules 12.4): reason code required; full refunds incl. processing fees; public notice. */
export async function cancelMeritOpenAction(formData: FormData) {
  const s = await assertRole(['administrator']);
  const openId = String(formData.get('openId') ?? '');
  const code = String(formData.get('reasonCode') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  const path = `/administrator/opens/${openId}/cancel`;
  if (!CANCELLATION_REASONS.some((r) => r.code === code)) fail(path, 'A Rules 12.4 reason code is required.');
  if (note.length < 20) fail(path, 'Record the factual basis for the cancellation (at least 20 characters).');
  if (formData.get('attest') !== 'on') fail(path, 'Attestation required.');
  const t = await transitionOpen(openId, 'cancelled', s, { justification: `${code}: ${note}` });
  if (!t.ok) fail(path, t.error);
  const now = new Date();
  await db.meritOpen.update({ where: { id: openId }, data: { cancellationReasonCode: code, cancellationNote: note, cancelledAt: now } });
  const payments = await db.payment.findMany({ where: { status: 'settled', registration: { meritOpenId: openId } } });
  const provider = getPaymentProvider();
  let completed = 0, manual = 0;
  for (const p of payments) {
    const amount = p.amountCents + p.feeCents;
    const r = p.processorRef ? await provider.refund({ processorRef: p.processorRef, amountCents: amount, reason: `Merit Open cancelled under Rules ${code}` }) : { ok: false, error: 'no processor reference' };
    await db.refund.create({ data: { paymentId: p.id, amountCents: amount, status: r.ok ? 'completed' : 'manual', reason: `Cancellation ${code}`, processorRef: r.ref ?? null, attemptedAt: now } });
    if (r.ok) { completed++; await db.payment.update({ where: { id: p.id }, data: { status: 'refunded', refundedAt: now } }); await db.registration.update({ where: { id: p.registrationId }, data: { status: 'refunded' } }); }
    else manual++;
  }
  const doc = { meritOpen: openId, code, note, cancelledAt: now.toISOString(), refunds: { completed, manual } };
  await db.certification.create({ data: { meritOpenId: openId, type: 'cancellation', documentJson: JSON.stringify(doc), hash: hashObject(doc), signedById: s.userId, signedAt: now } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'meritopen.cancel', objectType: 'MeritOpen', objectId: openId, after: doc });
  await broadcastNotice({ meritOpenId: openId, subject: 'Merit Open cancelled — full refund', body: `The Merit Open has been cancelled under Official Rules ${code}. ${note}\n\nYour registration fee, including processing fees, is being refunded in full to the original payment method (Rules 12.4).` });
  redirect(`/administrator/opens/${openId}`);
}

/** Technical failure / compromised form: re-administer with the reserve form (Rules 8.8, 8.9). Never a score adjustment. */
export async function rescheduleRoundAction(formData: FormData) {
  const s = await assertRole(['administrator']);
  const roundId = String(formData.get('roundId') ?? '');
  const reason = String(formData.get('reason') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  const windowStart = String(formData.get('windowStart') ?? '');
  const windowEnd = String(formData.get('windowEnd') ?? '');
  const b = back(formData, '/administrator');
  if (!['technical_failure', 'compromised_form'].includes(reason)) fail(b, 'Reason must be technical_failure or compromised_form.');
  if (note.length < 20) fail(b, 'Record the verified basis (Exhibit E).');
  const round = await db.round.findUniqueOrThrow({ where: { id: roundId }, include: { reserveForm: true, meritOpen: true } });
  if (!round.reserveForm?.hashPublishedAt) fail(b, 'No committed reserve form is available for this round.');
  const now = new Date();
  const start = windowStart ? new Date(windowStart) : null;
  const end = windowEnd ? new Date(windowEnd) : null;
  const affected = await db.attempt.updateMany({ where: { roundId, status: { in: ['in_progress', 'submitted', 'expired'] } }, data: { status: 'voided', voidReason: `Re-administered with reserve form: ${reason}` } });
  await db.score.deleteMany({ where: { attempt: { roundId } } });
  await db.round.update({ where: { id: roundId }, data: { formId: round.reserveFormId, reserveFormId: null, windowStart: start ?? round.windowStart, windowEnd: end ?? round.windowEnd, scheduledAt: start && !end ? start : round.scheduledAt, status: 'scheduled', unsealedAt: null, rescheduleReason: `${reason}: ${note}` } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'round.readminister', objectType: 'Round', objectId: roundId, before: { formId: round.formId, windowStart: round.windowStart, windowEnd: round.windowEnd }, after: { formId: round.reserveFormId, windowStart: start, windowEnd: end, reason, note, voided: affected.count } });
  await broadcastNotice({ meritOpenId: round.meritOpenId, subject: `${round.meritOpen.name}: ${round.number.toUpperCase()} will be re-administered`, body: `Under Official Rules ${reason === 'technical_failure' ? '8.8' : '8.9'}, ${round.number.toUpperCase()} is being re-administered to all affected registrants using the committed reserve form (hash ${round.reserveForm.packageHash}). New window: ${start?.toISOString() ?? 'unchanged'} to ${end?.toISOString() ?? 'unchanged'}. No score has been adjusted.` });
  redirect(b);
}

/** Winner certification wizard (Rules 9): re-verification + affidavit → certification → closing. */
export async function certifyWinnerAction(formData: FormData) {
  const s = await assertRole(['administrator']);
  const openId = String(formData.get('openId') ?? '');
  const path = `/administrator/opens/${openId}/winner`;
  const open = await getOpenById(openId);
  if (!open?.winnerRegistrationId) fail(path, 'No potential winner determined.');
  if (open.status !== 'certification') fail(path, `Merit Open is in ${open.status}, not certification.`);
  const checks = ['reVerified', 'affidavit', 'acceptance', 'sanctionsRecheck'];
  if (checks.some((k) => formData.get(k) !== 'on')) fail(path, 'All verification steps must be completed and attested.');
  const consent = formData.get('publicityConsent') === 'on';
  const now = new Date();
  const reg = await db.registration.update({ where: { id: open.winnerRegistrationId }, data: { reVerifiedAt: now, affidavitSignedAt: now }, include: { user: true } });
  const finalRound = open.rounds.find((r) => r.number === 'final');
  const score = finalRound ? await db.score.findFirst({ where: { attempt: { roundId: finalRound.id, registrationId: reg.id } } }) : null;
  const doc = { meritOpen: open.slug, winnerRegistrationId: reg.id, certifiedScore: score?.totalPoints ?? null, rulesHash: open.rulesHash, reVerifiedAt: now.toISOString(), affidavitSignedAt: now.toISOString(), publicityConsent: consent };
  await db.certification.create({ data: { meritOpenId: openId, roundId: finalRound?.id ?? null, type: 'winner', documentJson: JSON.stringify(doc), hash: hashObject(doc), signedById: s.userId, signedAt: now } });
  await db.meritOpen.update({ where: { id: openId }, data: { winnerConsentToPublish: consent } });
  await db.user.update({ where: { id: reg.userId }, data: { priorWinner: true } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'winner.certify', objectType: 'MeritOpen', objectId: openId, after: doc });
  const t = await transitionOpen(openId, 'closing', s);
  if (!t.ok) fail(path, t.error);
  redirect(`/administrator/opens/${openId}?winner=1`);
}

export async function completeClosingAction(formData: FormData) {
  const s = await assertRole(['administrator']);
  const openId = String(formData.get('openId') ?? '');
  const deedRef = String(formData.get('deedRef') ?? '').trim();
  const path = `/administrator/opens/${openId}`;
  if (deedRef.length < 4) fail(path, 'Deed recording reference required.');
  const open = await getOpenById(openId);
  if (!open) redirect('/administrator');
  const now = new Date();
  await db.property.update({ where: { id: open.propertyId }, data: { countyRecorderRef: deedRef, status: 'closed' } });
  await db.meritOpen.update({ where: { id: openId }, data: { closedAt: now } });
  const t = await transitionOpen(openId, 'complete', s, { justification: `deed ${deedRef}` });
  if (!t.ok) fail(path, t.error);
  redirect(path);
}

export async function decideAccommodationAction(formData: FormData) {
  const s = await assertRole(['administrator']);
  const id = String(formData.get('accommodationId') ?? '');
  const status = String(formData.get('status') ?? '');
  const extra = Number(formData.get('extraTimeSeconds') ?? 0) || 0;
  const flags = String(formData.get('assistiveFlags') ?? '').split(',').map((f) => f.trim()).filter(Boolean);
  const decision = String(formData.get('decision') ?? '').trim();
  const b = back(formData, '/administrator/accommodations');
  if (!['granted', 'denied'].includes(status)) fail(b, 'Invalid status');
  await db.accommodation.update({ where: { id }, data: { status, extraTimeSeconds: status === 'granted' ? extra : 0, assistiveFlagsJson: JSON.stringify(flags), decision, decidedAt: new Date() } });
  await audit({ actorId: s.userId, actorRole: s.role, action: `accommodation.${status}`, objectType: 'Accommodation', objectId: id, after: { extraTimeSeconds: extra, flags } });
  redirect(b);
}
