import { siteMode } from '@/lib/site-mode';
export { staffRoleFor, staffListsConfigured, type StaffRole } from './staff';

/**
 * Sign-in mode. `email`: passwordless one-time codes. `demo`: typed emails sign in directly
 * and create registrant accounts; the seeded personas for every realm are offered.
 * Follows the site mode (demo → demo, live → email) unless AUTH_MODE pins it. Staff roles
 * come from environment lists, never from sign-in itself.
 */
export type AuthMode = 'demo' | 'email';

export async function authMode(): Promise<AuthMode> {
  const m = process.env.AUTH_MODE;
  if (m === 'demo' || m === 'email') return m;
  return (await siteMode()) === 'demo' ? 'demo' : 'email';
}

/** Demo personas let anyone act as staff, so they render only in demo mode (or when AUTH_DEMO_PERSONAS pins them). */
export async function demoPersonasEnabled(): Promise<boolean> {
  if (process.env.AUTH_DEMO_PERSONAS === 'true') return true;
  if (process.env.AUTH_DEMO_PERSONAS === 'false') return false;
  return (await siteMode()) === 'demo';
}
