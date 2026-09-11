import 'server-only';
import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

/**
 * Local session provider: an HMAC-signed, httpOnly cookie. This is the `local`
 * AUTH_PROVIDER. Swap `createSession`/`getSession` for your IdP (e.g. Clerk) in
 * one place; every guard and action reads through this module. MFA for staff
 * roles is an IdP concern and is enforced at that layer in production.
 */
export const SESSION_COOKIE = 'etk_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Role = 'registrant' | 'admin' | 'item_author' | 'administrator' | 'proctor' | 'auditor';
export interface Session { userId: string; role: Role; email: string; name: string | null; issuedAt: number }

function sign(payload: string): string {
  return createHmac('sha256', env.sessionSecret).update(payload).digest('base64url');
}

export function encodeSession(s: Session): string {
  const payload = Buffer.from(JSON.stringify(s), 'utf8').toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined | null): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session;
    if (!s.userId || !s.role || Date.now() - s.issuedAt > MAX_AGE_SECONDS * 1000) return null;
    return s;
  } catch { return null; }
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value);
}

export async function createSession(user: { id: string; role: string; email: string; legalName: string | null }) {
  const jar = await cookies();
  const s: Session = { userId: user.id, role: user.role as Role, email: user.email, name: user.legalName, issuedAt: Date.now() };
  jar.set(SESSION_COOKIE, encodeSession(s), { httpOnly: true, sameSite: 'lax', secure: env.isProd, path: '/', maxAge: MAX_AGE_SECONDS });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
