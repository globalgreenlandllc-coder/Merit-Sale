import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Plate, SectionHeading } from '@/components/ui/Plate';
import { Ledger } from '@/components/ui/Ledger';
import { Stat } from '@/components/ui/Stat';
import { MapThumb } from '@/components/site/MapThumb';
import { PropertyCover } from '@/components/site/PropertyCover';
import { OpenCard } from '@/components/site/OpenCard';
import { FactsStrip } from '@/components/site/ListingSections';
import { ParticipationMeter } from '@/components/site/Participation';
import { Placeholder } from '@/components/ui/Placeholder';
import { site } from '@/lib/site';
import { featuredOpen, listOpens, openCounts, sampleFilter } from '@/modules/meritopens/queries';
import { db } from '@/lib/db';
import { fmtDate, money, sqft } from '@/lib/format';
import { photoSrc, publishedPhotos, toRoman } from '@/lib/photos';

export const dynamic = 'force-dynamic';

const steps = [
  { n: '01', title: 'Register once.', body: 'One fixed fee, one registration per person, no upgrades, no bundles, no second attempts. Everyone gets exactly the same thing: a seat at the test.' },
  { n: '02', title: 'Take the test.', body: 'A 60-second qualifier, then reasoning rounds (the number is fixed in each Merit Open’s Official Rules). Every problem contains everything you need to solve it — no trivia, no professional knowledge, no speed games. Answers are typed in, not picked from a list, so guessing doesn’t work.' },
  { n: '03', title: 'Highest score takes the keys.', body: 'No drawing. No random selection. Not at any stage, not even to break a tie. The top verified score is certified by an independent administrator and the home transfers through a normal real-estate closing.' },
];
const faqs = [
  ['Is this legal?', 'A Merit Open is a skill-based selection event. No random selection is used at any stage, and counsel reviews it before launch in each state where it’s offered. [Link to counsel-approved statement.]'],
  ['Can I buy more than one registration?', 'No. One per person, no exceptions. Anyone who tries is disqualified.'],
  ['What’s on the test?', 'Logic, pattern, and quantitative reasoning problems where all the information is provided. Nothing you’d need a degree for. Try the practice problems.'],
  ['Can I use AI or a calculator?', 'No AI, no outside help. Calculators only where a problem says so. Round 3 and the Final are proctored on camera.'],
  ['What if I don’t advance?', 'Your registration fee is not refunded. It bought your seat at the test. Refunds happen only if the Merit Open is cancelled, in which case everyone is refunded in full.'],
  ['What if nobody good enters?', 'Someone still takes the keys. The highest verified score gets the house, full stop.'],
  ['What if the person with the highest score can’t take the house?', 'The next-highest verified score is certified (Rules 9.2). Never a new selection.'],
];

