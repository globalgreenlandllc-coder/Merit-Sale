import 'server-only';
import { db } from '@/lib/db';
import { sendEmail } from './email';

/**
 * Legal notices are mandatory sends and are logged per user (spec §6). Marketing is
 * a separate channel with opt-out and is not modelled here. The transport (email/SMS
 * provider) is swapped in `deliver`.
 */
export async function sendNotice(args: { userId: string; meritOpenId?: string | null; kind: 'legal_notice' | 'receipt' | 'schedule' | 'result'; subject: string; body: string }) {
  const row = await db.notification.create({
    data: { userId: args.userId, meritOpenId: args.meritOpenId ?? null, kind: args.kind, mandatory: args.kind === 'legal_notice', subject: args.subject, body: args.body },
  });
  await deliver(row.id);
  return row;
}

export async function broadcastNotice(args: { meritOpenId: string; subject: string; body: string; kind?: 'legal_notice' | 'schedule' | 'result' }) {
  const regs = await db.registration.findMany({ where: { meritOpenId: args.meritOpenId, status: { in: ['confirmed', 'pending'] } }, select: { userId: true } });
  const users = new Set(regs.map((r) => r.userId));
  for (const userId of users) await sendNotice({ userId, meritOpenId: args.meritOpenId, kind: args.kind ?? 'legal_notice', subject: args.subject, body: args.body });
  return users.size;
}

/** Mandatory notices go by email when a provider is configured; every notice is always visible in the account inbox. */
async function deliver(notificationId: string) {
  const n = await db.notification.findUnique({ where: { id: notificationId }, include: { user: { select: { email: true } } } });
  if (!n || n.user.email.endsWith('.test') || !process.env.RESEND_API_KEY) return;
  await sendEmail({ to: n.user.email, subject: `Earn the Keys — ${n.subject}`, text: `${n.body}\n\nThis notice is also in your account: ${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/account` });
}
