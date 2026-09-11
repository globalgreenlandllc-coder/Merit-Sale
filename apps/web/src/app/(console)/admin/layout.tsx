import { ConsoleShell } from '@/components/console/ConsoleShell';
import { requireRole } from '@/lib/auth/guards';

const nav = [
  { href: '/admin', label: 'Dashboard' }, { href: '/admin/properties', label: 'Properties' }, { href: '/admin/opens', label: 'Merit Opens' },
  { href: '/admin/registrations', label: 'Registrations (support)' }, { href: '/admin/refunds', label: 'Refund queue' }, { href: '/admin/states', label: 'States matrix' },
  { href: '/admin/exclusions', label: 'Exclusion lists' }, { href: '/admin/vendors', label: 'Vendors' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(['admin', 'item_author'], '/admin');
  return <ConsoleShell realm="Platform admin" nav={session.role === 'item_author' ? nav.filter((n) => n.href === '/admin/opens') : nav} session={session}>{children}</ConsoleShell>;
}
