import Link from 'next/link';
import type { RulesetConfig } from '@etk/rules-config';
import { fmtDateTime, fmtDuration, money } from '@/lib/format';
import type { OpenFull } from '@/modules/meritopens/queries';

/**
 * The rules in plain language, generated from the event's locked (or draft) configuration so
 * the numbers can never drift from the Official Rules. Every card cites its section.
 */
export function PlainRules({ open, cfg, states, rulesHref }: { open: OpenFull; cfg: RulesetConfig | null; states: string[]; rulesHref: string }) {
  const fee = open.registrationFeeCents ? money(open.registrationFeeCents) : 'free';
  const rounds = open.rounds.filter((r) => !r.number.startsWith('tiebreak'));
  const r = (n: string) => rounds.find((x) => x.number === n);
  const win = (n: string) => { const x = r(n); return x ? (x.windowStart ? `${fmtDateTime(x.windowStart)} → ${fmtDateTime(x.windowEnd)}` : fmtDateTime(x.scheduledAt)) : '[scheduled at lock]'; };
  const items = cfg?.rounds ?? [];
  const count = (n: string) => items.find((x) => x.number === n)?.itemCount;
  const cards: { n: string; title: string; body: React.ReactNode; s: string }[] = [
    { n: '01', s: '§ 2', title: 'Who can register', body: <>Adults {cfg?.minimumAge ?? 18}+ who are legal residents of, and physically in, {states.length ? states.join(', ') : '[the eligible states]'}, and able to take title to real property. Not employees, contractors, agents, or immediate family of the platform, the administrator, the custodian, the vendors, the item authors, the title company, or the seller. Identity and location are verified. One registration per person, ever; a second attempt disqualifies both.</> },
    { n: '02', s: '§ 3, § 12', title: 'What you pay and where it goes', body: <>One fixed fee of <strong>{fee}</strong>. No tiers, bundles, credits, extra attempts, or extended time for money. The fee settles from the payment processor directly to the custodian, not to the sponsor. It is refunded only if the Merit Open is cancelled under § 12.4, then in full including processing fees{cfg ? ` within ${cfg.refundSlaDays} days` : ''}. Not advancing, withdrawing, or missing a round is not a refund.</> },
    { n: '03', s: '§ 6', title: open.isPractice ? 'What you compete for' : 'The home and the cash', body: open.isPractice ? <>A cash award of {money(open.cashComponentCents)}. No property is conveyed in a practice event.</> : <>Fee simple title to the home, free of monetary liens, plus {money(open.cashComponentCents, { compact: true })} in cash toward your income tax. The home is taxable income; the cash may not cover all of it, and state taxes vary. The sponsor pays owner’s title insurance, deed preparation, recording, and the closing fee; you pay property tax and insurance from closing. Conveyed as-is with the state-required disclosures. No cash alternative, no assignment before closing.</> },
    { n: '04', s: '§ 4', title: 'The rounds', body: <ul className="space-y-1.5">
        {r('r1') && <li><strong>Round 1</strong> · {count('r1') ?? 1} free-response item, {fmtDuration(r('r1')!.durationSeconds)} from the moment it renders · {win('r1')} · one attempt inside the window.</li>}
        {r('r2') && <li><strong>Round 2</strong> · {count('r2') ?? 10} items, {fmtDuration(r('r2')!.durationSeconds)}, locked browser · {win('r2')}.</li>}
        {r('r3') && <li><strong>Round 3</strong> · {count('r3') ?? 12} multi-step problems with partial credit, {fmtDuration(r('r3')!.durationSeconds)}, live proctored with ID match · {win('r3')}.</li>}
        {r('final') && <li><strong>Final</strong> · one optimisation problem with a continuous objective, {fmtDuration(r('final')!.durationSeconds)}, fully proctored, affidavit required · {win('final')}.</li>}
        <li>Every item is self-contained: everything needed to answer it is in the item. No trivia, no credentials. Answers are typed, never chosen from a list. Everyone gets the same items in the same order.</li>
      </ul> },
    { n: '05', s: '§ 5.1–5.3', title: 'Scoring and who advances', body: <>Your score is the sum of points under the locked answer key and formulas; blank or unreadable answers score zero. Advancement is decided by these rules in order and nothing else: total score; then, among ties, score on the tie-order subset (Round 2 items {cfg?.tieOrderSubsets.r2.join(', ') ?? '[—]'}; Round 3 items {cfg?.tieOrderSubsets.r3.join(', ') ?? '[—]'}); then elapsed time, lower first. Top <strong>{open.advanceN.toLocaleString()}</strong> advance from Round 2 and top <strong>{open.advanceM.toLocaleString()}</strong> from Round 3. If a tie straddles the cutoff, everyone tied at that position advances. Nobody is ever excluded by a drawing or by discretion.</> },
    { n: '06', s: '§ 5.4–5.5', title: 'The Final and exact ties', body: <>The highest valid Final score takes the keys; elapsed time is not used in the Final. If two or more finalists tie to the full precision of the published formula, the administrator serves a sealed tie-break problem to all of them at once, then another, until one score is highest. No coin flip, no drawing, no preference.</> },
    { n: '07', s: '§ 7', title: 'Sealed keys you can check', body: <>Before each round opens, the administrator publishes a SHA-256 hash of the sealed package (items, keys, formulas). After scores are certified and the dispute window closes, the package is released so anyone can confirm the keys used were the keys committed. <Link className="link-rule" href="/registry">Registry and verifier →</Link></> },
    { n: '08', s: '§ 8', title: 'Working alone', body: <>No help from anyone, no AI, no searches, no second device, no copying items. Round 1 and 2 use a locked browser with focus logging; later rounds add live proctoring with webcam, screen recording, room scan, and ID match. After Round 1 the administrator runs statistical screens; flagged registrants are reviewed before advancement is certified. Violations mean disqualification and forfeiture. Accommodations for disability are available on request{cfg ? ` up to ${cfg.accommodationRequestDeadlineDays} days before a round` : ''} and never change the items or scoring. A verified platform outage is remedied by re-administering the round with a committed reserve form, never by adjusting a score.</> },
    { n: '09', s: '§ 9–10', title: 'After the highest score is certified', body: <>The potential winner re-verifies identity, age, residency, and eligibility, signs an affidavit and the acceptance documents, then closes through the title company{cfg?.closingDays ? ` within ${cfg.closingDays} days` : ''}. If they fail verification or decline, the next-highest valid score is certified. Never a new selection.</> },
    { n: '10', s: '§ 11', title: 'If you disagree with a score', body: <>Challenge your own score from your account within {cfg?.disputeWindowHours ?? 72} hours of posting, naming the item and the claimed error. The administrator decides against the locked key and cannot change a key, a formula, or a rule. Anyone may report suspected cheating. Remaining disputes go to individual arbitration under the Terms.</> },
    { n: '11', s: '§ 12–14', title: 'Cancellation, changes, and the public record', body: <>The sponsor may cancel only for the four events in § 12.4 (law, loss of the property, a security failure, or fraud affecting the whole event), refunding everyone in full. After registration opens, the fee, property, cash, rounds, scoring, eligibility, and dates do not change except for clerical or legally required corrections, which are re-hashed and notified to every registrant. A public audit summary is published after closing: registrations by state, advancing counts, integrity dispositions, and the certified score.</> },
  ];
  return (
    <div>
      <ol className="grid gap-px overflow-hidden rounded-md border hair bg-ink/10 md:grid-cols-2">
        {cards.map((c) => (
          <li key={c.n} className="bg-paper p-6"><div className="flex items-baseline justify-between gap-4"><span className="plate">{c.n}</span><span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-graphite">Rules {c.s}</span></div><h3 className="font-display mt-3 text-[22px] leading-tight">{c.title}</h3><div className="mt-3 text-[14.5px] leading-relaxed text-slate">{c.body}</div></li>
        ))}
      </ol>
      <p className="mt-4 text-[12.5px] text-graphite">This summary is generated from the event’s configuration and is not the agreement. The <Link href={rulesHref} className="link-rule">Official Rules</Link> control; where they say something different, they win.</p>
    </div>
  );
}
