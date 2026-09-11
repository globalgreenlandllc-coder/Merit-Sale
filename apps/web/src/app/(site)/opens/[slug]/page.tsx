import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Plate, SectionHeading } from '@/components/ui/Plate';
import { Ledger } from '@/components/ui/Ledger';
import { Notice } from '@/components/ui/Notice';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Hash } from '@/components/ui/Hash';
import { PropertyFigure } from '@/components/site/PropertyFigure';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { fmtDate, fmtDateTime, fmtDuration, money, roundLabel, safeJson, sqft } from '@/lib/format';
import { eligibleStates, getOpenBySlug, latestRuleset, openCounts, parseConfig } from '@/modules/meritopens/queries';

export const dynamic = 'force-dynamic';

export default async function OpenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const open = await getOpenBySlug(slug);
  if (!open) notFound();
  const [session, counts, vendors] = await Promise.all([getSession(), openCounts(open.id), db.vendor.findMany({ where: { active: true } })]);
  const p = open.property;
  const rs = latestRuleset(open);
  const cfg = parseConfig(rs);
  const states = eligibleStates(open);
  const reservation = open.status === 'reservation';
  const registering = open.status === 'registration';
  const vendor = (kind: string) => vendors.find((v) => v.kind === kind);
  const included = safeJson<string[]>(p.includedItemsJson, []);
  const myReg = session ? await db.registration.findUnique({ where: { userId_meritOpenId: { userId: session.userId, meritOpenId: open.id } } }) : null;
  const r1 = open.rounds.find((r) => r.number === 'r1');

  return (
    <>
      <section className="grain border-b hair">
        <Container className="relative z-[2] grid items-start gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={open.status} />{open.isPractice && <Badge>Practice event</Badge>}{p.titleStatus === 'owned' && !open.isPractice && <Badge tone="verify">Title held by SPE</Badge>}</div>
            <Plate className="mt-6">{open.name}</Plate>
            <h1 className="font-display display-tight mt-6 text-[42px] leading-[1] text-ink sm:text-[58px]">
              {open.isPractice ? <>One registration. One test. <span className="italic text-moss">The highest score</span> takes the award.</> : <>One registration. One test. <span className="italic text-moss">The highest score</span> gets the house.</>}
            </h1>
            <p className="mt-6 text-[16px] leading-relaxed text-slate">
              {open.isPractice
                ? <>A Phase 0 practice Merit Open: Round 1 and Round 2 only, Tier 1 controls, a {money(open.cashComponentCents)} cash award. No property is conveyed.</>
                : <>{p.address}, {p.city}, {p.state} · {p.beds} bed · {p.baths} bath · {sqft(p.sqft)} · Built {p.yearBuilt}<br /><strong className="text-ink">Prize package:</strong> the home plus {money(open.cashComponentCents, { compact: true })} cash toward your taxes.</>}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {registering && !myReg && <ButtonLink href={`/opens/${slug}/register`} size="lg">Register — {open.registrationFeeCents ? money(open.registrationFeeCents) : 'free'}</ButtonLink>}
              {registering && myReg && <ButtonLink href="/account" size="lg">Your registration is {myReg.status}</ButtonLink>}
              {reservation && <ButtonLink href={`/opens/${slug}/reserve`} size="lg">Join the free reservation list</ButtonLink>}
              {!registering && !reservation && ['r1', 'r2', 'r3', 'final', 'tiebreak'].includes(open.status) && <ButtonLink href="/account" size="lg">Rounds in progress — your account</ButtonLink>}
              <ButtonLink href={`/opens/${slug}/rules`} variant="secondary" size="lg">Read the Official Rules</ButtonLink>
            </div>
            {registering && (
              <p className="mt-6 text-[14px] leading-relaxed text-graphite">
                Registration closes <strong className="text-ink">{fmtDateTime(open.registrationCloseAt)}</strong>. Round 1 begins {fmtDate(r1?.windowStart)}. The Merit Open runs on these dates no matter how many people register.
              </p>
            )}
            {reservation && (
              <Notice className="mt-6" tone="info" title="Free and non-binding">
                Nothing is awarded at this stage. Paid registration opens only after the platform owns the home. Reservation holders get a {open.firstAccessHours}-hour first-access window before general opening.{open.showReservationCount && <> Currently on the list: <strong>{counts.reservations.toLocaleString()}</strong>{open.reservationTarget ? ` of a ${open.reservationTarget.toLocaleString()} target` : ''}.</>}
              </Notice>
            )}
          </div>
          <PropertyFigure caption={open.isPractice ? 'Practice event · no property' : `${p.name} · plan · not to scale · photography pending counsel approval`} />
        </Container>
      </section>

      <Container className="py-16">
        <SectionHeading index="§ 01" label="How a Merit Open works" title="Register once. Take the test. Highest score takes the keys." />
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            ['Register once.', `${open.registrationFeeCents ? money(open.registrationFeeCents) : 'Free'}, one registration per person, no upgrades, no bundles, no second chances. Everyone gets exactly the same thing.`],
            ['Take the test.', 'A 60-second qualifier, then reasoning rounds. Every problem contains everything you need to solve it — no trivia, no professional knowledge, no speed games. Answers are typed in, not picked from a list, so guessing doesn’t work.'],
            ['Highest score takes the keys.', 'No drawing. No random selection. Not at any stage, not even to break a tie. The top verified score is certified by an independent administrator.'],
          ].map(([t, b], i) => (
            <li key={t} className="border-t hair pt-5"><span className="plate">0{i + 1}</span><h3 className="font-display mt-3 text-[24px] leading-tight">{t}</h3><p className="mt-3 text-[15px] leading-relaxed text-slate">{b}</p></li>
          ))}
        </ol>
      </Container>

      <section className="border-y hair bg-parchment/60">
        <Container className="grid gap-12 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading index="§ 02" label="Verify everything" title="Scams are vague. We are not." />
          <Ledger rows={[
            { term: 'The home is real and owned by us', detail: open.isPractice ? 'Not applicable: no property is conveyed in a practice event.' : <>Title held by <span className="font-mono text-[13px]">{p.speEntityName ?? '[Property SPE LLC]'}</span>{p.deedRecordedAt ? `, deed recorded ${fmtDate(p.deedRecordedAt)}` : ' (recording pending)'}. {p.countyRecorderUrl ? <a className="link-rule" href={p.countyRecorderUrl}>County recorder →</a> : <span className="text-graphite">County recorder link pending.</span>}</> },
            { term: 'Your money is not in our bank account', detail: <>Held by <span className="font-mono text-[13px]">{vendor('custodian')?.name ?? '[Custodian name]'}</span> under a written custody agreement. {vendor('custodian')?.publicSummaryUrl ? <a className="link-rule" href={vendor('custodian')!.publicSummaryUrl!}>Summary →</a> : <span className="text-graphite">Summary pending.</span>}</> },
            { term: 'Nobody can pick a favorite', detail: <>Scoring is verified by <span className="font-mono text-[13px]">{vendor('administrator')?.name ?? '[Administrator company]'}</span>, who cannot change a score or a rule. Certifications are hashed and listed in the <Link href="/registry" className="link-rule">registry</Link>.</> },
            { term: 'The answer key can’t be changed after you take the test', detail: <>Sealed package hashes: {open.rounds.filter((r) => r.form?.packageHash).length ? <ul className="mt-2 space-y-1">{open.rounds.filter((r) => r.form?.packageHash).map((r) => <li key={r.id} className="flex flex-wrap items-baseline gap-2"><span className="plate w-24">{r.number}</span><Hash value={r.form!.packageHash} short /></li>)}</ul> : <span className="text-graphite">published at lock.</span>} <Link href="/registry" className="link-rule">How to check it yourself →</Link></> },
            { term: 'The dates are fixed', detail: <>Round dates are in the Official Rules (version {open.rulesVersion ?? 'draft'}, hash <Hash value={open.rulesHash} short />) and don’t move.</> },
            { term: 'We’re a real company', detail: <><span className="rounded-xs bg-amber-2 px-1 font-mono text-[13px] text-amber">{cfg?.parties.sponsor ?? '[Legal entity name]'}</span> · <span className="rounded-xs bg-amber-2 px-1 font-mono text-[13px] text-amber">[physical address]</span> · <span className="rounded-xs bg-amber-2 px-1 font-mono text-[13px] text-amber">[state registration number]</span></> },
          ]} />
        </Container>
      </section>

      {!open.isPractice && (
        <Container className="grid gap-12 py-16 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionHeading index="§ 03" label="What you’re competing for" title={p.name} />
            <p className="mt-6 text-[15.5px] leading-relaxed text-slate">{p.description ?? '[Two short paragraphs on the property: neighborhood, layout, what’s included. Factual. No superlatives counsel hasn’t approved.]'}</p>
            {p.neighborhood && <p className="mt-4 text-[15.5px] leading-relaxed text-slate">{p.neighborhood}</p>}
            <Ledger className="mt-8" rows={[
              { term: 'Included', detail: included.length ? included.join(' · ') : '[appliances, fixtures per Exhibit B]' },
              { term: 'Stated value', detail: <>{money(p.appraisedValueCents)}, based on {p.appraiserName ? `independent appraisal by ${p.appraiserName}` : '[independent appraisal]'} dated {fmtDate(p.appraisalDate)}</> },
              { term: 'Conveyance', detail: 'Fee simple, free of monetary liens, by conventional closing through the title company named in the Official Rules.' },
            ]} />
          </div>
          <div>
            <SectionHeading index="§ 04" label="The honest part about winning a house" title="A house is taxable income." />
            <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-slate">
              <p>On a home like this the federal tax bill can be six figures, and it’s due the year you receive it. That’s why the prize includes {money(open.cashComponentCents, { compact: true })} in cash — to help cover it. It may not cover all of it, and state taxes vary. You’ll also pay property taxes, insurance, and upkeep like any owner.</p>
              <p>The person who takes the keys is strongly encouraged to talk to a tax advisor before accepting. Full details are in Section 6 of the Official Rules.</p>
            </div>
          </div>
        </Container>
      )}

      <section className="border-t hair">
        <Container className="grid gap-12 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeading index="§ 05" label="Who can register" title="Adults in eligible states. Verified." />
            <ul className="mt-6 space-y-2 text-[15px] text-slate">
              <li>· Adults {cfg?.minimumAge ?? 18}+</li>
              <li>· Legal residents of: <strong className="text-ink">{states.length ? states.join(', ') : '[state list]'}</strong></li>
              <li>· Not employees, contractors, or family of the platform, the administrator, the custodian, or the seller</li>
            </ul>
            <p className="mt-4 text-[14px] text-graphite">We verify identity and location. If you’re outside an eligible state, please don’t register — we’ll have to refund and remove you.</p>
          </div>
          <div>
            <Plate>The schedule</Plate>
            <table className="mt-4 w-full border-t hair text-[14.5px]">
              <tbody>
                <tr className="border-b hair"><td className="py-3 pr-4 text-slate">Registration closes</td><td className="py-3 text-ink">{fmtDateTime(open.registrationCloseAt)}</td></tr>
                {open.rounds.filter((r) => !r.number.startsWith('tiebreak')).map((r) => (
                  <tr key={r.id} className="border-b hair"><td className="py-3 pr-4 text-slate">{roundLabel(r.number)} <span className="text-graphite">({fmtDuration(r.durationSeconds)}{r.integrityTier > 1 ? `, proctored` : ''})</span></td><td className="py-3 text-ink">{r.windowStart ? `${fmtDateTime(r.windowStart)} to ${fmtDateTime(r.windowEnd)}` : fmtDateTime(r.scheduledAt)}</td></tr>
                ))}
                <tr className="border-b hair"><td className="py-3 pr-4 text-slate">Result certified</td><td className="py-3 text-ink">within [—] days</td></tr>
                {!open.isPractice && <tr className="border-b hair"><td className="py-3 pr-4 text-slate">Closing</td><td className="py-3 text-ink">within [—] days</td></tr>}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {cfg?.disclosures?.length ? (
        <section className="border-t hair bg-linen/40">
          <Container className="py-12">
            {cfg.disclosures.map((d) => (
              <div key={d.templateKey} className="max-w-3xl">
                <Plate>Required disclosure · {d.templateKey}</Plate>
                <Ledger className="mt-4" rows={[
                  { term: 'Maximum rounds', detail: String(d.maxRounds) },
                  { term: 'Maximum cost to participate', detail: money(d.maxCostCents) },
                  { term: 'Later rounds', detail: d.laterRoundsHarder ? 'Later rounds are more difficult than earlier rounds.' : 'All rounds are of comparable difficulty.' },
                  { term: 'End date', detail: d.endDate },
                  { term: 'Tie method', detail: d.tieMethod },
                  { term: 'Prior events', detail: d.priorEventStats },
                ]} />
              </div>
            ))}
          </Container>
        </section>
      ) : null}
    </>
  );
}
