import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Plate, SectionHeading } from '@/components/ui/Plate';
import { Ledger } from '@/components/ui/Ledger';
import { Seal } from '@/components/ui/Seal';
import { PropertyFigure } from '@/components/site/PropertyFigure';
import { OpenCard } from '@/components/site/OpenCard';
import { featuredOpen, listOpens } from '@/modules/meritopens/queries';
import { db } from '@/lib/db';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

const steps = [
  { n: '01', title: 'Register once.', body: 'One fixed fee, one registration per person, no upgrades, no bundles, no second attempts. Everyone gets exactly the same thing: a seat at the test.' },
  { n: '02', title: 'Take the test.', body: 'A 60-second qualifier, then three rounds of reasoning problems. Every problem contains everything you need to solve it — no trivia, no professional knowledge, no speed games. Answers are typed in, not picked from a list, so guessing doesn’t work.' },
  { n: '03', title: 'Highest score takes the keys.', body: 'No drawing. No random selection. Not at any stage, not even to break a tie. The top verified score is certified by an independent administrator and the home transfers through a normal real-estate closing.' },
];

const faqs = [
  ['Is this legal?', 'A Merit Open is a skill-based selection event, structured to remove chance from every stage, and reviewed by counsel before launch in each state where it’s offered. [Link to counsel-approved statement.]'],
  ['Can I buy more than one registration?', 'No. One per person, no exceptions. Anyone who tries is disqualified.'],
  ['What’s on the test?', 'Logic, pattern, and quantitative reasoning problems where all the information is provided. Nothing you’d need a degree for. Try the practice problems.'],
  ['Can I use AI or a calculator?', 'No AI, no outside help. Calculators only where a problem says so. Round 3 and the Final are proctored on camera.'],
  ['What if I don’t advance?', 'Your registration fee is not refunded. It bought your seat at the test. Refunds happen only if the Merit Open is cancelled, in which case everyone is refunded in full.'],
  ['What if nobody good enters?', 'Someone still takes the keys. The highest verified score gets the house, full stop.'],
  ['What if the person with the highest score can’t take the house?', 'The next-highest score is certified. Never a redraw.'],
];

