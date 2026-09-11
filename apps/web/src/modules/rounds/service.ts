import 'server-only';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { safeJson } from '@/lib/format';
import { getOpenBySlug, type OpenFull, type RoundFull } from '@/modules/meritopens/queries';

export type GateState = 'not_signed_in' | 'not_registered' | 'not_eligible' | 'not_open' | 'ready' | 'in_progress' | 'submitted' | 'expired' | 'voided' | 'other_device';

export interface PublicItemView {
  id: string; position: number; prompt: string; inputType: string; inputHint: string | null; maxPoints: number;
  fields: { key: string; label: string }[] | null; calculatorPermitted: boolean;
}

export interface RoundContext {
  open: OpenFull;
  round: RoundFull;
  registration: { id: string; status: string } | null;
  attempt: { id: string; status: string; startedAt: Date; expiresAt: Date; submittedAt: Date | null; sessionToken: string } | null;
  items: PublicItemView[];
  gate: { state: GateState; reason: string | null };
  serverNow: number;
  extraTimeSeconds: number;
}

export function attemptCookieName(attemptId: string) { return `etk_att_${attemptId}`; }

export function roundWindow(round: RoundFull, now = new Date()) {
  const t = now.getTime();
  if (round.windowStart && round.windowEnd) {
    if (t < round.windowStart.getTime()) return { open: false, reason: 'This round has not opened yet.' };
    if (t > round.windowEnd.getTime()) return { open: false, reason: 'The window for this round has closed.' };
    return { open: true, reason: null };
  }
  if (round.scheduledAt) {
    const start = round.scheduledAt.getTime();
    if (t < start) return { open: false, reason: 'This session has not started. All registrants unlock at the same server time.' };
    if (t > start + (round.durationSeconds + 1800) * 1000) return { open: false, reason: 'This session has ended.' };
    return { open: true, reason: null };
  }
  return { open: false, reason: 'This round is not scheduled.' };
}

/** Prerequisite: certified advancement into this round (or a confirmed registration for R1). */
export async function advancedInto(open: OpenFull, round: RoundFull, registrationId: string): Promise<boolean> {
  if (round.number === 'r1') return true;
  const prev = open.rounds.filter((r) => r.sequence < round.sequence).sort((a, b) => b.sequence - a.sequence)[0];
  if (!prev) return false;
  const adv = await db.advancement.findUnique({ where: { roundId_registrationId: { roundId: prev.id, registrationId } } });
  return !!adv?.advanced && !!adv.certifiedAt;
}

export async function expireIfStale(attempt: { id: string; status: string; expiresAt: Date }, graceSeconds: number) {
  if (attempt.status === 'in_progress' && Date.now() > attempt.expiresAt.getTime() + graceSeconds * 1000) {
    await db.attempt.update({ where: { id: attempt.id }, data: { status: 'expired' } });
    return 'expired';
  }
  return attempt.status;
}

