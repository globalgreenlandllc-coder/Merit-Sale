import 'server-only';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSession, type Role, type Session } from './session';

export class Forbidden extends Error { constructor(msg = 'Forbidden') { super(msg); this.name = 'Forbidden'; } }

export async function requireSession(next?: string): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  return s;
}

/** Role guard for pages. Roles are realms: an admin is never an administrator and vice versa. */
export async function requireRole(roles: Role[], next?: string): Promise<Session> {
  const s = await requireSession(next);
  if (!roles.includes(s.role)) redirect(`/sign-in?denied=${s.role}&need=${roles.join(',')}`);
  return s;
}

/** Role guard for server actions and route handlers: throws instead of redirecting. */
export async function assertRole(roles: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Forbidden('Sign in required');
  if (!roles.includes(s.role)) throw new Forbidden(`Requires ${roles.join(' or ')}; you are ${s.role}`);
  return s;
}

export async function currentUser() {
  const s = await getSession();
  if (!s) return null;
  return db.user.findUnique({ where: { id: s.userId } });
}
