import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { siteMode } from '@/lib/site-mode';

/**
 * Thin strip above the header while the site is in demonstration mode, so nobody mistakes
 * sample listings and sample photography for real offers. Renders nothing in live mode.
 */
export async function DemoRibbon() {
  const [mode, session] = await Promise.all([siteMode(), getSession()]);
  if (mode !== 'demo') return null;
  return (
    <div className="border-b border-amber/30 bg-amber-2/80 text-amber" role="status">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] sm:px-8">
        <span><span className="mr-2 inline-block size-1.5 rounded-full bg-amber align-middle" aria-hidden />Demonstration · sample listings and sample photographs · no fees are taken</span>
        {session?.role === 'admin' ? <Link href="/admin/site" className="underline decoration-amber/50 underline-offset-4 hover:decoration-amber">Switch to live</Link> : <Link href="/sign-in" className="underline decoration-amber/50 underline-offset-4 hover:decoration-amber">Try any realm</Link>}
      </div>
    </div>
  );
}
