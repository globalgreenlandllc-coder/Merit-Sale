import 'server-only';
import { canTransition, type MeritOpenStatus } from '@etk/rules-config';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getOpenById } from './queries';

export type Actor = { userId: string; role: string };
export type Outcome = { ok: true } | { ok: false; error: string };

/**
 * The only way a Merit Open changes status. Encodes the hard rules from spec §3:
 * no registration without title (or a recorded override), no round without a
 * published hash, no backwards or skipped transitions.
 */
export async function transitionOpen(openId: string, to: MeritOpenStatus, actor: Actor, opts: { justification?: string } = {}): Promise<Outcome> {
  const open = await getOpenById(openId);
  if (!open) return { ok: false, error: 'Merit Open not found' };
  const from = open.status as MeritOpenStatus;
  if (!canTransition(from, to)) return { ok: false, error: `Cannot move from ${from} to ${to}` };

  if (to === 'registration') {
    if (!open.lockedAt || !open.rulesHash) return { ok: false, error: 'Rules and forms must be locked by the Administrator before registration opens' };
    const owned = open.property.titleStatus === 'owned';
    if (!owned && !open.titleOverrideJustification && !opts.justification) return { ok: false, error: 'Property title is not recorded as owned. Registration requires title, or a counsel-approved override with a recorded justification.' };
    if (!owned && opts.justification) await db.meritOpen.update({ where: { id: openId }, data: { titleOverrideJustification: opts.justification } });
  }
  if (to === 'r1' && open.registrationCloseAt && Date.now() < open.registrationCloseAt.getTime()) {
    return { ok: false, error: 'The Registration Period has not closed. It cannot be shortened or extended (Rules 3.6).' };
  }
  if (['r1', 'r2', 'r3', 'final'].includes(to)) {
    const round = open.rounds.find((r) => r.number === to);
    if (!round?.form?.hashPublishedAt) return { ok: false, error: `${to.toUpperCase()} cannot open: the form hash has not been published (Rules 7.1).` };
  }
  if (to === 'tiebreak') {
    const tb = open.rounds.filter((r) => r.number.startsWith('tiebreak')).sort((a, b) => a.sequence - b.sequence).find((r) => r.status === 'scheduled');
    if (!tb?.form?.hashPublishedAt) return { ok: false, error: 'No sealed tie-break problem with a published hash is available (Rules 5.5).' };
  }

  await db.meritOpen.update({ where: { id: openId }, data: { status: to } });
  if (['r1', 'r2', 'r3', 'final'].includes(to)) {
    await db.round.updateMany({ where: { meritOpenId: openId, number: to }, data: { status: 'open' } });
  }
  await audit({ actorId: actor.userId, actorRole: actor.role, action: 'meritopen.transition', objectType: 'MeritOpen', objectId: openId, before: { status: from }, after: { status: to }, detail: opts });
  return { ok: true };
}
