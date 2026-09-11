'use server';
import { createHmac, randomInt } from 'node:crypto';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { audit } from '@/lib/audit';
import { clientIp } from '@/lib/geo';
import { createSession } from '@/lib/auth/session';
import { authMode, staffRoleFor } from '@/lib/auth/mode';
import { sendEmail } from '@/lib/providers/email';

const CODE_TTL_MS = 10 * 60_000;
const MAX_CODES_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

const normalize = (v: FormDataEntryValue | null) => String(v ?? '').trim().toLowerCase();
const validEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 254;
const hash = (email: string, code: string) => createHmac('sha256', env.sessionSecret).update(`${email}:${code}`).digest('hex');
function safeNext(v: FormDataEntryValue | null, fallback = '/account') { const s = typeof v === 'string' ? v : ''; return s.startsWith('/') && !s.startsWith('//') ? s : fallback; }
const back = (email: string, next: string, extra: Record<string, string> = {}) => `/sign-in?${new URLSearchParams({ email, next, ...extra }).toString()}`;

/** Step 1: issue a one-time code. Rate-limited per address; never reveals whether the account exists. */
export async function requestCodeAction(formData: FormData) {
  const email = normalize(formData.get('email'));
  const next = safeNext(formData.get('next'));
  if (!validEmail(email)) redirect(`/sign-in?error=email&next=${encodeURIComponent(next)}`);
  const recent = await db.loginCode.count({ where: { email, createdAt: { gt: new Date(Date.now() - 3_600_000) } } });
  if (recent >= MAX_CODES_PER_HOUR) redirect(back(email, next, { error: 'rate' }));
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const ip = await clientIp();
  await db.loginCode.create({ data: { email, codeHash: hash(email, code), expiresAt: new Date(Date.now() + CODE_TTL_MS), ip } });
  const result = await sendEmail({
    to: email, subject: `${code} is your Earn the Keys sign-in code`,
    text: `Your sign-in code is ${code}. It expires in 10 minutes. If you did not request it, ignore this message.`,
    html: `<p style="font:16px system-ui">Your sign-in code is</p><p style="font:32px/1 ui-monospace,monospace;letter-spacing:.2em">${code}</p><p style="font:14px system-ui;color:#555">It expires in 10 minutes. If you did not request it, ignore this message.</p>`,
  });
  await audit({ actorRole: 'visitor', action: 'auth.code.issue', objectType: 'LoginCode', objectId: email, detail: { delivered: result.delivered, via: result.via }, ip });
  const showCode = authMode() === 'demo' && process.env.NODE_ENV !== 'production';
  redirect(back(email, next, { step: 'code', ...(result.delivered ? { sent: '1' } : { notdelivered: '1' }), ...(showCode ? { demo_code: code } : {}) }));
}

/** Step 2: verify the code, provision the account, grant the role listed in the environment, start the session. */
export async function verifyCodeAction(formData: FormData) {
  const email = normalize(formData.get('email'));
  const code = String(formData.get('code') ?? '').replace(/\D/g, '');
  const next = safeNext(formData.get('next'));
  if (!validEmail(email) || code.length !== 6) redirect(back(email, next, { step: 'code', error: 'code' }));
  const row = await db.loginCode.findFirst({ where: { email, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!row || row.attempts >= MAX_ATTEMPTS) redirect(back(email, next, { error: 'expired' }));
  if (row.codeHash !== hash(email, code)) {
    await db.loginCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    redirect(back(email, next, { step: 'code', error: row.attempts + 1 >= MAX_ATTEMPTS ? 'expired' : 'code' }));
  }
  await db.loginCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  const staff = staffRoleFor(email);
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({ data: { email, role: staff ?? 'registrant' } });
    await audit({ actorId: user.id, actorRole: user.role, action: 'account.create', objectType: 'User', objectId: user.id, detail: { via: 'email_code' } });
  } else if (staff && user.role !== staff) {
    user = await db.user.update({ where: { id: user.id }, data: { role: staff } });
    await audit({ actorId: user.id, actorRole: staff, action: 'account.role', objectType: 'User', objectId: user.id, after: { role: staff }, detail: { source: 'environment list' } });
  }
  await createSession(user);
  await audit({ actorId: user.id, actorRole: user.role, action: 'session.create', objectType: 'User', objectId: user.id, detail: { via: 'email_code' } });
  const home = user.role === 'admin' ? '/admin' : user.role === 'administrator' ? '/administrator' : user.role === 'auditor' ? '/auditor' : user.role === 'item_author' ? '/admin/opens' : next;
  redirect(next !== '/account' ? next : home);
}
