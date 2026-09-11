import 'server-only';
import { db } from '@/lib/db';
import { safeJson } from '@/lib/format';
import type { OpenFull } from '@/modules/meritopens/queries';

/** Public audit summary (Rules 14.3), generated from the record; nothing is typed in by hand. */
export async function buildAuditSummary(open: OpenFull) {
  const regs = await db.registration.findMany({ where: { meritOpenId: open.id, status: { in: ['confirmed', 'disqualified', 'refunded'] } }, select: { status: true, eligibilitySnapshotJson: true } });
  const byState: Record<string, number> = {};
  for (const r of regs) { const st = safeJson<{ state?: string }>(r.eligibilitySnapshotJson, {}).state ?? '??'; byState[st] = (byState[st] ?? 0) + 1; }
  const rounds = [] as { number: string; status: string; attempts: number; scored: number; advanced: number; certifiedAt: Date | null; packageHash: string | null; released: boolean; inclusionRuleApplied: boolean }[];
  for (const r of open.rounds) {
    const [attempts, scored, advanced] = await Promise.all([
      db.attempt.count({ where: { roundId: r.id, status: { in: ['submitted', 'expired', 'voided'] } } }),
      db.score.count({ where: { attempt: { roundId: r.id } } }),
      db.advancement.count({ where: { roundId: r.id, advanced: true } }),
    ]);
    const cert = open.certifications.find((c) => c.roundId === r.id && c.type !== 'release');
    const doc = cert ? safeJson<{ inclusionRuleApplied?: boolean }>(cert.documentJson, {}) : {};
    rounds.push({ number: r.number, status: r.status, attempts, scored, advanced, certifiedAt: cert?.signedAt ?? null, packageHash: r.form?.packageHash ?? null, released: !!r.form?.packageReleasedAt, inclusionRuleApplied: !!doc.inclusionRuleApplied });
  }
  const flags = await db.integrityFlag.groupBy({ by: ['type', 'status'], where: { attempt: { round: { meritOpenId: open.id } } }, _count: { _all: true } });
  const disputes = await db.dispute.groupBy({ by: ['type', 'status'], where: { OR: [{ registration: { meritOpenId: open.id } }, { round: { meritOpenId: open.id } }] }, _count: { _all: true } });
  const winnerCert = open.certifications.find((c) => c.type === 'winner');
  let winner: { score: number | null; name: string | null; city: string | null } | null = null;
  if (winnerCert && open.winnerRegistrationId) {
    const doc = safeJson<{ certifiedScore?: number }>(winnerCert.documentJson, {});
    const reg = await db.registration.findUnique({ where: { id: open.winnerRegistrationId }, include: { user: true } });
    winner = { score: doc.certifiedScore ?? null, name: open.winnerConsentToPublish ? reg?.user.legalName ?? null : null, city: open.winnerConsentToPublish ? reg?.user.residenceAddress?.split(',').slice(-2).join(',').trim() ?? null : null };
  }
  return {
    registrations: regs.filter((r) => r.status !== 'refunded').length,
    byState,
    rounds,
    flags: flags.map((f) => ({ type: f.type, status: f.status, count: f._count._all })),
    disputes: disputes.map((d) => ({ type: d.type, status: d.status, count: d._count._all })),
    winner,
    certifications: open.certifications.map((c) => ({ type: c.type, hash: c.hash, signedAt: c.signedAt })),
    rulesHash: open.rulesHash,
    cancellation: open.status === 'cancelled' ? { code: open.cancellationReasonCode, note: open.cancellationNote, at: open.cancelledAt } : null,
  };
}
