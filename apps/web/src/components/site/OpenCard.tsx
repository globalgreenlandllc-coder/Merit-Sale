import Link from 'next/link';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { fmtDate, money, sqft } from '@/lib/format';
import type { OpenFull } from '@/modules/meritopens/queries';

export function OpenCard({ open, featured = false }: { open: OpenFull; featured?: boolean }) {
  const p = open.property;
  return (
    <Link href={`/opens/${open.slug}`} className={`group block border-t hair py-6 transition ${featured ? '' : 'hover:bg-linen/30'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={open.status} />
        {open.isPractice && <Badge tone="neutral">Practice · no property conveyed</Badge>}
        {open.property.titleStatus === 'owned' && !open.isPractice && <Badge tone="verify">Title held by SPE</Badge>}
      </div>
      <h3 className="font-display mt-3 text-[28px] leading-tight text-ink group-hover:underline decoration-brass decoration-1 underline-offset-4">{open.name}</h3>
      <p className="mt-1 text-[14px] text-slate">
        {open.isPractice ? `Cash award ${money(open.cashComponentCents)} · Rounds 1–2 only` : `${p.address}, ${p.city}, ${p.state} · ${p.beds} bed · ${p.baths} bath · ${sqft(p.sqft)} · Built ${p.yearBuilt}`}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <div><dt className="plate">Registration</dt><dd className="mt-1 text-[15px]">{open.registrationFeeCents === 0 ? 'Free' : money(open.registrationFeeCents)}</dd></div>
        <div><dt className="plate">{open.isPractice ? 'Award' : 'Cash component'}</dt><dd className="mt-1 text-[15px]">{money(open.cashComponentCents, { compact: true })}</dd></div>
        <div><dt className="plate">Registration closes</dt><dd className="mt-1 text-[15px]">{fmtDate(open.registrationCloseAt)}</dd></div>
        <div><dt className="plate">Rules hash</dt><dd className="mt-1 font-mono text-[12px] text-ink-3">{open.rulesHash ? `${open.rulesHash.slice(0, 12)}…` : 'pending lock'}</dd></div>
      </dl>
    </Link>
  );
}