export async function getRoundContext(openSlug: string, roundNumber: string, userId: string | null): Promise<RoundContext | null> {
  const open = await getOpenBySlug(openSlug);
  if (!open) return null;
  const round = open.rounds.find((r) => r.number === roundNumber);
  if (!round) return null;
  const serverNow = Date.now();
  const base = { open, round, registration: null, attempt: null, items: [], serverNow, extraTimeSeconds: 0 };

  if (!userId) return { ...base, gate: { state: 'not_signed_in', reason: 'Sign in to continue.' } };
  const registration = await db.registration.findUnique({ where: { userId_meritOpenId: { userId, meritOpenId: open.id } }, select: { id: true, status: true } });
  if (!registration || registration.status !== 'confirmed') return { ...base, registration, gate: { state: 'not_registered', reason: registration ? `Your registration is ${registration.status}.` : 'You do not hold a confirmed registration for this Merit Open.' } };

  const acc = await db.accommodation.findUnique({ where: { userId_meritOpenId: { userId, meritOpenId: open.id } } });
  const extraTimeSeconds = acc?.status === 'granted' ? acc.extraTimeSeconds : 0;

  const attemptRow = await db.attempt.findUnique({ where: { registrationId_roundId: { registrationId: registration.id, roundId: round.id } } });
  if (attemptRow) {
    const status = await expireIfStale(attemptRow, round.latencyGraceSeconds);
    const attempt = { id: attemptRow.id, status, startedAt: attemptRow.startedAt, expiresAt: attemptRow.expiresAt, submittedAt: attemptRow.submittedAt, sessionToken: attemptRow.sessionToken };
    if (status === 'submitted') return { ...base, registration, attempt, extraTimeSeconds, gate: { state: 'submitted', reason: 'Your answers were received. Scores are posted after the round closes and the Administrator unseals the key.' } };
    if (status === 'expired') return { ...base, registration, attempt, extraTimeSeconds, gate: { state: 'expired', reason: 'The time limit passed before a submission was received. One attempt per round (Rules 4.7).' } };
    if (status === 'voided') return { ...base, registration, attempt, extraTimeSeconds, gate: { state: 'voided', reason: 'This attempt was voided by the Administrator.' } };
    const jar = await cookies();
    if (jar.get(attemptCookieName(attemptRow.id))?.value !== attemptRow.sessionToken) return { ...base, registration, attempt, extraTimeSeconds, gate: { state: 'other_device', reason: 'This attempt is active on another device or browser. Only one session may be active (Rules 8.1).' } };
    const items = await publicItems(attemptRow.formId);
    return { ...base, registration, attempt, items, extraTimeSeconds, gate: { state: 'in_progress', reason: null } };
  }

  if (!(await advancedInto(open, round, registration.id))) return { ...base, registration, extraTimeSeconds, gate: { state: 'not_eligible', reason: 'Advancement into this round has not been certified for your registration.' } };
  if (open.status !== round.number && !(open.status === 'tiebreak' && round.number.startsWith('tiebreak'))) return { ...base, registration, extraTimeSeconds, gate: { state: 'not_open', reason: `The Merit Open is in the ${open.status.replace(/_/g, ' ')} stage.` } };
  if (round.status !== 'open') return { ...base, registration, extraTimeSeconds, gate: { state: 'not_open', reason: 'The Administrator has not opened this round.' } };
  if (!round.form?.hashPublishedAt) return { ...base, registration, extraTimeSeconds, gate: { state: 'not_open', reason: 'The form hash has not been published; the round cannot open (Rules 7.1).' } };
  const win = roundWindow(round);
  if (!win.open) return { ...base, registration, extraTimeSeconds, gate: { state: 'not_open', reason: win.reason } };
  return { ...base, registration, extraTimeSeconds, gate: { state: 'ready', reason: null } };
}

export async function publicItems(formId: string): Promise<PublicItemView[]> {
  const rows = await db.item.findMany({ where: { formId }, orderBy: { position: 'asc' }, select: { id: true, position: true, prompt: true, inputType: true, inputHint: true, maxPoints: true, fieldsJson: true, calculatorPermitted: true } });
  return rows.map((r) => ({ ...r, fields: safeJson<{ key: string; label: string }[] | null>(r.fieldsJson, null) }));
}

export async function appendFocusEvents(attemptId: string, sessionToken: string, events: { type: string; at: number }[]) {
  const a = await db.attempt.findUnique({ where: { id: attemptId } });
  if (!a || a.sessionToken !== sessionToken || a.status !== 'in_progress') return false;
  const existing = safeJson<{ type: string; at: number }[]>(a.focusLossEventsJson, []);
  const merged = [...existing, ...events.filter((e) => typeof e.type === 'string' && typeof e.at === 'number')].slice(0, 500);
  await db.attempt.update({ where: { id: attemptId }, data: { focusLossEventsJson: JSON.stringify(merged) } });
  return true;
}

export async function voidAttempt(attemptId: string, reason: string, actor: { userId: string; role: string }) {
  await db.attempt.update({ where: { id: attemptId }, data: { status: 'voided', voidReason: reason } });
  await audit({ actorId: actor.userId, actorRole: actor.role, action: 'attempt.void', objectType: 'Attempt', objectId: attemptId, detail: { reason } });
}
