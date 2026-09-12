/** Staff role lists from the environment. Kept dependency-free so both auth mode and site mode can read them. */
export type StaffRole = 'admin' | 'administrator' | 'auditor' | 'item_author';

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

export const platformAdminsListed = (): boolean => list('PLATFORM_ADMIN_EMAILS').length > 0;
