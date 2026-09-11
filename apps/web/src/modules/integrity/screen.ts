import 'server-only';
import { db } from '@/lib/db';
import { safeJson } from '@/lib/format';

const CFG = { minClusterSize: 3, minSharedWrong: 2, perItemFloorSeconds: 4, minFastItems: 3, focusLossThreshold: 3 };

/**
 * Batch screening after R1/R2 (spec §4.8). Produces evidence-bearing flags; only the
 * Administrator decides them. Screening never changes a score.
 */
export async function screenRound(roundId: string): Promise<number> {
  const attempts = await db.attempt.findMany({
    where: { roundId, status: 'submitted' },
    include: { responses: { include: { item: { select: { position: true } } }, orderBy: { submittedAt: 'asc' } }, integrityFlags: true, registration: { select: { userId: true } } },
  });
  const existing = new Set(attempts.flatMap((a) => a.integrityFlags.map((f) => `${a.id}:${f.type}`)));
  const pending: { attemptId: string; type: string; evidence: unknown }[] = [];
  const add = (attemptId: string, type: string, evidence: unknown) => { if (!existing.has(`${attemptId}:${type}`)) pending.push({ attemptId, type, evidence }); };

  // 1. identical wrong-answer vectors across accounts
  const vectorKey = (a: (typeof attempts)[number]) => a.responses.filter((r) => r.valid !== null && r.score === 0 && r.rawAnswer.trim()).map((r) => `${r.item.position}=${(r.canonical ?? r.rawAnswer).trim().toLowerCase()}`).sort().join('|');
  const clusters = new Map<string, string[]>();
  for (const a of attempts) {
    const k = vectorKey(a);
    if (k.split('|').filter(Boolean).length < CFG.minSharedWrong) continue;
    clusters.set(k, [...(clusters.get(k) ?? []), a.id]);
  }
  for (const [k, ids] of clusters) if (ids.length >= CFG.minClusterSize) for (const id of ids) add(id, 'duplicate_answers', { sharedWrongAnswers: k.split('|'), clusterSize: ids.length, attemptIds: ids });

  // 2. implausible per-item timing
  for (const a of attempts) {
    const times = a.responses.filter((r) => r.renderedAt).map((r) => ({ position: r.item.position, seconds: (r.submittedAt.getTime() - r.renderedAt!.getTime()) / 1000 }));
    const fast = times.filter((t) => t.seconds >= 0 && t.seconds < CFG.perItemFloorSeconds);
    if (times.length >= 3 && fast.length >= CFG.minFastItems) add(a.id, 'implausible_timing', { floorSeconds: CFG.perItemFloorSeconds, fastItems: fast });
  }

  // 3. shared device / network across registrations
  const byFp = new Map<string, string[]>();
  const byIp = new Map<string, string[]>();
  for (const a of attempts) {
    if (a.deviceFingerprint) byFp.set(a.deviceFingerprint, [...(byFp.get(a.deviceFingerprint) ?? []), a.id]);
    if (a.ip && a.ip !== '127.0.0.1' && a.ip !== '::1') byIp.set(a.ip, [...(byIp.get(a.ip) ?? []), a.id]);
  }
  for (const [fp, ids] of byFp) if (ids.length > 1) for (const id of ids) add(id, 'shared_device', { fingerprint: fp, attemptIds: ids });
  for (const [ip, ids] of byIp) if (ids.length > 1) for (const id of ids) add(id, 'shared_network', { ip, attemptIds: ids });

  // 4. focus loss above threshold
  for (const a of attempts) {
    const events = safeJson<{ type: string; at: number }[]>(a.focusLossEventsJson, []);
    if (events.length > CFG.focusLossThreshold) add(a.id, 'focus_loss', { count: events.length, threshold: CFG.focusLossThreshold, events: events.slice(0, 20) });
  }

  if (pending.length) await db.integrityFlag.createMany({ data: pending.map((p) => ({ attemptId: p.attemptId, type: p.type, evidenceJson: JSON.stringify(p.evidence) })) });
  return pending.length;
}
