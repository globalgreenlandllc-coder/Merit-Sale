import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Plate, SectionHeading } from '@/components/ui/Plate';
import { Ledger } from '@/components/ui/Ledger';
import { Hash } from '@/components/ui/Hash';
import { Badge } from '@/components/ui/Badge';
import { RulesText, rulesSections } from '@/components/site/RulesText';
import { PlainRules } from '@/components/site/PlainRules';
import { getSession } from '@/lib/auth/session';
import { fmtDateTime, fmtDuration, money, roundLabel } from '@/lib/format';
import { eligibleStates, getOpenBySlug, latestRuleset, parseConfig } from '@/modules/meritopens/queries';

export const dynamic = 'force-dynamic';

export default async function RulesPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params; const sp = await searchParams;
  const open = await getOpenBySlug(slug);
  if (!open) notFound();
  const session = await getSession();
  const staff = !!session && ['admin', 'administrator', 'auditor', 'item_author'].includes(session.role);
  const rs = latestRuleset(open); const cfg = parseConfig(rs); const states = eligibleStates(open); const p = open.property;
  const sections = rs ? rulesSections(rs.officialRulesText) : [];
  return (
    <>
      <Container><div className="folio"><span className="truncate">§ Official Rules · {open.name}</span><span className="hidden items-center gap-2 sm:flex">{rs?.lockedAt ? <Badge tone="verify">Locked {fmtDateTime(rs.lockedAt)}</Badge> : <Badge tone="amber">Draft · not locked</Badge>}</span><span className="hidden md:inline">Version {rs?.version ?? 'draft'}{open.rulesHash ? <> · <Hash value={open.rulesHash} short className="!text-graphite" /></> : null}</span></div></Container>
      <Container className="py-14">
        <SectionHeading label="The rules in plain language" title="What you agree to, in eleven cards." lede={<>Each card cites the section of the Official Rules it summarises. Numbers come from this event’s configuration, so they cannot drift. <Link href={`/opens/${slug}`} className="link-rule">Back to the listing →</Link></>} />
        <div className="mt-10"><PlainRules open={open} cfg={cfg} states={states} rulesHref="#full" /></div>
      </Container>
      <div id="full" className="scroll-mt-20 border-t hair bg-parchment/60">
        <Container className="grid gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
          <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:self-start">
            <Plate>Official Rules · full text</Plate>
            <Ledger className="mt-6 [&>*]:!grid-cols-1 [&>*]:gap-y-1 [&>*]:py-2.5 [&_dd]:min-w-0 [&_dd]:break-words [&_dd]:text-[13.5px]" rows={[
              { term: 'Sponsor', detail: cfg?.parties.sponsor ?? '[SPONSOR LEGAL NAME]' },
              { term: 'Property owner', detail: open.isPractice ? 'n/a' : (p.speEntityName ?? cfg?.parties.propertyOwner ?? '[PROPERTY SPE LEGAL NAME]') },
              { term: 'Administrator', detail: cfg?.parties.administrator ?? '[ADMINISTRATOR COMPANY NAME]' },
              { term: 'Custodian', detail: cfg?.parties.custodian ?? '[CUSTODIAN NAME]' },
              { term: 'Fee', detail: `${money(open.registrationFeeCents)}, one per person` },
              { term: 'Registration', detail: `${fmtDateTime(open.registrationOpenAt)} → ${fmtDateTime(open.registrationCloseAt)}` },
              { term: 'States', detail: states.join(', ') || '[LIST OF CLEARED STATES]' },
              ...open.rounds.filter((r) => !r.number.startsWith('tiebreak')).map((r) => ({ term: roundLabel(r.number), detail: `${r.windowStart ? `${fmtDateTime(r.windowStart)} → ${fmtDateTime(r.windowEnd)}` : fmtDateTime(r.scheduledAt)} · ${fmtDuration(r.durationSeconds)} · tier ${r.integrityTier}` })),
              { term: 'Advance', detail: `Top ${open.advanceN.toLocaleString()} from R2 · top ${open.advanceM.toLocaleString()} from R3` },
              { term: 'Version', detail: <>{rs?.version ?? '—'} · <Hash value={open.rulesHash ?? rs?.hash} short /></> },
            ]} />
            {sections.length > 0 && <nav className="mt-8" aria-label="Sections"><div className="plate">Contents</div><ol className="mt-3 space-y-1.5 text-[13px]">{sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="text-slate hover:text-ink">{s.title}</a></li>)}</ol></nav>}
            {staff && <p className="mt-6 text-[12.5px] text-graphite">Staff view: counsel notes are {sp.notes === '1' ? <>shown · <Link className="link-rule" href={`/opens/${slug}/rules#full`}>hide</Link></> : <>hidden · <Link className="link-rule" href={`/opens/${slug}/rules?notes=1#full`}>show</Link></>}.</p>}
          </aside>
          <article>{rs ? <RulesText text={rs.officialRulesText} showCounselNotes={staff && sp.notes === '1'} /> : <p className="text-slate">No rules text has been drafted for this Merit Open.</p>}</article>
        </Container>
      </div>
    </>
  );
}
