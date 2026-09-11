'use server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { assertRole } from '@/lib/auth/guards';
import { voidAttempt } from '@/modules/rounds/service';

/** Administrator clears or upholds a flag. Upheld → attempt voided, registration disqualified (spec §4.8). */
export async function decideFlagAction(formData: FormData) {
  const s = await assertRole(['administrator']);
  const flagId = String(formData.get('flagId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  const back = String(formData.get('back') ?? '/administrator/flags');
  if (!['cleared', 'upheld'].includes(decision)) redirect(back);
  const flag = await db.integrityFlag.findUniqueOrThrow({ where: { id: flagId }, include: { attempt: true } });
  await db.integrityFlag.update({ where: { id: flagId }, data: { status: decision, decidedById: s.userId, decidedAt: new Date(), decisionNote: note || null } });
  await audit({ actorId: s.userId, actorRole: s.role, action: `integrity.${decision}`, objectType: 'IntegrityFlag', objectId: flagId, detail: { type: flag.type, note } });
  if (decision === 'upheld') {
    await voidAttempt(flag.attemptId, `Integrity flag upheld: ${flag.type}`, s);
    await db.registration.update({ where: { id: flag.attempt.registrationId }, data: { status: 'disqualified', disqualifiedReason: `Integrity violation (${flag.type}) upheld by Administrator` } });
    await db.integrityFlag.updateMany({ where: { attemptId: flag.attemptId, status: 'open' }, data: { status: 'upheld', decidedById: s.userId, decidedAt: new Date(), decisionNote: 'Resolved with sibling flag' } });
    await audit({ actorId: s.userId, actorRole: s.role, action: 'registration.disqualify', objectType: 'Registration', objectId: flag.attempt.registrationId, detail: { flagId, type: flag.type } });
  }
  redirect(back);
}
