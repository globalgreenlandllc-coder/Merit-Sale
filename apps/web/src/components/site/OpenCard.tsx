import Link from 'next/link';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { PropertyCover } from './PropertyCover';
import { KeyGlyph } from './KeyGlyph';
import { fmtDate, money, sqft } from '@/lib/format';
import { coverPhoto } from '@/lib/photos';
import type { OpenFull } from '@/modules/meritopens/queries';
import { participation, type ParticipationCounts } from './Participation';

/** Catalogue row: the property photograph (vicinity inset), the listing line, and the four docket facts. */
export function OpenCard({ open, counts }: { open: OpenFull; counts?: ParticipationCounts }) {
  const part = counts ? participation(open, counts) : null;
  const p = open.property; const owned = p.titleStatus === 'owned';
  const titleVerified = owned && !!p.countyRecorderUrl && !!p.speEntityName && !p.speEntityName.startsWith('[');
  const facts = [p.beds != null && `${p.beds} bd`, p.baths != null && `${p.baths} ba`, p.sqft && sqft(p.sqft), p.yearBuilt].filter(Boolean).join(' · ');
  const cover = open.isPractice ? null : coverPhoto(p);
  const done = ['complete', 'cancelled'].includes(open.status);
  return (
    <Link href={`/opens/${open.slug}`} aria-label={`${open.name}: ${open.isPractice ? 'practice event' : `${p.address}, ${p.city}, ${p.state}`}`} className="group grid gap-x-6 gap-y-4 border-t hair py-6 transition hover:bg-linen/30 sm:grid-cols-[236px_minmax(0,1fr)] lg:grid-cols-[236px_minmax(0,1fr)_minmax(0,21rem)] lg:items-center">
      <div className="plate-frame w-full max-w-[420px] sm:max-w-none" aria-hidden>
        {open.isPractice ? (
          <div className="grain grain-dark flex aspect-[3/2] flex-col items-center justify-center gap-2 bg-ink text-center"><KeyGlyph size={22} className="relative z-[2] text-brass-2" /><span className="relative z-[2] plate-dark">Practice event<br />no property</span></div>
        ) : (
          <PropertyCover p={p} width={640} inset count className={`aspect-[3/2] ${done ? 'saturate-[0.85]' : ''}`} imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.035]" />
        )}
      </div>
      <div className="min-w-0 self-center">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={open.status} />{open.isPractice ? <Badge>No property conveyed</Badge> : titleVerified ? <Badge tone="verify">Title held by SPE</Badge> : <Badge tone="amber">{owned ? 'Title recording pending' : p.titleStatus.replace(/_/g, ' ')}</Badge>}</div>
        <h3 className="font-display mt-2.5 text-[26px] leading-tight text-ink group-hover:underline decoration-brass decoration-1 underline-offset-4">{open.name}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate">{open.isPractice ? `Cash award ${money(open.cashComponentCents)} · Rounds 1–2 only` : <>{p.name} · {p.address}, {p.city}, {p.state}{facts ? <span className="block text-ink-3">{facts}</span> : null}</>}</p>
        {cover?.caption && <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-graphite">{cover.caption}</p>}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 self-center border-t hair pt-4 text-[14px] sm:col-span-2 lg:col-span-1 lg:border-t-0 lg:pt-0">
        <div><dt className="plate">Registration</dt><dd className="mt-0.5">{open.registrationFeeCents === 0 ? 'Free' : money(open.registrationFeeCents)}</dd></div>
        <div><dt className="plate">{open.isPractice ? 'Award' : 'Cash component'}</dt><dd className="mt-0.5">{money(open.cashComponentCents, { compact: true })}</dd></div>
        {part?.show ? <div><dt className="plate">{part.shortLabel}</dt><dd className="mt-0.5 tabular">{part.now.toLocaleString()}{part.target ? <span className="text-graphite"> / {part.target.toLocaleString()}</span> : null}</dd></div> : <div><dt className="plate">Closes</dt><dd className="mt-0.5">{open.rulesHash ? fmtDate(open.registrationCloseAt) : `[${fmtDate(open.registrationCloseAt)}]`}</dd></div>}
        <div><dt className="plate">Rules hash</dt><dd className="mt-0.5 font-mono text-[12px] text-ink-3">{open.rulesHash ? `${open.rulesHash.slice(0, 12)}…` : 'hashed at lock'}</dd></div>
      </dl>
    </Link>
  );
}
