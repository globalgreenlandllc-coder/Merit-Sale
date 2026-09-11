import 'server-only';
import { db } from '@/lib/db';
import type { StageCounts, MyStage } from '@/components/site/StageTracker';
import type { OpenFull } from './queries';

/** Public counts per stage, computed from certified advancement rows only. */
export async function stageCounts(open: OpenFull): Promise<StageCounts> {
  const [registrations, reservations] = await Promise.all([db.registration.count({ where: { meritOpenId: open.id, status: 'confirmed' } }), db.reservation.count({ where: { meritOpenId: open.id } })]);
  const adv = async (n: string) => { const r = open.rounds.find((x) => x.number === n); if (!r || r.status !== 'certified') return undefined; return db.advancement.count({ where: { roundId: r.id, advanced: true } }); };
  const [r1Passed, r2Advanced, r3Advanced] = await Promise.all([adv('r1'), adv('r2'), adv('r3')]);
  return { registrations, reservations, r1Passed, r2Advanced, r3Advanced, certified: open.certifications.some((c) => c.type === 'winner') };
}

/** A signed-in person's own line per stage. */
export async function myStage(open: OpenFull, userId: string | null): Promise<MyStage | null> {
  if (!userId) return null;
  const reg = await db.registration.findUnique({ where: { userId_meritOpenId: { userId, meritOpenId: open.id } }, include: { attempts: { include: { round: true } }, advancements: { include: { round: true } } } });
  if (!reg) return { registered: false, rounds: {} };
  const rounds: MyStage['rounds'] = {};
  for (const r of open.rounds) {
    const a = reg.attempts.find((x) => x.roundId === r.id); const v = reg.advancements.find((x) => x.roundId === r.id);
    rounds[r.number] = { attempt: a?.status, advanced: v?.certifiedAt ? v.advanced : undefined, rank: v?.rank ?? null, reason: v?.reason };
  }
  return { registered: true, status: reg.status, rounds };
}
