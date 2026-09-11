import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { Wordmark } from './Wordmark';
import { Container } from '@/components/ui/Container';

const nav = [
  { href: '/opens', label: 'Merit Opens' },
  { href: '/#how', label: 'How it works' },
  { href: '/registry', label: 'Registry' },
  { href: '/audit', label: 'Audit' },
  { href: '/practice', label: 'Practice' },
];

export async function SiteHeader() {
  const session = await getSession();
  const consoleHref = session?.role === 'admin' ? '/admin' : session?.role === 'administrator' ? '/administrator' : session?.role === 'auditor' ? '/auditor' : null;
  return (
    <header className="sticky top-0 z-40 border-b hair bg-paper/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Wordmark />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-[13.5px] text-ink-3 transition hover:text-ink">{n.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {consoleHref && <Link href={consoleHref} className="plate hidden text-brass sm:inline">Console</Link>}
          {session ? (
            <Link href="/account" className="inline-flex h-9 items-center rounded-sm border hair-strong px-3.5 text-[13px] text-ink transition hover:border-ink">
              {session.name?.split(' ')[0] ?? 'Account'}
            </Link>
          ) : (
            <Link href="/sign-in" className="inline-flex h-9 items-center rounded-sm bg-ink px-3.5 text-[13px] text-parchment transition hover:bg-ink-3">Sign in</Link>
          )}
        </div>
      </Container>
    </header>
  );
}
