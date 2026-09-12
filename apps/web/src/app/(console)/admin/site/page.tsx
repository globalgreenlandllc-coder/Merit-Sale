import Link from 'next/link';
import { PageHead, Card, ErrorBanner } from '@/components/console/ConsoleShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { db } from '@/lib/db';
import { authMode, demoPersonasEnabled } from '@/lib/auth/mode';
import { emailProviderName } from '@/lib/providers/email';
import { liveReadiness, siteModeState, type SiteMode } from '@/lib/site-mode';
import { fmtDateTime } from '@/lib/format';
import { setSiteModeAction } from '@/modules/admin/site';

export const dynamic = 'force-dynamic';

const EFFECTS: { aspect: string; demo: string; live: string }[] = [
  { aspect: 'Sample listings', demo: 'The seeded Merit Opens and their properties are public.', live: 'Hidden from every public page; they stay here marked Sample.' },
  { aspect: 'Photography', demo: 'Credited sample photographs are loaded onto sample properties that have none.', live: 'Every sample photograph is removed. Only the listing’s own published photography shows.' },
  { aspect: 'Sign-in', demo: 'Any address signs in directly; one-click personas for every realm.', live: 'One-time email codes only. Staff roles come from the environment lists.' },
  { aspect: 'Payments', demo: 'The mock processor settles instantly; no money moves.', live: 'Registration payments are refused until a real processor is configured.' },
  { aspect: 'Visible notice', demo: 'A demonstration ribbon sits above the header on every public page.', live: 'No ribbon.' },
];

