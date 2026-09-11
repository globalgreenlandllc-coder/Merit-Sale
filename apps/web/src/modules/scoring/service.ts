import 'server-only';
import { scoreAttempt, selectAdvancing, selectFinalLeaders, r1Pass, rankStandings, type FormItemKey, type AdvancementResult, type FinalResult } from '@etk/scoring';
import { parsePackage, unsealPackage, verifyPackage } from '@etk/items';
import { hashObject } from '@etk/rules-config';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { getOpenById, parseConfig, latestRuleset } from '@/modules/meritopens/queries';
import { transitionOpen } from '@/modules/meritopens/state';
import { screenRound } from '@/modules/integrity/screen';
import { broadcastNotice } from '@/lib/providers/notify';

type Actor = { userId: string; role: string };

/**
 * Administrator unseals the committed package for a closed round, verifies it against
 * the published hash, scores every submitted attempt, and runs integrity screening.
 * Platform admins cannot call this; the seal key is the Administrator's.
 */
export async function unsealAndScoreRound(roundId: string, actor: Actor) {
  const round = await db.round.findUniqueOrThrow({ where: { id: roundId }, include: { form: { include: { items: true } }, meritOpen: true } });
  if (!round.form?.sealedPackage || !round.form.packageHash) throw new Error('No sealed package for this round.');
  const earlyUnseal = !!round.windowEnd && Date.now() < round.windowEnd.getTime();
  if (earlyUnseal && !round.meritOpen.isPractice) throw new Error('The round window has not closed. Keys are unsealed only after the window (Rules 7.2).');
  if (!env.sealKey) throw new Error('ADMINISTRATOR_SEAL_KEY is not configured.');

  const plaintext = unsealPackage(round.form.sealedPackage, env.sealKey);
  if (!verifyPackage(plaintext, round.form.packageHash)) throw new Error('Unsealed package does not match the published hash. Scoring halted.');
  const pkg = parsePackage(plaintext);
  const byPosition = new Map(pkg.items.map((i) => [i.position, i]));
  const form: FormItemKey[] = round.form.items.map((it) => {
    const key = byPosition.get(it.position);
    if (!key) throw new Error(`No key for item position ${it.position}`);
    return { itemId: it.id, position: it.position, spec: key.scoring, tieOrderFlag: it.tieOrderFlag };
  });

  await db.round.update({ where: { id: roundId }, data: { status: 'scoring', unsealedAt: new Date(), unsealedById: actor.userId } });
  await audit({ actorId: actor.userId, actorRole: actor.role, action: 'round.unseal', objectType: 'Round', objectId: roundId, detail: { packageHash: round.form.packageHash, earlyUnseal, practice: round.meritOpen.isPractice } });

  // expire stale in-progress attempts
  const expired = await db.attempt.updateMany({ where: { roundId, status: 'in_progress' }, data: { status: 'expired' } });

  const attempts = await db.attempt.findMany({ where: { roundId, status: 'submitted' }, include: { responses: true } });
  let scored = 0;
  for (const a of attempts) {
    const answers: Record<string, unknown> = {};
    for (const r of a.responses) answers[r.itemId] = r.rawAnswer;
    const firstRender = a.responses.map((r) => r.renderedAt?.getTime() ?? Infinity).reduce((m, v) => Math.min(m, v), Infinity);
    const start = Number.isFinite(firstRender) ? Math.max(firstRender, a.startedAt.getTime()) : a.startedAt.getTime();
    const elapsedSeconds = Math.max(0, Math.round(((a.submittedAt ?? a.expiresAt).getTime() - start) / 1000));
    const s = scoreAttempt(form, { registrationId: a.registrationId, answers, elapsedSeconds });
    const withinLimit = !!a.submittedAt && a.submittedAt.getTime() <= a.expiresAt.getTime() + round.latencyGraceSeconds * 1000;
    const pass = round.number === 'r1' ? r1Pass(form[0]!.spec, answers[form[0]!.itemId], withinLimit) : null;
    await db.$transaction([
      ...a.responses.map((r) => db.response.update({ where: { id: r.id }, data: { score: s.perItem[r.itemId]?.points ?? 0, valid: s.perItem[r.itemId]?.valid ?? false, canonical: s.perItem[r.itemId]?.canonical ?? null } })),
      db.score.upsert({
        where: { attemptId: a.id },
        create: { attemptId: a.id, totalPoints: s.totalPoints, tieOrderPoints: s.tieOrderPoints, elapsedSeconds, r1Pass: pass, keyPackageHashUsed: round.form.packageHash },
        update: { totalPoints: s.totalPoints, tieOrderPoints: s.tieOrderPoints, elapsedSeconds, r1Pass: pass, keyPackageHashUsed: round.form.packageHash, computedAt: new Date() },
      }),
    ]);
    scored++;
  }
  const flags = ['r1', 'r2'].includes(round.number) ? await screenRound(roundId) : 0;
  await audit({ actorId: actor.userId, actorRole: actor.role, action: 'round.score', objectType: 'Round', objectId: roundId, detail: { scored, expired: expired.count, flags, packageHash: round.form.packageHash } });
  return { scored, expired: expired.count, flags, packageHash: round.form.packageHash };
}

