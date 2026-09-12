import { ConsoleShell } from '@/components/console/ConsoleShell';
import { requireRole } from '@/lib/auth/guards';
const nav = [{ href: '/auditor', label: 'Audit log' }, { href: '/auditor/custody', label: 'Custody reconciliation' }, { href: '/registry', label: 'Public registry →' }, { href: '/audit', label: 'Public summaries →' }];
export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(['auditor', 'administrator'], '/auditor');
  return <ConsoleShell realm="Auditor (read-only)" nav={nav} session={session}>{children}</ConsoleShell>;
}
