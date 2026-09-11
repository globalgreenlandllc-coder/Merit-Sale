import Link from 'next/link';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { FloorPlan } from './FloorPlan';
import { MapThumb } from './MapThumb';
import { fmtDate, money, sqft } from '@/lib/format';
import type { OpenFull } from '@/modules/meritopens/queries';

/** Catalogue row: plan thumbnail, map thumbnail, the listing line, and the four docket facts. */
export function OpenCard({ open }: { open: OpenFull }) {
  const p = open.property; const geo = typeof p.latitude === 'number' && typeof p.longitude === 'number'; const owned = p.titleStatus === 'owned';
  const titleVerified = owned && !!p.countyRecorderUrl && !!p.speEntityName && !p.speEntityName.startsWith('[');
  const facts = [p.beds != null && `${p.beds} bd`, p.baths != null && `${p.baths} ba`, p.sqft && sqft(p.sqft), p.yearBuilt].filter(Boolean).join(' · ');
  return (
    <Link href={`/opens/${open.slug}`} aria-label={`${open.name}: ${open.isPractice ? 'practice event' : `${p.address}, ${p.city}, ${p.state}`}`} className="group grid gap-5 border-t hair py-6 transition hover:bg-linen/30 sm:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,22rem)]">
      <div className="flex gap-2" aria-hidden>
        {open.isPractice ? (
          <div className="grain grain-dark flex h-[84px] w-[128px] items-center justify-center bg-ink text-center"><span className="relative z-[2] plate-dark">Practice<br />event</span></div>
        ) : (<>
          {p.planSetKey ? <div className="grain grain-dark h-[84px] w-[128px] bg-ink p-2 text-brass-2"><FloorPlan className="relative z-[2] h-full w-full" animate={false} labels={false} decorative /></div> : <div className="grain grain-dark flex h-[84px] w-[128px] items-center justify-center bg-ink p-2 text-center"><span className="relative z-[2] plate-dark">Plans<br />pending</span></div>}
          {geo ? <MapThumb lat={p.latitude!} lng={p.longitude!} zoom={11} width={128} height={84} approximate={!owned} className="border hair" /> : <div className="h-[84px] w-[128px] bg-linen" />}
        </>)}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={open.status} />{open.isPractice ? <Badge>No property conveyed</Badge> : titleVerified ? <Badge tone="verify">Title held by SPE</Badge> : <Badge tone="amber">{owned ? 'Title recording pending' : p.titleStatus.replace(/_/g, ' ')}</Badge>}</div>
        <h3 className="font-display mt-2 text-[26px] leading-tight text-ink group-hover:underline decoration-brass decoration-1 underline-offset-4">{open.name}</h3>
        <p className="mt-1 text-[14px] text-slate">{open.isPractice ? `Cash award ${money(open.cashComponentCents)} · Rounds 1–2 only` : `${p.name} · ${p.address}, ${p.city}, ${p.state}${facts ? ` · ${facts}` : ''}`}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 self-center text-[14px] sm:col-span-2 lg:col-span-1">
        <div><dt className="plate">Registration</dt><dd className="mt-0.5">{open.registrationFeeCents === 0 ? 'Free' : money(open.registrationFeeCents)}</dd></div>
        <div><dt className="plate">{open.isPractice ? 'Award' : 'Cash component'}</dt><dd className="mt-0.5">{money(open.cashComponentCents, { compact: true })}</dd></div>
        <div><dt className="plate">Closes</dt><dd className="mt-0.5">{open.rulesHash ? fmtDate(open.registrationCloseAt) : `[${fmtDate(open.registrationCloseAt)}]`}</dd></div>
        <div><dt className="plate">Rules hash</dt><dd className="mt-0.5 font-mono text-[12px] text-ink-3">{open.rulesHash ? `${open.rulesHash.slice(0, 12)}…` : 'hashed at lock'}</dd></div>
      </dl>
    </Link>
  );
}