export default async function SiteModePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [state, auth, personas] = await Promise.all([siteModeState(), authMode(), demoPersonasEnabled()]);
  const [sampleOpens, sampleProps, personaUsers, lastChange] = await Promise.all([
    db.meritOpen.count({ where: { demo: true } }).catch(() => 0), db.property.count({ where: { demo: true } }).catch(() => 0), db.user.count({ where: { email: { endsWith: '.test' } } }),
    db.auditEvent.findFirst({ where: { action: 'site.mode.set' }, orderBy: { seq: 'desc' } }).catch(() => null),
  ]);
  const lastActor = lastChange?.actorId ? await db.user.findUnique({ where: { id: lastChange.actorId }, select: { email: true } }) : null;
  const readiness = liveReadiness();
  const blocking = readiness.filter((r) => r.required && !r.ok); const warnings = readiness.filter((r) => !r.required && !r.ok);
  const other: SiteMode = state.mode === 'demo' ? 'live' : 'demo';
  return (
    <>
      <PageHead label="Platform admin" title={<span className="flex flex-wrap items-center gap-3">Site mode <Badge tone={state.mode === 'demo' ? 'amber' : 'verify'} className="!text-[12px]">{state.mode === 'demo' ? 'Demonstration' : 'Live'}</Badge></span>} />
      <ErrorBanner sp={sp} />
      {sp.switched && <Notice className="mt-5" tone="verify" title={`The site is now in ${sp.switched} mode`}>{sp.switched === 'demo' ? `Sample photographs loaded onto ${sp.photos ?? 0} propert${sp.photos === '1' ? 'y' : 'ies'}; personas and direct sign-in are on.` : `Sample photographs removed from ${sp.photos ?? 0} propert${sp.photos === '1' ? 'y' : 'ies'}; sample listings are hidden and personas are off.`} Public pages update on their next load.</Notice>}
      {state.locked && <Notice className="mt-5" tone="info" title="Pinned by the environment">SITE_MODE is set to <code className="font-mono">{state.mode}</code> on this deployment. Change it in Vercel → Settings → Environment Variables and redeploy; the switch below is disabled.</Notice>}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(['demo', 'live'] as const).map((m) => {
          const current = m === state.mode; const isLive = m === 'live';
          const disabled = state.locked || (isLive && blocking.length > 0);
          return (
            <section key={m} className={`relative rounded-md border p-5 ${current ? 'border-ink bg-paper' : 'hair bg-paper/60'}`}>
              <div className="flex items-center justify-between"><div className="plate">{isLive ? 'Live' : 'Demonstration'}</div>{current ? <Badge tone="ink">Current</Badge> : <Badge>Available</Badge>}</div>
              <h2 className="font-display mt-3 text-[26px] leading-tight">{isLive ? 'The real thing.' : 'Walk anyone through it.'}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-slate">{isLive ? 'Only real listings and real photography are public. People sign in with a code sent to their email, and no fee is recorded unless a real processor took it.' : 'Sample listings with credited sample photographs, one-click personas for every realm, and instant mock payments, so a visitor can see the whole flow end to end.'}</p>
              <ul className="mt-4 space-y-1.5 text-[13.5px] text-ink-3">
                {EFFECTS.map((e) => <li key={e.aspect} className="grid grid-cols-[110px_1fr] gap-3"><span className="plate pt-[3px] text-graphite">{e.aspect}</span><span>{isLive ? e.live : e.demo}</span></li>)}
              </ul>
              {!current && (
                <form action={setSiteModeAction} className="mt-5">
                  <input type="hidden" name="mode" value={m} />
                  <Button type="submit" size="lg" disabled={disabled} variant={isLive ? 'primary' : 'secondary'}>{isLive ? 'Go live' : 'Enter demonstration mode'}</Button>
                  {isLive && blocking.length > 0 && <p className="mt-2 text-[12.5px] text-clay">Blocked: {blocking.map((b) => b.blocker ?? b.label.toLowerCase()).join('; ')}. See the checklist below.</p>}
                  {isLive && !blocking.length && warnings.length > 0 && <p className="mt-2 text-[12.5px] text-amber">{warnings.length} item{warnings.length === 1 ? '' : 's'} below still need attention; going live is allowed but registrations stay closed until payments are real.</p>}
                </form>
              )}
            </section>
          );
        })}
      </div>

      <Card className="mt-6" title="What live mode needs from this deployment">
        <ul className="divide-y hair">
          {readiness.map((r) => (
            <li key={r.key} className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[24px_220px_1fr]">
              <span className={`mt-[3px] inline-block size-3.5 rounded-full border ${r.ok ? 'border-verify bg-verify' : r.required ? 'border-clay bg-clay-2' : 'border-amber bg-amber-2'}`} aria-label={r.ok ? 'ready' : r.required ? 'blocking' : 'warning'} />
              <span className="text-[14px] text-ink">{r.label}{r.required && !r.ok && <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-clay">blocks going live</span>}</span>
              <span className="text-[13px] text-slate">{r.detail}{!r.ok && r.fix && <span className="mt-1 block font-mono text-[11.5px] text-graphite">{r.fix}</span>}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12.5px] text-graphite">Values are read from the deployment’s environment on every request; after adding one in Vercel, redeploy and reload this page. The <Link href="/api/health" className="link-rule">health report</Link> shows the same facts without values.</p>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Sample records">
          <dl className="grid grid-cols-3 gap-4">
            <div><dt className="plate">Merit Opens</dt><dd className="font-display mt-1 text-[28px]">{sampleOpens}</dd></div>
            <div><dt className="plate">Properties</dt><dd className="font-display mt-1 text-[28px]">{sampleProps}</dd></div>
            <div><dt className="plate">Persona accounts</dt><dd className="font-display mt-1 text-[28px]">{personaUsers}</dd></div>
          </dl>
          <p className="mt-4 text-[13px] leading-relaxed text-slate">Loaded by the seed and marked <em>Sample</em>. Live mode hides the Merit Opens and their properties from the public and ends every persona session; nothing is deleted, so demonstration mode can be re-entered at any time. Real listings created through <Link href="/admin/listings/new" className="link-rule">New listing</Link> are never affected.</p>
        </Card>
        <Card title="Right now">
          <dl className="space-y-2 text-[13.5px]">
            <div className="flex justify-between gap-4"><dt className="text-graphite">Mode source</dt><dd className="font-mono">{state.source === 'env' ? 'SITE_MODE (environment)' : state.source === 'setting' ? 'stored setting' : process.env.NODE_ENV === 'production' ? (state.mode === 'demo' ? 'default · only sample listings exist' : 'default · a real listing exists') : 'default for development'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-graphite">Sign-in</dt><dd className="font-mono">{auth}{process.env.AUTH_MODE ? ' (AUTH_MODE)' : ''}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-graphite">Personas</dt><dd className="font-mono">{personas ? 'on' : 'off'}{process.env.AUTH_DEMO_PERSONAS ? ' (AUTH_DEMO_PERSONAS)' : ''}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-graphite">Email delivery</dt><dd className="font-mono">{emailProviderName()}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-graphite">Last change</dt><dd className="text-right">{lastChange ? <>{fmtDateTime(lastChange.timestamp)}<span className="block font-mono text-[11px] text-graphite">{lastActor?.email ?? lastChange.actorRole}</span></> : 'never'}</dd></div>
          </dl>
        </Card>
      </div>
    </>
  );
}
