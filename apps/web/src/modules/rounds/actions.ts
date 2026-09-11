'use server';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { getSession } from '@/lib/auth/session';
import { clientIp, userAgent } from '@/lib/geo';
import { getProctoringProvider } from '@/lib/providers/proctoring';
import { attemptCookieName, getRoundContext } from './service';

/** Start the single permitted attempt. Server time is authoritative; the client timer is display only. */
export async function startAttemptAction(formData: FormData) {
  const s = await getSession();
  const slug = String(formData.get('openSlug') ?? '');
  const roundNumber = String(formData.get('roundNumber') ?? '');
  const fingerprint = String(formData.get('fingerprint') ?? '').slice(0, 128) || null;
  const path = `/test/${slug}/${roundNumber}`;
  if (!s) redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  const ctx = await getRoundContext(slug, roundNumber, s.userId);
  if (!ctx || !ctx.registration) redirect(path);
  if (ctx.gate.state !== 'ready') redirect(`${path}?notice=${encodeURIComponent(ctx.gate.reason ?? ctx.gate.state)}`);
  const { round, registration, open } = ctx;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (round.durationSeconds + ctx.extraTimeSeconds) * 1000);
  const sessionToken = randomBytes(24).toString('base64url');
  const ip = await clientIp();
  const ua = await userAgent();
  let attempt;
  try {
    attempt = await db.attempt.create({
      data: { registrationId: registration.id, roundId: round.id, formId: round.formId!, startedAt: now, expiresAt, sessionToken, deviceFingerprint: fingerprint, ip, userAgent: ua, status: 'in_progress' },
    });
  } catch {
    redirect(`${path}?notice=${encodeURIComponent('An attempt already exists for this round.')}`);
  }
  if (fingerprint) {
    const user = await db.user.findUnique({ where: { id: s.userId }, select: { deviceFingerprintsJson: true } });
    const list = new Set<string>(JSON.parse(user?.deviceFingerprintsJson ?? '[]'));
    list.add(fingerprint);
    await db.user.update({ where: { id: s.userId }, data: { deviceFingerprintsJson: JSON.stringify([...list].slice(-10)) } });
  }
  if (round.integrityTier >= 2) {
    const p = await getProctoringProvider().createSession({ attemptId: attempt.id, userId: s.userId, roundLabel: `${open.name} — ${round.number}` });
    await db.attempt.update({ where: { id: attempt.id }, data: { proctoringSessionRef: p.ref } });
  }
  const jar = await cookies();
  jar.set(attemptCookieName(attempt.id), sessionToken, { httpOnly: true, sameSite: 'strict', secure: env.isProd, path: '/', maxAge: round.durationSeconds + ctx.extraTimeSeconds + 3600 });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'attempt.start', objectType: 'Attempt', objectId: attempt.id, detail: { round: round.number, startedAt: now.toISOString(), expiresAt: expiresAt.toISOString(), tier: round.integrityTier }, ip });
  redirect(path);
}

export interface SubmitInput {
  attemptId: string;
  answers: Record<string, string>;
  renderedAt: Record<string, number>;
}

/** Submit once. Late submissions (beyond duration + latency grace) are recorded as expired and never scored. */
export async function submitAttempt(input: SubmitInput): Promise<{ ok: boolean; status: string; error?: string }> {
  const s = await getSession();
  if (!s) return { ok: false, status: 'unauthenticated', error: 'Sign in required' };
  const attempt = await db.attempt.findUnique({ where: { id: input.attemptId }, include: { round: true, registration: true } });
  if (!attempt || attempt.registration.userId !== s.userId) return { ok: false, status: 'not_found', error: 'Attempt not found' };
  const jar = await cookies();
  if (jar.get(attemptCookieName(attempt.id))?.value !== attempt.sessionToken) return { ok: false, status: 'other_device', error: 'This attempt is active on another device.' };
  if (attempt.status !== 'in_progress') return { ok: false, status: attempt.status, error: 'This attempt is no longer open.' };
  const now = new Date();
  const deadline = attempt.expiresAt.getTime() + attempt.round.latencyGraceSeconds * 1000;
  if (now.getTime() > deadline) {
    await db.attempt.update({ where: { id: attempt.id }, data: { status: 'expired' } });
    await audit({ actorId: s.userId, actorRole: s.role, action: 'attempt.expire', objectType: 'Attempt', objectId: attempt.id, detail: { lateBySeconds: Math.round((now.getTime() - deadline) / 1000) } });
    return { ok: false, status: 'expired', error: 'The time limit passed before your submission arrived.' };
  }
  const items = await db.item.findMany({ where: { formId: attempt.formId }, select: { id: true } });
  const ids = new Set(items.map((i) => i.id));
  const rows = Object.entries(input.answers)
    .filter(([itemId]) => ids.has(itemId))
    .map(([itemId, raw]) => ({ attemptId: attempt.id, itemId, rawAnswer: String(raw ?? '').slice(0, 4000), renderedAt: input.renderedAt[itemId] ? new Date(input.renderedAt[itemId]!) : null, submittedAt: now }));
  await db.$transaction([
    db.response.deleteMany({ where: { attemptId: attempt.id } }),
    db.response.createMany({ data: rows }),
    db.attempt.update({ where: { id: attempt.id }, data: { status: 'submitted', submittedAt: now } }),
  ]);
  await audit({ actorId: s.userId, actorRole: s.role, action: 'attempt.submit', objectType: 'Attempt', objectId: attempt.id, detail: { answered: rows.filter((r) => r.rawAnswer.trim()).length, of: ids.size, submittedAt: now.toISOString() } });
  return { ok: true, status: 'submitted' };
}
