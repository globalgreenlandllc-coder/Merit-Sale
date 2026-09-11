/**
 * Sign-in mode. `email`: passwordless one-time codes (production default). `demo`: local
 * development; typed emails create registrant accounts. Staff roles come from environment
 * lists, never from sign-in itself. Demo personas (all roles) render only when explicitly
 * enabled, because they let anyone act as staff.
 */
export type AuthMode = 'demo' | 'email';
export type StaffRole = 'admin' | 'administrator' | 'auditor' | 'item_author';

export function authMode(): AuthMode {
  const m = process.env.AUTH_MODE;
  if (m === 'demo' || m === 'email') return m;
  return process.env.NODE_ENV === 'production' ? 'email' : 'demo';
}

export function demoPersonasEnabled(): boolean {
  if (process.env.AUTH_DEMO_PERSONAS === 'true') return true;
  return authMode() === 'demo' && process.env.NODE_ENV !== 'production';
}

const list = (name: string) => (process.env[name] ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

/** Role granted by the environment lists, or null for an ordinary registrant. */
export function staffRoleFor(email: string): StaffRole | null {
  const e = email.toLowerCase();
  if (list('PLATFORM_ADMIN_EMAILS').includes(e)) return 'admin';
  if (list('ADMINISTRATOR_EMAILS').includes(e)) return 'administrator';
  if (list('AUDITOR_EMAILS').includes(e)) return 'auditor';
  if (list('ITEM_AUTHOR_EMAILS').includes(e)) return 'item_author';
  return null;
}

export function staffListsConfigured(): boolean {
  return ['PLATFORM_ADMIN_EMAILS', 'ADMINISTRATOR_EMAILS', 'AUDITOR_EMAILS', 'ITEM_AUTHOR_EMAILS'].some((n) => list(n).length > 0);
}
