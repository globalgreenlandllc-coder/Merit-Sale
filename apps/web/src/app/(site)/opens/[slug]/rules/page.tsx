import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Plate } from '@/components/ui/Plate';
import { Ledger } from '@/components/ui/Ledger';
import { Hash } from '@/components/ui/Hash';
import { Badge } from '@/components/ui/Badge';
import { RulesText } from '@/components/site/RulesText';
import { fmtDateTime, fmtDuration, money, roundLabel } from '@/lib/format';
import { eligibleStates, getOpenBySlug, latestRuleset, parseConfig } from '@/modules/meritopens/queries';

export const dynamic = 'force-dynamic';

export default async function RulesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const open = await getOpenBySlug(slug);
  if (!open) notFound();
  const rs = latestRuleset(open);
  const cfg = parseConfig(rs);
  const p = open.property;
  return (
    <Container className="grid gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Plate>Official Rules</Plate>
        <h1 className="font-display mt-4 text-[34px] leading-tight">{open.name}</h1>
        <div className="mt-3 flex gap-2">{rs?.lockedAt ? <Badge tone="verify">Locked {fmtDateTime(rs.lockedAt)}</Badge> : <Badge tone="amber">Draft · not locked</Badge>}</div>
        <Ledger className="mt-8" rows={[
          { term: 'Sponsor', detail: cfg?.parties.sponsor ?? '[SPONSOR LEGAL NAME]' },
          { term: 'Property owner', detail: open.isPractice ? 'n/a' : (p.speEntityName ?? cfg?.parties.propertyOwner ?? '[PROPERTY SPE LEGAL NAME]') },
          { term: 'Independent administrator', detail: cfg?.parties.administrator ?? '[ADMINISTRATOR COMPANY NAME]' },
          { term: 'Funds custodian', detail: cfg?.parties.custodian ?? '[CUSTODIAN NAME]' },
          { term: 'Registration fee', detail: `${money(open.registrationFeeCents)} USD, one registration per eligible person` },
          { term: 'Registration period', detail: `${fmtDateTime(open.registrationOpenAt)} to ${fmtDateTime(open.registrationCloseAt)}` },
          { term: 'Eligible states', detail: eligibleStates(open).join(', ') || '[LIST OF CLEARED STATES]' },
          ...open.rounds.filter((r) => !r.number.startsWith('tiebreak')).map((r) => ({ term: roundLabel(r.number), detail: `${r.windowStart ? `${fmtDateTime(r.windowStart)} to ${fmtDateTime(r.windowEnd)}` : fmtDateTime(r.scheduledAt)} · ${fmtDuration(r.durationSeconds)} · Tier ${r.integrityTier}` })),
          { term: 'Advancement', detail: `Top ${open.advanceN.toLocaleString()} from Round 2; top ${open.advanceM.toLocaleString()} from Round 3; tie-order subsets R2 ${cfg?.tieOrderSubsets.r2.join(', ') ?? '—'} · R3 ${cfg?.tieOrderSubsets.r3.join(', ') ?? '—'}` },
          { term: 'Rules version', detail: <>{rs?.version ?? '—'} · hash <Hash value={open.rulesHash ?? rs?.hash} /></> },
        ]} />
      </aside>
      <article>
        {rs ? <RulesText text={rs.officialRulesText} /> : <p className="text-slate">No rules text has been drafted for this Merit Open.</p>}
      </article>
    </Container>
  );
}
