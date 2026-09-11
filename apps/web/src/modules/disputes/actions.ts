'use server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { assertRole } from '@/lib/auth/guards';
import { getSession } from '@/lib/auth/session';

/** Score challenge: own score only, within the window, one item and a claimed error (Rules 11.1). */
export async function fileScoreChallengeAction(formData: FormData) {
  const s = await getSession();
  if (!s) redirect('/sign-in');
  const registrationId = String(formData.get('registrationId') ?? '');
  const roundId = String(formData.get('roundId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  const statement = String(formData.get('statement') ?? '').trim();
  const back = String(formData.get('back') ?? '/account');
  const reg = await db.registration.findUnique({ where: { id: registrationId } });
  const round = await db.round.findUnique({ where: { id: roundId } });
  if (!reg || reg.userId !== s.userId || !round) redirect(`${back}?error=not_yours`);
  if (!round.scoresPostedAt) redirect(`${back}?error=scores_not_posted`);
  if (round.disputeDeadlineAt && Date.now() > round.disputeDeadlineAt.getTime()) redirect(`${back}?error=window_closed`);
  if (!itemId || statement.length < 20) redirect(`${back}?error=incomplete`);
  const d = await db.dispute.create({ data: { registrationId, roundId, itemId, type: 'score_challenge', statement, deadlineAt: round.disputeDeadlineAt } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'dispute.file', objectType: 'Dispute', objectId: d.id, detail: { type: 'score_challenge', roundId, itemId } });
  redirect(`${back}?filed=${d.id}`);
}

/** Integrity report: any signed-in person (Rules 11.2). */
export async function fileIntegrityReportAction(formData: FormData) {
  const s = await getSession();
  if (!s) redirect('/sign-in?next=/report');
  const statement = String(formData.get('statement') ?? '').trim();
  const openSlug = String(formData.get('openSlug') ?? '').trim();
  if (statement.length < 20) redirect('/report?error=incomplete');
  const open = openSlug ? await db.meritOpen.findUnique({ where: { slug: openSlug } }) : null;
  const ownReg = open ? await db.registration.findUnique({ where: { userId_meritOpenId: { userId: s.userId, meritOpenId: open.id } } }) : null;
  const d = await db.dispute.create({ data: { registrationId: ownReg?.id ?? null, reporterUserId: s.userId, type: 'integrity_report', statement: `${open ? `[${open.name}] ` : ''}${statement}` } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'dispute.file', objectType: 'Dispute', objectId: d.id, detail: { type: 'integrity_report' } });
  redirect(`/report?filed=${d.id}`);
}

/** Technical failure report → Administrator decides re-administration with the reserve form (Rules 8.8). */
export async function fileTechnicalFailureAction(formData: FormData) {
  const s = await getSession();
  if (!s) redirect('/sign-in');
  const registrationId = String(formData.get('registrationId') ?? '');
  const roundId = String(formData.get('roundId') ?? '');
  const statement = String(formData.get('statement') ?? '').trim();
  const back = String(formData.get('back') ?? '/account');
  const reg = await db.registration.findUnique({ where: { id: registrationId } });
  if (!reg || reg.userId !== s.userId || statement.length < 20) redirect(`${back}?error=incomplete`);
  const d = await db.dispute.create({ data: { registrationId, roundId: roundId || null, type: 'technical_failure', statement } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'dispute.file', objectType: 'Dispute', objectId: d.id, detail: { type: 'technical_failure', roundId } });
  redirect(`${back}?filed=${d.id}`);
}

/** Administrator decision against the locked key and rules (Rules 11.3). */
export async function decideDisputeAction(formData: FormData) {
  const s = await assertRole(['administrator']);
  const id = String(formData.get('disputeId') ?? '');
  const decision = String(formData.get('decision') ?? '').trim();
  const back = String(formData.get('back') ?? '/administrator/disputes');
  if (decision.length < 10) redirect(`${back}?error=decision_required`);
  await db.dispute.update({ where: { id }, data: { status: 'decided', decision, decidedById: s.userId, decidedAt: new Date() } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'dispute.decide', objectType: 'Dispute', objectId: id, after: { decision } });
  redirect(back);
}