export interface PreviewRow {
  registrationId: string; userLabel: string; state: string | null;
  totalPoints: number; tieOrderPoints: number; elapsedSeconds: number; rank: number | null;
  advanced: boolean; reason: string; held: boolean; flagTypes: string[];
}
export interface Preview {
  kind: 'r1' | 'ranked' | 'final';
  capacity: number | null;
  rows: PreviewRow[];
  held: PreviewRow[];
  result: AdvancementResult | null;
  final: FinalResult | null;
  scoredCount: number;
}

/** The deterministic certification list with reasons, replayable from the Score table. */
export async function advancementPreview(roundId: string): Promise<Preview> {
  const round = await db.round.findUniqueOrThrow({ where: { id: roundId }, include: { meritOpen: { include: { rulesets: true } } } });
  const cfg = parseConfig(latestRuleset({ ...round.meritOpen, rulesets: round.meritOpen.rulesets } as never));
  const capacity = round.number === 'r2' ? round.meritOpen.advanceN : round.number === 'r3' ? round.meritOpen.advanceM : round.capacity;
  void cfg;
  const attempts = await db.attempt.findMany({
    where: { roundId, status: 'submitted', registration: { status: 'confirmed' } },
    include: { score: true, integrityFlags: { where: { status: 'open' } }, registration: { include: { user: { select: { legalName: true, email: true, residenceState: true } } } } },
  });
  const rows = attempts.filter((a) => a.score).map((a) => ({
    registrationId: a.registrationId,
    userLabel: a.registration.user.legalName ?? a.registration.user.email,
    state: a.registration.user.residenceState,
    totalPoints: a.score!.totalPoints, tieOrderPoints: a.score!.tieOrderPoints, elapsedSeconds: a.score!.elapsedSeconds,
    r1Pass: a.score!.r1Pass,
    held: a.integrityFlags.length > 0,
    flagTypes: a.integrityFlags.map((f) => f.type),
  }));
  const eligible = rows.filter((r) => !r.held);
  const held = rows.filter((r) => r.held);
  const toRow = (r: (typeof rows)[number], extra: Partial<PreviewRow>): PreviewRow => ({ registrationId: r.registrationId, userLabel: r.userLabel, state: r.state, totalPoints: r.totalPoints, tieOrderPoints: r.tieOrderPoints, elapsedSeconds: r.elapsedSeconds, rank: null, advanced: false, reason: 'held', held: r.held, flagTypes: r.flagTypes, ...extra });

  if (round.number === 'r1') {
    return {
      kind: 'r1', capacity: null, result: null, final: null, scoredCount: rows.length,
      rows: eligible.map((r) => toRow(r, { advanced: !!r.r1Pass, reason: r.r1Pass ? 'r1_pass' : 'r1_fail' })).sort((a, b) => Number(b.advanced) - Number(a.advanced) || a.userLabel.localeCompare(b.userLabel)),
      held: held.map((r) => toRow(r, {})),
    };
  }
  if (round.number === 'final' || round.number.startsWith('tiebreak')) {
    const final = selectFinalLeaders(eligible.map((r) => ({ registrationId: r.registrationId, score: r.totalPoints, valid: r.totalPoints > 0 })));
    const byId = new Map(eligible.map((r) => [r.registrationId, r]));
    return {
      kind: 'final', capacity: 1, result: null, final, scoredCount: rows.length,
      rows: final.ranked.map((f) => toRow(byId.get(f.registrationId)!, { rank: f.rank, advanced: final.leaders.includes(f.registrationId), reason: final.leaders.includes(f.registrationId) ? (final.tied ? 'tied_leader' : 'highest_valid_score') : f.valid ? 'below_leader' : 'invalid_submission' })),
      held: held.map((r) => toRow(r, {})),
    };
  }
  const result = selectAdvancing(eligible, capacity ?? 0);
  const byId = new Map(eligible.map((r) => [r.registrationId, r]));
  return {
    kind: 'ranked', capacity, result, final: null, scoredCount: rows.length,
    rows: result.decisions.map((d) => toRow(byId.get(d.registrationId)!, { rank: d.rank, advanced: d.advanced, reason: d.reason })),
    held: rankStandings(held).map((r) => toRow(byId.get(r.registrationId) ?? held.find((h) => h.registrationId === r.registrationId)!, { rank: null })),
  };
}

