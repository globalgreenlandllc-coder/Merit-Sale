import Link from 'next/link';
import type { Registration, Vendor } from '@prisma/client';
import { ButtonLink } from '@/components/ui/Button';
import { Hash } from '@/components/ui/Hash';
import { fmtDocket, money } from '@/lib/format';
import type { OpenFull } from '@/modules/meritopens/queries';

/** The docket: fixed facts and the one action, in the idiom of a court docket rather than a pricing card. */
export function Docket({ open, myReg, custodian, listingNo, states, inline = false }: { open: OpenFull; myReg: Registration | null; custodian: Vendor | undefined; listingNo: string; states: string[]; inline?: boolean }) {
  const p = open.property;
  const r1 = open.rounds.find((r) => r.number === 'r1'); const fin = open.rounds.find((r) => r.number === 'final');
  const registering = open.status === 'registration'; const reservation = open.status === 'reservation'; const locked = !!open.rulesHash;
  const cta = registering && !myReg ? { href: `/opens/${open.slug}/register`, label: `Register — ${open.registrationFeeCents ? money(open.registrationFeeCents) : 'free'}` }
    : registering && myReg ? { href: '/account', label: `Your registration is ${myReg.status}` }
    : reservation ? { href: `/opens/${open.slug}/reserve`, label: 'Join the free reservation list' }
    : ['r1', 'r2', 'r3', 'final', 'tiebreak'].includes(open.status) ? { href: '/account', label: 'Rounds in progress — your account' }
    : { href: `/audit/${open.slug}`, label: 'Public audit summary' };
  const dated = (d: Date | null | undefined) => (locked ? fmtDocket(d) : d ? `Target · [${fmtDocket(d)}]` : '[Set at lock]');
  const total = !open.isPractice && p.appraisedValueCents ? p.appraisedValueCents + open.cashComponentCents : null;
  const rows: [string, React.ReactNode][] = [
    [open.isPractice ? 'Award' : 'Cash', <>{money(open.cashComponentCents, { compact: true })}{open.isPractice ? '' : ' toward taxes'}</>],
    ...(total ? [['Total value', <>{money(total, { compact: true })} <span className="text-graphite">stated</span></>] as [string, React.ReactNode]] : []),
    ['Closes', dated(open.registrationCloseAt)],
    ...(r1 ? [['Round 1', r1.windowStart ? `${locked ? '' : '[Target] '}${fmtDocket(r1.windowStart)} → ${fmtDocket(r1.windowEnd)}` : '[Set at lock]'] as [string, React.ReactNode]] : []),
    ...(fin ? [['Final', dated(fin.scheduledAt)] as [string, React.ReactNode]] : []),
    ['Rules', locked ? <span key="r">v{open.rulesVersion} · <Hash value={open.rulesHash} short /></span> : <span key="r" className="text-graphite">Draft · hashed at lock</span>],
    ['States', states.join(', ') || '[state list]'],
    ['Custodian', <>{custodian?.name ?? '[Custodian name]'} {custodian?.publicSummaryUrl ? <a className="link-rule" href={custodian.publicSummaryUrl}>↗</a> : <span className="text-graphite">· summary pending</span>}</>],
  ];
  return (
    <div id={inline ? 'docket-inline' : undefined} className="border-y hair bg-paper py-5 lg:border lg:px-6">
      <div className="flex items-baseline justify-between"><span className="plate">Docket</span><span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-graphite">{listingNo}</span></div>
      <div className="mt-3 flex items-baseline gap-3"><span className="font-display tabular text-[40px] leading-none">{open.registrationFeeCents ? money(open.registrationFeeCents) : 'Free'}</span><span className="text-[13px] leading-snug text-slate">one registration<br />per person</span></div>
      <dl className="mt-4 border-t hair">
        {rows.map(([k, v]) => <div key={k} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border-b hair py-2 text-[13px]"><dt className="plate whitespace-nowrap pt-0.5">{k}</dt><dd className="min-w-0 text-ink">{v}</dd></div>)}
      </dl>
      <ButtonLink href={cta.href} size="lg" className="mt-5 w-full">{cta.label}</ButtonLink>
      <Link href={`/opens/${open.slug}/rules`} className="mt-3 block text-center text-[13px] link-rule">Official Rules</Link>
      <p className="mt-3 text-[12px] leading-relaxed text-graphite">{locked ? 'Fixed fee, fixed dates. Refundable only if the Merit Open is cancelled, then in full.' : 'Dates and fee become fixed when the Rules lock, before registration opens.'}</p>
    </div>
  );
}