export default async function HomePage() {
  const [featured, opens, hashes] = await Promise.all([featuredOpen(), listOpens(), db.form.count({ where: { hashPublishedAt: { not: null } } })]);
  const p = featured?.property;
  return (
    <>
      {/* HERO */}
      <section className="grain relative overflow-hidden border-b hair">
        <Container className="relative z-[2] grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="animate-rise">
            <Plate index="§ 01">A merit sale · a new category of residential sale</Plate>
            <h1 className="font-display display-tight mt-8 text-[46px] leading-[0.98] text-ink sm:text-[64px] lg:text-[76px]">
              One registration. <br />One test. <br /><span className="display-wonk italic text-moss">The highest score</span> takes the keys.
            </h1>
            <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-slate">
              A merit sale is a way of selling a home where the buyer is chosen by objective skill instead of by price or by luck. No drawing, no random selection, not at any stage. Everything about it is published, hashed, and checkable.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              {featured ? <ButtonLink href={`/opens/${featured.slug}`} size="lg">See {featured.name}</ButtonLink> : <ButtonLink href="/opens" size="lg">See Merit Opens</ButtonLink>}
              <ButtonLink href="#how" variant="secondary" size="lg">How it works</ButtonLink>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t hair pt-6">
              <div><dt className="plate">Chance used</dt><dd className="font-display mt-1 text-[26px]">None</dd></div>
              <div><dt className="plate">Registrations per person</dt><dd className="font-display mt-1 text-[26px]">One</dd></div>
              <div><dt className="plate">Hashes published</dt><dd className="font-display mt-1 text-[26px] tabular-nums">{hashes}</dd></div>
            </dl>
          </div>
          <div className="relative animate-rise" style={{ animationDelay: '0.15s' }}>
            <PropertyFigure caption={p ? `${p.name} · ${p.city}, ${p.state} · plan, not to scale` : 'Plan · not to scale'} />
            <div className="absolute -bottom-6 -left-4 hidden text-brass sm:block"><Seal size={120} /></div>
          </div>
        </Container>
      </section>

      {/* FEATURED */}
      {featured && (
        <section className="border-b hair bg-parchment/60">
          <Container className="py-14">
            <SectionHeading index="§ 02" label={featured.status === 'reservation' ? 'Coming — reservation list open' : 'Now registering'} title={featured.name}
              lede={featured.isPractice ? 'A practice Merit Open with a cash award. Same rules, same controls, no property.' : `${p!.address}, ${p!.city}, ${p!.state}. Prize package: the home plus ${money(featured.cashComponentCents, { compact: true })} cash toward your taxes.`} />
            <div className="mt-8"><OpenCard open={featured} featured /></div>
          </Container>
        </section>
      )}

      {/* HOW */}
      <section id="how" className="scroll-mt-20">
        <Container className="py-20">
          <SectionHeading index="§ 03" label="How a Merit Open works" title="Three steps. Nothing hidden in any of them." />
          <ol className="mt-12 grid gap-px overflow-hidden rounded-md border hair bg-ink/10 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="bg-paper p-8">
                <span className="plate">{s.n}</span>
                <h3 className="font-display mt-4 text-[26px] leading-tight">{s.title}</h3>
                <p className="mt-4 text-[15px] leading-relaxed text-slate">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* NOT A RAFFLE */}
      <section className="grain grain-dark bg-ink text-parchment">
        <Container className="relative z-[2] grid gap-12 py-20 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionHeading dark index="§ 04" label="This is not a raffle" title={<>We don’t sell chances. <span className="italic text-brass-2">We sell a seat at the test.</span></>} />
          </div>
          <div className="space-y-5 text-[16px] leading-relaxed text-mist lg:pt-12">
            <p>A Merit Open is a merit sale: a way of selling a home where the buyer is chosen by skill instead of by price or by luck. The registration fee buys your seat at the test, nothing else.</p>
            <p>If you’d prefer a raffle, this isn’t for you. If you’re good at thinking through problems, the house is yours to earn.</p>
            <Link href="/practice" className="link-rule inline-block text-parchment">Try the practice problems →</Link>
          </div>
        </Container>
      </section>

      {/* VERIFY */}
      <section>
        <Container className="grid gap-12 py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading index="§ 05" label="Verify everything" title="Scams are vague. We are not." lede="Every claim on this site links to something you can check yourself: a county record, a custody agreement, a third-party administrator, a cryptographic hash." />
          <Ledger rows={[
            { term: 'The home is real and owned by us', detail: <>Title is held by the property SPE before paid registration opens. Each Merit Open page links the county recorder entry.</> },
            { term: 'Your money is not in our bank account', detail: <>Registration fees settle from the payment processor directly to a third-party custodian under a written custody agreement. The platform holds no balance.</> },
            { term: 'Nobody can pick a favorite', detail: <>Scoring and advancement are certified by an independent administrator who cannot change a score or a rule. Advancement is a pure function of the score table and is replayable.</> },
            { term: 'The answer key can’t be changed after you take the test', detail: <>Before each round we publish a SHA-256 fingerprint of the sealed answer key and release the key afterward. <Link href="/registry" className="link-rule">Hash registry →</Link></> },
            { term: 'The dates are fixed', detail: <>Round dates are in the Official Rules and don’t move. The registration close date cannot be edited once the rules are locked.</> },
            { term: 'We’re a real company', detail: <><span className="rounded-xs bg-amber-2 px-1 font-mono text-[13px] text-amber">[Legal entity name]</span>, <span className="rounded-xs bg-amber-2 px-1 font-mono text-[13px] text-amber">[physical address]</span>, <span className="rounded-xs bg-amber-2 px-1 font-mono text-[13px] text-amber">[state registration number]</span>.</> },
          ]} />
        </Container>
      </section>

      {/* OPENS */}
      <section className="border-t hair bg-parchment/60">
        <Container className="py-20">
          <SectionHeading index="§ 06" label="Merit Opens" title="Every event, past and present." lede="Completed Merit Opens keep their public audit summary and released answer keys online permanently." />
          <div className="mt-10">
            {opens.map((o) => <OpenCard key={o.id} open={o} />)}
            {!opens.length && <p className="text-slate">No Merit Opens have been published yet.</p>}
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section>
        <Container className="grid gap-12 py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading index="§ 07" label="Questions people ask" title="Short answers. Long rules." lede={<>Everything here is expanded in the <Link href="/rules" className="link-rule">Official Rules</Link>.</>} />
          <dl className="border-t hair">
            {faqs.map(([q, a]) => (
              <div key={q} className="grid gap-2 border-b hair py-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-6">
                <dt className="font-display text-[19px] leading-snug">{q}</dt>
                <dd className="text-[15px] leading-relaxed text-slate">{a}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>
    </>
  );
}