export default async function HomePage() {
  const [featured, opens, hashes, certs, released, complete] = await Promise.all([
    featuredOpen(), listOpens(), db.form.count({ where: { hashPublishedAt: { not: null }, meritOpen: await sampleFilter() } }), db.certification.count({ where: { meritOpen: await sampleFilter() } }), db.form.count({ where: { packageReleasedAt: { not: null }, meritOpen: await sampleFilter() } }), db.meritOpen.count({ where: { status: 'complete', ...(await sampleFilter()) } }),
  ]);
  const counts = Object.fromEntries(await Promise.all(opens.map(async (o) => [o.id, await openCounts(o.id)] as const)));
  const p = featured?.property; const geo = !!p && typeof p.latitude === 'number' && typeof p.longitude === 'number'; const owned = p?.titleStatus === 'owned';
  const photos = p && !featured?.isPractice ? publishedPhotos(p) : []; const cover = photos[0] ?? null; const strip = photos.slice(1, 5);
  return (
    <>
      {/* cover plate */}
      <section className="grain grain-dark bg-ink text-parchment">
        <Container className="relative z-[2] grid grid-cols-[minmax(0,1fr)] items-center gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_560px] lg:py-20">
          <div className="animate-rise">
            <div className="plate-dark">§ 01 · A merit sale · a new category of residential sale</div>
            <h1 className="font-display display-tight mt-8 text-[46px] leading-[0.98] sm:text-[64px] lg:text-[72px]">One registration. <br />One test. <br /><span className="display-wonk italic text-brass-2">The highest score</span> takes the keys.</h1>
            <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-mist">A merit sale is a way of selling a home where the buyer is chosen by objective skill instead of by price or by luck. No drawing, no random selection, not at any stage. Everything about it is published, hashed, and checkable.</p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              {featured ? <ButtonLink href={`/opens/${featured.slug}`} variant="inverse" size="lg">See {featured.isPractice ? featured.name : p!.address}</ButtonLink> : <ButtonLink href="/opens" variant="inverse" size="lg">See Merit Opens</ButtonLink>}
              <ButtonLink href="#how" variant="ghost" size="lg" className="text-parchment hover:bg-paper/10">How it works</ButtonLink>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 grid-rows-[auto_auto] gap-x-6 gap-y-1 border-t hair-light pt-6">
              <div className="grid grid-rows-subgrid row-span-2"><dt className="plate-dark self-end">Random selection</dt><dd className="font-display text-[26px]">None</dd></div>
              <div className="grid grid-rows-subgrid row-span-2"><dt className="plate-dark self-end">Registrations per person</dt><dd className="font-display text-[26px]">One</dd></div>
              <div className="grid grid-rows-subgrid row-span-2"><dt className="plate-dark self-end">Hashes published</dt><dd className="font-display tabular text-[26px]">{hashes}</dd></div>
            </dl>
          </div>
          {featured && p && (
            <Link href={`/opens/${featured.slug}`} aria-label={featured.isPractice ? `See ${featured.name}` : `See the listing: ${p.address}, ${p.city}, ${p.state}`} className="group relative block min-w-0 animate-rise" style={{ animationDelay: '0.15s' }}>
              <div className="plate-frame-dark" aria-hidden>
                {featured.isPractice
                  ? <div className="grain grain-dark relative flex aspect-[3/2] items-center justify-center bg-ink-2 p-8 text-center"><div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(210,180,122,0.12),transparent_60%)]" aria-hidden /><span className="relative z-[2] font-display text-[30px] leading-tight text-parchment">Practice Merit Open · {money(featured.cashComponentCents)} award</span></div>
                  : <PropertyCover p={p} width={1200} eager className="aspect-[3/2]" imgClassName="transition-transform duration-[1400ms] ease-out group-hover:scale-[1.03]" pendingLabel="Photography pending · vicinity" />}
                {strip.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5 pt-1.5">
                    {strip.map((ph, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={ph.url} src={photoSrc(ph.url, 320)} alt="" className="aspect-[3/2] w-full object-cover opacity-90 transition group-hover:opacity-100" loading="lazy" decoding="async" style={{ transitionDelay: `${i * 40}ms` }} />
                    ))}
                    {strip.length < 4 && geo && strip.length === 3 && <MapThumb lat={p.latitude!} lng={p.longitude!} zoom={12} fill approximate={!owned} className="aspect-[3/2] !w-full" />}
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-6 border-t border-brass-2/20 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-mist"><span className="min-w-0 truncate">{featured.isPractice ? 'Practice · online' : cover ? `Photograph ${toRoman(1)} of ${photos.length} · ${cover.caption || p.name}` : `Vicinity · photography pending`}</span><span className="hidden shrink-0 whitespace-nowrap text-mist/80 sm:inline">{featured.isPractice ? 'Online' : `${p.city}, ${p.state}`}</span></div>
              </div>
              {!featured.isPractice && (
                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t hair-light pt-4" aria-hidden>
                  <div className="min-w-0"><div className="font-display text-[24px] leading-tight text-parchment group-hover:underline decoration-brass-2 decoration-1 underline-offset-4">{p.address}</div><div className="mt-1 text-[13px] text-mist">{p.city}, {p.county ? `${p.county} County, ` : ''}{p.state} · {[p.beds != null && `${p.beds} bd`, p.baths != null && `${p.baths} ba`, p.sqft && sqft(p.sqft), p.yearBuilt && `built ${p.yearBuilt}`].filter(Boolean).join(' · ')}</div><div className="mt-2 text-[13px] text-sage">Prize package: the home plus {money(featured.cashComponentCents, { compact: true })} cash toward taxes · registration {money(featured.registrationFeeCents)} · closes {fmtDate(featured.registrationCloseAt)}</div></div>
                  {geo && cover && <MapThumb lat={p.latitude!} lng={p.longitude!} zoom={11} width={150} height={96} approximate={!owned} className="border border-brass-2/30" />}
                </div>
              )}
            </Link>
          )}
          {!featured && (
            <div className="plate-frame-dark hidden lg:block" aria-hidden>
              <div className="grain grain-dark relative flex aspect-[3/2] flex-col justify-end bg-ink-2 p-8">
                <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(210,180,122,0.12),transparent_60%)]" />
                <div className="plate-dark relative z-[2]">Next Merit Open</div>
                <p className="font-display relative z-[2] mt-3 text-[26px] leading-tight text-parchment/90">The next listing is announced here first, with its rules, schedule, and hash published before anyone registers.</p>
              </div>
            </div>
          )}
        </Container>
      </section>

      {/* now registering */}
      {featured && !featured.isPractice && p && (
        <section className="border-b hair bg-parchment/60"><Container className="grid gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <Plate index="§ 02">{featured.status === 'reservation' ? 'Coming · reservation list open' : featured.status === 'registration' ? 'Now registering' : 'In progress'}</Plate>
            <h2 className="font-display mt-5 text-[38px] leading-[1.05]">{featured.name}</h2>
            <p className="mt-2 text-[15px] text-slate">{p.name} · {p.address}, {p.city}, {p.state}</p>
            <FactsStrip p={p} limit={5} className="mt-6" />
            <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-[14px] sm:grid-cols-4">
              <div><dt className="plate">Registration</dt><dd className="mt-0.5">{money(featured.registrationFeeCents)}</dd></div><div><dt className="plate">Cash component</dt><dd className="mt-0.5">{money(featured.cashComponentCents, { compact: true })}</dd></div><div><dt className="plate">Closes</dt><dd className="mt-0.5">{fmtDate(featured.registrationCloseAt)}</dd></div><div><dt className="plate">Rules hash</dt><dd className="mt-0.5 font-mono text-[12px]">{featured.rulesHash ? `${featured.rulesHash.slice(0, 12)}…` : 'pending lock'}</dd></div>
            </dl>
            {counts[featured.id] && <div className="mt-6 max-w-sm"><ParticipationMeter open={featured} counts={counts[featured.id]!} compact /></div>}
            <div className="mt-7 flex flex-wrap gap-3"><ButtonLink href={`/opens/${featured.slug}`} size="lg">See the listing</ButtonLink><ButtonLink href={`/opens/${featured.slug}/rules`} variant="secondary" size="lg">Official Rules</ButtonLink></div>
          </div>
          {geo && <div className="plate-frame self-start"><MapThumb lat={p.latitude!} lng={p.longitude!} zoom={11} width={306} height={230} approximate={!owned} className="!w-full" /><div className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-graphite">Vicinity · {p.city}, {p.state}</div></div>}
        </Container></section>
      )}

      <section id="how" className="scroll-mt-20"><Container className="py-20">
        <SectionHeading index="§ 03" label="How a Merit Open works" title="Three steps. Nothing hidden in any of them." />
        <ol className="mt-12 grid gap-10 md:grid-cols-3">{steps.map((s) => <li key={s.n} className="border-t hair pt-6"><span className="plate">{s.n}</span><h3 className="font-display mt-4 text-[26px] leading-tight">{s.title}</h3><p className="mt-4 text-[15px] leading-relaxed text-slate">{s.body}</p></li>)}</ol>
      </Container></section>

      <section className="grain grain-dark bg-ink text-parchment"><Container className="relative z-[2] grid gap-12 py-20 lg:grid-cols-2">
        <SectionHeading dark index="§ 04" label="This is not a raffle" title={<>We don’t sell chances. <span className="italic text-brass-2">We sell a seat at the test.</span></>} />
        <div className="space-y-5 text-[16px] leading-relaxed text-mist lg:pt-12"><p>A Merit Open is a merit sale: a way of selling a home where the buyer is chosen by skill instead of by price or by luck. The registration fee buys your seat at the test, nothing else.</p><p>If you’d prefer a raffle, this isn’t for you. If you’re good at thinking through problems, the house is yours to earn.</p><Link href="/practice" className="link-rule inline-block text-parchment">Try the practice problems →</Link></div>
      </Container></section>

      <section><Container className="py-20">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading index="§ 05" label="Verify everything" title="Scams are vague. We are not." lede="Every factual claim on this site is either linked to its source or visibly marked pending: a county record, a custody agreement, a third-party administrator, a cryptographic hash." />
          <Ledger rows={[
            { term: 'The home is real and owned by us', detail: 'Title is held by the property SPE before paid registration opens. Each listing links the county recorder entry.' },
            { term: 'Your money is not in our bank account', detail: <>Registration fees settle from the payment processor directly to a third-party custodian under a written custody agreement. The platform holds no balance. <Link href="/custody" className="link-rule">Custody ledger →</Link></> },
            { term: 'Nobody can pick a favorite', detail: 'Scoring and advancement are certified by an independent administrator who cannot change a score or a rule. Advancement is a pure function of the score table and is replayable.' },
            { term: 'The answer key can’t be changed after you take the test', detail: <>Before each round we publish a SHA-256 fingerprint of the sealed answer key and release the key afterward. <Link href="/registry" className="link-rule">Hash registry →</Link></> },
            { term: 'The dates are fixed', detail: 'Round dates are in the Official Rules and don’t move. The registration close date cannot be edited once the rules are locked.' },
            { term: 'We’re a real company', detail: <><Placeholder>{site.legalEntity}</Placeholder>, <Placeholder>{site.physicalAddress}</Placeholder>, <Placeholder>{site.stateRegistrationNumber}</Placeholder>.</> },
          ]} />
        </div>
        <div className="mt-12 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Hashes published" value={hashes} hint={<Link href="/registry" className="link-rule">registry</Link>} /><Stat label="Certifications signed" value={certs} hint={<Link href="/registry" className="link-rule">every document hash</Link>} /><Stat label="Packages released" value={released} hint={<Link href="/registry" className="link-rule">download and verify</Link>} /><Stat label="Merit Opens completed" value={complete} hint={<Link href="/audit" className="link-rule">audit summaries</Link>} />
        </div>
      </Container></section>

      <section className="border-t hair bg-parchment/60"><Container className="py-20">
        <SectionHeading index="§ 06" label="The catalogue" title="Every Merit Open, past and present." lede="Completed events keep their public audit summary and released answer keys online permanently." />
        <div className="mt-10">{opens.map((o) => <OpenCard key={o.id} open={o} counts={counts[o.id]} />)}{!opens.length && <p className="text-slate">No Merit Opens have been published yet.</p>}</div>
      </Container></section>

      <section><Container className="grid gap-12 py-20 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading index="§ 07" label="Questions people ask" title="Short answers. Long rules." lede={<>Everything here is expanded in the <Link href="/rules" className="link-rule">Official Rules</Link>.</>} />
        <dl className="border-t hair">{faqs.map(([q, a]) => <div key={q} className="grid gap-2 border-b hair py-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-6"><dt className="font-display text-[19px] leading-snug">{q}</dt><dd className="text-[15px] leading-relaxed text-slate">{a}</dd></div>)}</dl>
      </Container></section>

      <Container><div className="folio border-t border-b-0 py-4"><span>Photographs credited on each listing · Plates schematic from builder plans, not to scale · Map tiles © Esri; OpenStreetMap fallback © OpenStreetMap contributors · Fraunces, Instrument Sans, JetBrains Mono</span><span className="hidden sm:inline">Earn the Keys</span></div></Container>
    </>
  );
}
