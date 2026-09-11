import { ConsoleShell } from '@/components/console/ConsoleShell';
import { requireRole } from '@/lib/auth/guards';
const nav = [{ href: '/administrator', label: 'Queue' }, { href: '/administrator/flags', label: 'Integrity flags' }, { href: '/administrator/disputes', label: 'Disputes' }, { href: '/administrator/accommodations', label: 'Accommodations' }, { href: '/auditor', label: 'Audit log' }, { href: '/registry', label: 'Public registry →' }];
export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(['administrator'], '/administrator');
  return <ConsoleShell realm="Independent Administrator" nav={nav} session={session}>{children}</ConsoleShell>;
}