/** Certification (Rules 5.6): writes Advancement rows and a hashed certification document. */
export async function certifyRound(roundId: string, actor: Actor) {
  const round = await db.round.findUniqueOrThrow({ where: { id: roundId }, include: { form: true, meritOpen: true } });
  if (round.status !== 'scoring') throw new Error('Round must be scored before certification.');
  const openFlags = await db.integrityFlag.count({ where: { status: 'open', attempt: { roundId } } });
  if (openFlags > 0) throw new Error(`${openFlags} integrity flag(s) are still open. Decide them before certifying (Rules 8.4).`);
  const preview = await advancementPreview(roundId);
  const now = new Date();
  const open = await getOpenById(round.meritOpenId);
  const cfg = parseConfig(latestRuleset(open!));
  const disputeHours = cfg?.disputeWindowHours ?? 72;
  const deadline = new Date(now.getTime() + disputeHours * 3600e3);

  const type = round.number === 'r1' ? 'r1_pass_list' : round.number === 'r2' ? 'r2_advancement' : round.number === 'r3' ? 'r3_advancement' : 'winner';
  const document = {
    meritOpen: round.meritOpen.slug, round: round.number, certifiedAt: now.toISOString(), rulesHash: round.meritOpen.rulesHash, packageHash: round.form?.packageHash,
    capacity: preview.capacity, inclusionRuleApplied: preview.result?.inclusionRuleApplied ?? false, tiedAtCutoff: preview.result?.tiedAtCutoff ?? 0,
    decisions: preview.rows.map((r) => ({ registrationId: r.registrationId, rank: r.rank, totalPoints: r.totalPoints, tieOrderPoints: r.tieOrderPoints, elapsedSeconds: r.elapsedSeconds, advanced: r.advanced, reason: r.reason })),
    finalTied: preview.final?.tied ?? false, leaders: preview.final?.leaders ?? [],
  };
  const hash = hashObject(document);
  const cert = await db.certification.create({ data: { meritOpenId: round.meritOpenId, roundId, type, documentJson: JSON.stringify(document), hash, signedById: actor.userId, signedAt: now } });
  await db.$transaction([
    db.advancement.deleteMany({ where: { roundId } }),
    db.advancement.createMany({ data: preview.rows.map((r) => ({ roundId, registrationId: r.registrationId, rank: r.rank, advanced: r.advanced, reason: r.reason, certificationId: cert.id, certifiedAt: now })) }),
    db.round.update({ where: { id: roundId }, data: { status: 'certified', scoresPostedAt: now, disputeDeadlineAt: deadline } }),
  ]);
  await audit({ actorId: actor.userId, actorRole: actor.role, action: 'round.certify', objectType: 'Round', objectId: roundId, after: { certificationId: cert.id, hash, advanced: preview.rows.filter((r) => r.advanced).length } });

  // state machine: move the Merit Open forward
  const next = round.number === 'r1' ? 'r2' : round.number === 'r2' ? 'r3' : round.number === 'r3' ? 'final' : preview.final?.tied ? 'tiebreak' : 'certification';
  const t = await transitionOpen(round.meritOpenId, next, actor);
  if (!t.ok && next !== 'tiebreak') {
    // moving into a round requires its hash; surface but keep the certification
    await audit({ actorId: actor.userId, actorRole: actor.role, action: 'meritopen.transition.blocked', objectType: 'MeritOpen', objectId: round.meritOpenId, detail: { to: next, error: t.error } });
  }
  if (next === 'tiebreak' && preview.final) {
    const tb = await db.round.findFirst({ where: { meritOpenId: round.meritOpenId, number: { startsWith: 'tiebreak' }, status: 'scheduled' }, orderBy: { sequence: 'asc' } });
    if (tb) {
      await db.advancement.deleteMany({ where: { roundId: tb.id } });
      await db.advancement.createMany({ data: preview.final.leaders.map((registrationId) => ({ roundId: tb.id, registrationId, advanced: true, reason: 'tied_leader', certificationId: cert.id, certifiedAt: now })) });
      await db.round.update({ where: { id: tb.id }, data: { status: 'open' } });
    }
  }
  if (next === 'certification' && preview.final?.leaders[0]) {
    await db.meritOpen.update({ where: { id: round.meritOpenId }, data: { winnerRegistrationId: preview.final.leaders[0] } });
  }
  await broadcastNotice({ meritOpenId: round.meritOpenId, kind: 'result', subject: `${round.meritOpen.name}: ${round.number.toUpperCase()} results certified`, body: `Scores for ${round.number.toUpperCase()} are posted in your account. Certification ${hash.slice(0, 16)}… You may challenge your own score until ${deadline.toISOString()} (Rules 11.1).` });
  return { certificationId: cert.id, hash, advanced: preview.rows.filter((r) => r.advanced).length, next, transition: t };
}
