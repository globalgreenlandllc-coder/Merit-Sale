import Link from 'next/link';
import { Wordmark } from '@/components/site/Wordmark';
import { Badge } from '@/components/ui/Badge';
import { signOut } from '@/modules/accounts/actions';
import type { Session } from '@/lib/auth/session';

export function ConsoleShell({ realm, nav, session, children }: { realm: string; nav: { href: string; label: string }[]; session: Session; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-parchment/50">
      <aside className="hidden w-64 shrink-0 flex-col border-r hair bg-paper lg:flex">
        <div className="border-b hair px-5 py-4"><Wordmark /><div className="mt-3 flex items-center gap-2"><Badge tone="ink">{realm}</Badge><span className="text-[12px] text-graphite">realm</span></div></div>
        <nav className="flex-1 px-3 py-4" aria-label={`${realm} navigation`}>
          {nav.map((n) => <Link key={n.href} href={n.href} className="block rounded-sm px-3 py-2 text-[13.5px] text-ink-3 transition hover:bg-linen/60 hover:text-ink">{n.label}</Link>)}
        </nav>
        <div className="border-t hair px-5 py-4 text-[12.5px] text-graphite"><div className="truncate text-ink">{session.name ?? session.email}</div><div className="font-mono text-[11px]">{session.role}</div><form action={signOut} className="mt-2"><button className="link-rule text-[12.5px] text-ink">Sign out</button></form></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between border-b hair bg-paper px-5 lg:hidden"><Wordmark /><Badge tone="ink">{realm}</Badge></header>
        <nav className="flex gap-3 overflow-x-auto border-b hair bg-paper px-5 py-2 lg:hidden">{nav.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap text-[13px] text-ink-3">{n.label}</Link>)}</nav>
        <main className="console-scroll mx-auto max-w-[1280px] px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHead({ label, title, actions }: { label: string; title: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b hair pb-5">
      <div><div className="plate">{label}</div><h1 className="font-display mt-2 text-[32px] leading-tight">{title}</h1></div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorBanner({ sp }: { sp: Record<string, string | undefined> }) {
  if (!sp.error) return null;
  return <div className="mt-5 rounded-sm border border-clay/40 bg-clay-2/70 px-4 py-3 text-[14px] text-clay" role="alert">{sp.error}</div>;
}

export function Card({ title, children, className = '' }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-md border hair bg-paper p-5 ${className}`}>{title && <div className="plate mb-4">{title}</div>}{children}</section>;
}
