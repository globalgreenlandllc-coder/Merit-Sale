import { notFound } from 'next/navigation';
import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { FieldRow, Input, Textarea } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { getOpenById, latestRuleset, eligibleStates } from '@/modules/meritopens/queries';
import { saveRulesetAction } from '@/modules/admin/actions';
import { CANCELLATION_REASONS } from '@etk/rules-config';
export const dynamic = 'force-dynamic';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams;
  const o = await getOpenById(id);
  if (!o) notFound();
  const rs = latestRuleset(o);
  const template = {
    version: '1.0', meritOpenSlug: o.slug, registrationFeeCents: o.registrationFeeCents, cashComponentCents: o.cashComponentCents, eligibleStates: eligibleStates(o), minimumAge: 18,
    registrationOpenAt: o.registrationOpenAt?.toISOString() ?? '', registrationCloseAt: o.registrationCloseAt?.toISOString() ?? '',
    rounds: o.rounds.map((r) => ({ number: r.number.startsWith('tiebreak') ? 'final' : r.number, windowStart: r.windowStart?.toISOString(), windowEnd: r.windowEnd?.toISOString(), scheduledAt: r.scheduledAt?.toISOString(), durationSeconds: r.durationSeconds, integrityTier: r.integrityTier, itemCount: r.form?._count.items ?? 1 })),
    advanceN: o.advanceN, advanceM: o.advanceM, tieOrderSubsets: { r2: [8, 9, 10], r3: [10, 11, 12] }, r1LatencyGraceSeconds: 3, disputeWindowHours: 72, refundSlaDays: 30, firstAccessHours: o.firstAccessHours,
    retention: { scoresKeysCertificationsYears: 7, proctoringMediaMonthsPostClosing: 12 }, technicalFailurePolicy: 'Exhibit E: verified platform failure → re-administration with the committed reserve form to all affected registrants.', accommodationPolicy: 'Rules 8.7: extended time / assistive technology where reasonable; never alters items, keys, or scoring.', accommodationRequestDeadlineDays: 7,
    cancellationReasonCodes: CANCELLATION_REASONS, termsVersion: '1.0', privacyVersion: '1.0', disclosures: [],
    parties: { sponsor: '[SPONSOR LEGAL NAME]', propertyOwner: o.property.speEntityName ?? '[PROPERTY SPE LEGAL NAME]', administrator: '[ADMINISTRATOR COMPANY NAME]', custodian: '[CUSTODIAN NAME]', titleCompany: '[TITLE COMPANY]' },
  };
  return (<>
    <PageHead label={o.name} title="Ruleset" actions={rs?.lockedAt ? <Badge tone="verify">locked · {rs.hash?.slice(0, 12)}…</Badge> : <Badge tone="amber">draft</Badge>} />
    <ErrorBanner sp={sp} />
    <Card className="mt-6">
      <form action={saveRulesetAction} className="space-y-5">
        <input type="hidden" name="openId" value={id} />
        <fieldset disabled={!!rs?.lockedAt} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2"><FieldRow label="Version" htmlFor="version"><Input id="version" name="version" defaultValue={rs?.version ?? '1.0'} /></FieldRow><FieldRow label="Terms version" htmlFor="termsVersion"><Input id="termsVersion" name="termsVersion" defaultValue={rs?.termsVersion ?? '1.0'} /></FieldRow></div>
          <FieldRow label="Configuration (JSON, validated against @etk/rules-config)" htmlFor="configJson" hint="Everything counsel may change lives here: fee, cash, states, N, M, tie-order subsets, grace, dispute window, retention, disclosures, parties."><Textarea id="configJson" name="configJson" className="min-h-[420px] font-mono text-[12.5px]" defaultValue={rs?.configJson ? JSON.stringify(JSON.parse(rs.configJson), null, 2) : JSON.stringify(template, null, 2)} /></FieldRow>
          <FieldRow label="Official Rules text" htmlFor="officialRulesText" hint="Counsel draft. [Bracketed] items render highlighted as placeholders."><Textarea id="officialRulesText" name="officialRulesText" className="min-h-[360px] text-[13.5px]" defaultValue={rs?.officialRulesText ?? ''} /></FieldRow>
          <Button type="submit">Save ruleset version</Button>
        </fieldset>
      </form>
    </Card>
  </>);
}
