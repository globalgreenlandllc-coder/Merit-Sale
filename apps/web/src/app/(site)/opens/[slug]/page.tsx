import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Plate, SectionHeading } from '@/components/ui/Plate';
import { Ledger } from '@/components/ui/Ledger';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Hash } from '@/components/ui/Hash';
import { Placeholder } from '@/components/ui/Placeholder';
import { FloorPlan } from '@/components/site/FloorPlan';
import { SitePlan } from '@/components/site/SitePlan';
import { Elevation } from '@/components/site/Elevation';
import { MapThumb } from '@/components/site/MapThumb';
import { MapPlate } from '@/components/site/MapPlate';
import { PlateViewer, type Plate as PlateT } from '@/components/site/PlateViewer';
import { SourceChip } from '@/components/site/SourceChip';
import { SunPlate } from '@/components/site/SunPlate';
import { Docket } from '@/components/site/Docket';
import { MobileActionBar } from '@/components/site/MobileActionBar';
import { EligibilityChecker } from '@/components/site/EligibilityChecker';
import { ScheduleTimeline } from '@/components/site/ScheduleTimeline';
import { HashVerifier } from '@/components/site/HashVerifier';
import { DistancesLedger, FactSheet, FactsStrip, NearbyList, OwnershipCosts, PropertyRecord, TitleLedger } from '@/components/site/ListingSections';
import { StageTracker } from '@/components/site/StageTracker';
import { myStage, stageCounts } from '@/modules/meritopens/status';
import type { PropertyPhoto } from '@/app/api/admin/properties/[id]/photos/route';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { listingNumber } from '@/lib/listing';
import { site } from '@/lib/site';
import { tzForState } from '@/lib/solar';
import { certLabel, fmtDate, fmtDateTime, fmtDuration, money, roundLabel, safeJson, sqft } from '@/lib/format';
import { eligibleStates, getOpenBySlug, latestRuleset, openCounts, parseConfig } from '@/modules/meritopens/queries';

export const dynamic = 'force-dynamic';

function faqFor(practice: boolean): [string, string][] {
  return [
    ['Is this legal?', 'A Merit Open is a skill-based selection event. No random selection is used at any stage, and counsel reviews it before launch in each state where it’s offered. [Link to counsel-approved statement.]'],
    ['Can I register more than once?', 'No. One per person, no exceptions. Anyone who tries is disqualified.'],
    ['What’s on the test?', 'Logic, pattern, and quantitative reasoning problems where all the information is provided. Nothing you’d need a degree for.'],
    practice ? ['Can I use AI or a calculator?', 'No AI, no outside help. Calculators only where a problem says so. Practice events run Rounds 1–2 under Tier 1 controls; there is no camera proctoring.'] : ['Can I use AI or a calculator?', 'No AI, no outside help. Calculators only where a problem says so. Round 3 and the Final are proctored on camera.'],
    practice ? ['What does it cost?', 'Nothing. Practice registration is free, so there is nothing to refund.'] : ['What if I don’t advance?', 'Your registration fee is not refunded. It bought your seat at the test. Refunds happen only if the Merit Open is cancelled, in which case everyone is refunded in full.'],
  ];
}

export default async function OpenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const open = await getOpenBySlug(slug);
  if (!open) notFound();
  const [session, counts, vendors] = await Promise.all([getSession(), openCounts(open.id), db.vendor.findMany({ where: { active: true } })]);
  const listingNo = open.listingNo ?? (await listingNumber(open));
  const p = open.property; const rs = latestRuleset(open); const cfg = parseConfig(rs); const states = eligibleStates(open);
  const vendor = (kind: string) => vendors.find((v) => v.kind === kind);
  const myReg = session ? await db.registration.findUnique({ where: { userId_meritOpenId: { userId: session.userId, meritOpenId: open.id } } }) : null;
  const [stage, mine] = await Promise.all([stageCounts(open), myStage(open, session?.userId ?? null)]);
  const practice = open.isPractice;
  const registering = open.status === 'registration'; const reservation = open.status === 'reservation'; const owned = p.titleStatus === 'owned'; const locked = !!open.rulesHash;
  const titleVerified = owned && !!p.countyRecorderUrl && !!p.speEntityName && !p.speEntityName.startsWith('[');
  const appraisalPending = !p.appraisalDate || !p.appraiserName || p.appraiserName.startsWith('[') || !p.appraisalReportUrl;
  const photos = safeJson<PropertyPhoto[]>(p.photosJson, []).filter((ph) => ph.published);
  const included = safeJson<string[]>(p.includedItemsJson, []); const excluded = safeJson<string[]>(p.excludedItemsJson, []);
  const hasGeo = typeof p.latitude === 'number' && typeof p.longitude === 'number'; const tz = tzForState(p.state); const now = new Date();
  const r1 = open.rounds.find((r) => r.number === 'r1');
  const ctaHref = registering && !myReg ? `/opens/${slug}/register` : reservation ? `/opens/${slug}/reserve` : '/account';
  const ctaLabel = registering && !myReg ? `Register · ${open.registrationFeeCents ? money(open.registrationFeeCents) : 'free'}` : reservation ? 'Reserve · free' : 'Your account';
  const stories = p.stories ? `${p.stories} ${p.stories === 1 ? 'story' : 'stories'}` : '';

  const plates: PlateT[] = practice ? [] : [
    ...photos.map((ph, i) => ({ id: `photo-${i}`, kind: 'photo' as const, label: 'Photograph', caption: ph.caption || p.name, url: ph.url, credit: ph.credit })),
    ...(p.planSetKey ? [
      { id: 'plan', kind: 'plate' as const, label: 'Main-level plan', caption: 'Schematic from builder plans · dimensions illustrative · not to scale', node: <FloorPlan className="w-full" animate={photos.length === 0} /> },
      { id: 'site', kind: 'plate' as const, label: 'Site plan', caption: `Lot ${p.lotSqft ? sqft(p.lotSqft) : '[lot size]'} · schematic · not to scale`, node: <SitePlan className="w-full" street={p.address.split(/\d+\s+/)[1] ?? 'Street'} lot={p.lotSqft ? sqft(p.lotSqft) : '—'} sqft={sqft(p.sqft)} stories={stories || '—'} /> },
      { id: 'elev', kind: 'plate' as const, label: 'South elevation', caption: `${p.exterior ?? '[exterior]'} · ${p.roof ?? '[roof]'} · schematic`, node: <Elevation className="w-full" roof={p.roof ?? '[roof]'} exterior={p.exterior ?? '[exterior]'} /> },
    ] : [
      { id: 'pending', kind: 'plate' as const, label: 'Plate set', caption: 'Published when the builder’s plans are approved', thumb: <div className="flex size-full items-center justify-center"><span className="font-mono text-[8px] uppercase tracking-[0.16em] text-sage">Pending</span></div>, node: <div className="flex flex-col items-center justify-center gap-3 p-8 text-center"><span className="plate-dark">Plans pending</span><span className="font-display text-[26px] leading-tight text-parchment sm:text-[30px]">Floor plan, site plan, and elevation are published when the builder’s plans are approved for release.</span><span className="text-[13px] text-mist">{[p.beds && `${p.beds} bed`, p.baths && `${p.baths} bath`, p.sqft && sqft(p.sqft), stories].filter(Boolean).join(' · ')}</span></div> },
    ]),
    ...(hasGeo ? [{ id: 'map', kind: 'map' as const, label: 'Vicinity', caption: `${p.city}, ${p.state} · tiles © Esri`, node: <MapThumb lat={p.latitude!} lng={p.longitude!} zoom={12} fill approximate={!owned} /> }] : []),
  ];
  const pageHashes = [
    ...(open.rulesHash ? [{ label: `Official Rules v${open.rulesVersion}`, hash: open.rulesHash }] : []),
    ...open.rounds.flatMap((r) => [...(r.form?.packageHash ? [{ label: `${roundLabel(r.number)} package`, hash: r.form.packageHash }] : []), ...(r.reserveForm?.packageHash ? [{ label: `${roundLabel(r.number)} reserve package`, hash: r.reserveForm.packageHash }] : [])]),
    ...open.certifications.map((c) => ({ label: `${certLabel(c.type)} certification`, hash: c.hash })),
  ];
  const certHistory = open.certifications.map((c) => ({ date: c.signedAt.toISOString(), event: `${certLabel(c.type)} · ${c.hash.slice(0, 12)}…`, source: 'Administrator', href: '/registry' }));
  const schedule = [
    { key: 'close', label: 'Registration closes', start: open.registrationCloseAt?.toISOString() ?? null, note: locked ? 'Never extended (Rules 3.6).' : undefined },
    ...open.rounds.filter((r) => !r.number.startsWith('tiebreak')).map((r) => ({ key: r.id, label: `${roundLabel(r.number)} · ${r.durationSeconds === 60 ? '60 seconds' : fmtDuration(r.durationSeconds)}`, start: (r.windowStart ?? r.scheduledAt)?.toISOString() ?? null, end: r.windowEnd?.toISOString() ?? null, tier: r.integrityTier, note: r.windowStart ? 'Choose any start time inside the window; one attempt.' : 'Single synchronised session; all clients unlock at server time.' })),
  ];
  const disclosures = (cfg?.disclosures ?? []).filter((d) => states.includes(d.jurisdiction));
  const docket = (inline: boolean) => <Docket open={open} myReg={myReg} custodian={vendor('custodian')} listingNo={listingNo} states={states} inline={inline} />;
  const aside = <aside className="self-start lg:sticky lg:top-20 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:overscroll-contain"><div className="lg:hidden">{docket(true)}</div><div className="hidden lg:block">{docket(false)}</div></aside>;
  const sec = 'scroll-mt-24';
  let n = 0; const idx = () => `§ ${String(++n).padStart(2, '0')}`;

  return (
    <>
      <Container><div className="folio grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 md:grid-cols-[minmax(0,1fr)_auto_auto]"><span className="truncate">§ Merit Open · {open.name}</span><span className="hidden shrink-0 items-center gap-2 sm:flex"><StatusBadge status={open.status} />{practice ? <Badge>Practice · no property conveyed</Badge> : titleVerified ? <Badge tone="verify">Title held by SPE</Badge> : <Badge tone="amber">{owned ? 'Title recording pending' : p.titleStatus.replace(/_/g, ' ')}</Badge>}</span><span className="hidden shrink-0 whitespace-nowrap md:inline">Listing № {listingNo} · {locked ? `Rules v${open.rulesVersion}` : 'Rules draft'}</span></div></Container>

      {/* cover plate */}
      <section className="grain grain-dark bg-ink text-parchment">
        <Container className="relative z-[2] grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 lg:py-12">
          {practice ? (
            <div className="plate-frame-dark flex min-h-[320px] flex-col justify-center p-8 text-center"><div className="plate-dark">Practice event</div><p className="font-display mt-4 text-[34px] leading-tight text-parchment">Same rules, same controls, same sealed keys. A {money(open.cashComponentCents)} cash award. No property.</p><p className="mt-4 text-[14px] text-mist">Round 1 and Round 2 only · Tier 1 controls · Phase 0 demand test</p></div>
          ) : <PlateViewer plates={plates} title={p.name} />}
          <div className="flex min-w-0 flex-col justify-center">
            <div className="plate-dark">{practice ? 'Online · all eligible states' : `${p.address} · ${p.city}, ${p.state}${p.zip ? ` ${p.zip}` : ''}${p.county ? ` · ${p.county} County` : ''}`}</div>
            <h1 className="font-display display-tight mt-3 text-[40px] leading-[0.98] text-parchment sm:text-[56px]">{practice ? open.name : p.name}</h1>
            <p className="font-display mt-4 text-[20px] italic leading-snug text-brass-2 sm:text-[22px]">{practice ? 'One registration. One test. The highest score takes the award.' : 'One registration. One test. The highest score gets the house.'}</p>
            {!practice && <FactsStrip p={p} dark limit={5} className="mt-7" />}
            <p className="mt-6 text-[15px] leading-relaxed text-mist">{practice ? <>A Phase 0 practice Merit Open: Round 1 and Round 2 only, Tier 1 controls, a {money(open.cashComponentCents)} cash award. No property is conveyed.</> : <><strong className="text-parchment">Prize package:</strong> the home plus {money(open.cashComponentCents, { compact: true })} cash toward your taxes. Appraised value {money(p.appraisedValueCents)} <SourceChip dark label={p.appraiserName && !p.appraiserName.startsWith('[') ? p.appraiserName : '[Independent appraiser]'} href={p.appraisalReportUrl} date={p.appraisalDate ? fmtDate(p.appraisalDate) : null} pending={appraisalPending} />.</>}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={ctaHref} variant="inverse" size="lg">{ctaLabel}</ButtonLink>
              <ButtonLink href={`/opens/${slug}/rules`} variant="ghost" size="lg" className="text-parchment hover:bg-paper/10">Official Rules</ButtonLink>
            </div>
            {registering && <p className="mt-5 text-[13px] leading-relaxed text-sage">Registration closes <span className="text-parchment">{fmtDateTime(open.registrationCloseAt)}</span>. Round 1 begins {fmtDate(r1?.windowStart)}. The Merit Open runs on these dates no matter how many people register.</p>}
            {reservation && <p className="mt-5 text-[13px] leading-relaxed text-sage">Free and non-binding. Nothing is awarded at this stage; paid registration opens only after the platform owns the home.{open.showReservationCount && <> Reservations on file: <span className="text-parchment">{counts.reservations.toLocaleString()}</span>.</>}</p>}
          </div>
        </Container>
      </section>

      {/* body I: overview and fact sheet, with the docket */}
      <Container className="grid gap-14 py-14 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-16">
          <section id="overview" className={sec}>
            <Plate as="h2" index={idx()}>Overview</Plate>
            <div className="prose-etk mt-5">
              {practice ? <p>Practice Merit Opens exist so the mechanics can be tested at scale before a home is on the line: the same locked rules, the same sealed and hashed answer keys, the same certification by the independent Administrator, and a cash award for the highest certified score.</p>
                : p.factsApprovedAt ? <><p>{p.description}</p>{p.neighborhood && <p>{p.neighborhood} <SourceChip label="Sponsor" date={fmtDate(p.factsApprovedAt)} pending /></p>}</> : <p><Placeholder>[Property description pending counsel approval of factual claims.]</Placeholder></p>}
            </div>
            {!practice && <Ledger className="mt-6" rows={[
              { term: 'Included', detail: <>{included.length ? included.join(' · ') : <Placeholder>[per Exhibit B]</Placeholder>} <SourceChip label="Rules Exhibit B" href={`/opens/${slug}/rules`} /></> },
              { term: 'Excluded', detail: excluded.length ? excluded.join(' · ') : 'Nothing listed' },
              { term: 'Conveyance', detail: <>Fee simple, free of monetary liens, by conventional closing through {cfg?.parties.titleCompany ? <Placeholder>{cfg.parties.titleCompany}</Placeholder> : <Placeholder>[TITLE COMPANY]</Placeholder>}. <SourceChip label="Rules §6.1" href={`/opens/${slug}/rules`} /></> },
              { term: 'Closing costs', detail: <>Sponsor pays owner’s title insurance, deed preparation, recording, and the closing fee; transfer tax allocation <Placeholder>[per Exhibit D]</Placeholder>. The recipient pays prorated property tax, insurance, and costs of ownership from closing. <SourceChip label="Rules §6.5" href={`/opens/${slug}/rules`} /></> },
              { term: 'Possession', detail: <>At closing; keys and access provided at closing. <SourceChip label="Rules §10.3" href={`/opens/${slug}/rules`} /></> },
              { term: 'Condition', detail: <>Conveyed as-is with state-required disclosures; builder warranties listed in Exhibit B are assignable. <SourceChip label="Rules §6.6" href={`/opens/${slug}/rules`} /></> },
              { term: 'Viewing', detail: <Placeholder>[Open-house dates and virtual tour pending]</Placeholder> },
            ]} />}
          </section>
          {!practice && <section id="facts" className={sec}><Plate as="h2" index={idx()}>Fact sheet</Plate><div className="mt-5"><FactSheet p={p} titleVerified={titleVerified} appraisalPending={appraisalPending} /></div></section>}
        </div>
        {aside}
      </Container>

      {/* location band breaks the two-column rhythm */}
      {!practice && hasGeo && (
        <section id="location" className={`${sec} border-y hair bg-parchment/60`}><Container className="py-14">
          <Plate as="h2" index={idx()}>Location</Plate>
          <MapPlate className="mt-5" lat={p.latitude!} lng={p.longitude!} label={p.name} approximate={!owned} county={p.county} />
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            <div><h3 className="plate mb-3 text-ink">Getting there</h3><NearbyList p={p} approvedAt={p.factsApprovedAt} /></div>
            <DistancesLedger p={p} />
            <SunPlate lat={p.latitude!} lng={p.longitude!} tz={tz} now={now} />
          </div>
        </Container></section>
      )}

      {/* body II: cost, record, verify, with the docket */}
      <Container className="grid gap-14 py-14 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-16">
          {!practice && (
            <section id="cost" className={`${sec} grid gap-10 md:grid-cols-[0.8fr_1.2fr]`}>
              <div><Plate as="h2" index={idx()}>Cost to hold</Plate><h3 className="font-display mt-4 text-[32px] leading-tight">A house is taxable income.</h3><p className="mt-4 text-[15px] leading-relaxed text-slate">The total stated value is {money((p.appraisedValueCents ?? 0) + open.cashComponentCents, { compact: true })}: the home at its appraised value plus the cash component. On a home like this the federal tax bill can be six figures, and it’s due the year you receive it. That’s why the prize includes {money(open.cashComponentCents, { compact: true })} in cash — to help cover it. It may not cover all of it, and state taxes vary. Talk to a tax advisor before accepting. Full details are in <Link href={`/opens/${slug}/rules`} className="link-rule">Section 6 of the Official Rules</Link>. <Placeholder>[Illustrative tax arithmetic pending CPA and counsel approval.]</Placeholder></p></div>
              <OwnershipCosts p={p} />
            </section>
          )}
          <section id="record" className={sec}>
            <Plate as="h2" index={idx()}>{practice ? 'Certification record' : 'Title abstract & record'}</Plate>
            {!practice && <div className="mt-5"><TitleLedger p={p} titleVerified={titleVerified} /></div>}
            <h3 className="plate mt-8 mb-3 text-ink">{practice ? 'Certifications' : 'History'}</h3>
            <PropertyRecord p={p} extra={certHistory} />
            <div className="mt-6"><HashVerifier published={pageHashes} /></div>
          </section>
          <section id="verify" className={sec}>
            <Plate as="h2" index={idx()}>Verify everything</Plate>
            <h3 className="font-display mt-4 text-[32px] leading-tight">Scams are vague. We are not.</h3>
            <Ledger className="mt-5" rows={[
              { term: 'The home is real and owned by us', detail: practice ? 'Not applicable: no property is conveyed in a practice event.' : <>{titleVerified ? <>Title held by {p.speEntityName}, deed recorded {fmtDate(p.deedRecordedAt)}.</> : <>Title {owned ? 'recording pending; held by' : `${p.titleStatus.replace(/_/g, ' ')}; to be held by`} <Placeholder>{p.speEntityName ?? '[Property SPE LLC]'}</Placeholder>.</>} <SourceChip label="County recorder" href={p.countyRecorderUrl} pending={!titleVerified} /></> },
              { term: 'Your money is not in our bank account', detail: <>Held by {vendor('custodian')?.name ?? '[Custodian name]'} under a written custody agreement. <SourceChip label="Custody summary" href={vendor('custodian')?.publicSummaryUrl} pending={!vendor('custodian')?.publicSummaryUrl} /></> },
              { term: 'Nobody can pick a favorite', detail: <>Scoring is verified by {vendor('administrator')?.name ?? '[Administrator company]'}, who cannot change a score or a rule. <SourceChip label="Certifications" href="/registry" /></> },
              { term: 'The answer key can’t be changed after you take the test', detail: <>{open.rounds.filter((r) => r.form?.packageHash).length ? <ul className="mt-1 space-y-2">{open.rounds.filter((r) => r.form?.packageHash).map((r) => <li key={r.id} className="flex flex-wrap items-baseline gap-2"><span className="plate w-24">{r.number}</span><Hash value={r.form!.packageHash} short /></li>)}</ul> : <span className="text-graphite">Hashes are published at lock.</span>} <Link href="/registry" className="link-rule text-[13px]">Registry and how to check it yourself →</Link></> },
              { term: 'The dates are fixed', detail: locked ? <>Round dates are in the Official Rules (v{open.rulesVersion}) and don’t move. The registration close cannot be edited after lock. <SourceChip label="Rules §3.6, §13" href={`/opens/${slug}/rules`} /></> : <>Dates become fixed when the Official Rules lock, before registration opens; the schedule below is provisional.</> },
              { term: 'We’re a real company', detail: <><Placeholder>{cfg?.parties.sponsor ?? site.legalEntity}</Placeholder> · <Placeholder>{site.physicalAddress}</Placeholder> · <Placeholder>{site.stateRegistrationNumber}</Placeholder></> },
            ]} />
          </section>
        </div>
        {aside}
      </Container>

      <section className="border-t hair"><Container className="grid gap-12 py-16 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading index={idx()} label="How a Merit Open works" title={practice ? 'Register once. Take the test. Highest score takes the award.' : 'Register once. Take the test. Highest score takes the keys.'} />
        <Ledger rows={[
          { term: '01 · Register once', detail: `${open.registrationFeeCents ? money(open.registrationFeeCents) : 'Free'}, one registration per person, no upgrades, no bundles, no second attempts. Everyone gets exactly the same thing.` },
          { term: '02 · Take the test', detail: `A 60-second qualifier, then ${practice ? 'one round' : 'reasoning rounds'} of self-contained problems. No trivia, no professional knowledge, no speed games. Answers are typed in, not picked from a list, so guessing doesn’t work.` },
          { term: practice ? '03 · Highest score takes the award' : '03 · Highest score takes the keys', detail: 'No drawing. No random selection. Not at any stage, not even to break a tie. The top verified score is certified by an independent administrator.' },
        ]} />
      </Container></section>

      <section className="border-t hair bg-parchment/60"><Container className="grid gap-12 py-16 lg:grid-cols-2">
        <div><SectionHeading index={idx()} label="Who can register" title="Adults in eligible states. Verified." /><p className="mt-4 text-[14px] text-graphite">Adults {cfg?.minimumAge ?? 18}+; legal residents of {states.join(', ') || '[state list]'}; not employees, contractors, or family of the platform, the administrator, the custodian, or the seller. We verify identity and location; if you’re outside an eligible state, please don’t register — we’d have to refund and remove you.</p><div className="mt-6"><EligibilityChecker eligibleStates={states} minimumAge={cfg?.minimumAge ?? 18} /></div></div>
        <div><div className="flex items-baseline justify-between"><Plate as="h3" className="flex-1">Where the event stands</Plate><Link href={`/opens/${slug}/status`} className="ml-4 shrink-0 text-[13px] link-rule">Event board →</Link></div><div className="mt-5"><StageTracker open={open} counts={stage} mine={mine} compact /></div><Plate as="h3" className="mt-10">The schedule</Plate><div className="mt-5"><ScheduleTimeline events={schedule} title={open.name} officialTz={tz} provisional={!locked} /></div><p className="mt-4 text-[13px] text-graphite">Result certified within {cfg?.certificationDays ?? '[—]'} days{practice ? '' : `; closing within ${cfg?.closingDays ?? '[—]'} days`}.</p></div>
      </Container></section>

      {disclosures.length ? (<section className="border-t hair bg-linen/40"><Container className="py-12">{disclosures.map((d) => <div key={d.templateKey} className="max-w-3xl"><Plate as="h2">Required disclosure · {d.templateKey}</Plate><Ledger className="mt-4" rows={[{ term: 'Maximum rounds', detail: String(d.maxRounds) }, { term: 'Maximum cost to participate', detail: money(d.maxCostCents) }, { term: 'Later rounds', detail: d.laterRoundsHarder ? 'Later rounds are more difficult than earlier rounds.' : 'All rounds are of comparable difficulty.' }, { term: 'End date', detail: fmtDate(d.endDate) }, { term: 'Tie method', detail: d.tieMethod }, { term: 'Prior events', detail: d.priorEventStats }]} /></div>)}</Container></section>) : null}

      <section className="border-t hair"><Container className="grid gap-12 py-16 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading index={idx()} label="Questions people ask" title="Short answers. Long rules." />
        <dl className="border-t hair">{faqFor(practice).map(([q, a]) => <div key={q} className="grid gap-2 border-b hair py-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-6"><dt className="font-display text-[19px] leading-snug">{q}</dt><dd className="text-[15px] leading-relaxed text-slate">{a}</dd></div>)}</dl>
      </Container></section>

      <Container><div className="folio border-t border-b-0 py-4 no-print"><span>Plates: schematic from builder plans, not to scale · Map tiles © Esri; OpenStreetMap layer © OpenStreetMap contributors · Sun and light computed from coordinates (NOAA)</span><span className="hidden sm:inline">Listing № {listingNo}</span></div></Container>
      {registering && !myReg && <MobileActionBar href={ctaHref} label={ctaLabel} fee={open.registrationFeeCents ? money(open.registrationFeeCents) : 'Free'} />}
    </>
  );
}
