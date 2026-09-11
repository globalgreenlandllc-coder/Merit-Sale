import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Plate } from '@/components/ui/Plate';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox, FieldRow, Input, Select } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { Ledger } from '@/components/ui/Ledger';
import { Badge } from '@/components/ui/Badge';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { US_STATES } from '@/lib/states';
import { fmtDateTime, money } from '@/lib/format';
import { eligibleStates, getOpenBySlug, latestRuleset } from '@/modules/meritopens/queries';
import { registrationWindow } from '@/modules/registrations/service';
import { acceptRules, beginRegistration, completeIdentity, startPayment } from '@/modules/registrations/actions';

export const dynamic = 'force-dynamic';

const STEPS = ['eligibility', 'identity', 'accept', 'payment', 'confirmed'] as const;

export default async function RegisterPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params; const sp = await searchParams;
  const open = await getOpenBySlug(slug);
  if (!open) notFound();
  const s = await getSession();
  if (!s) return <Container className="max-w-2xl py-16"><Plate>Register</Plate><h1 className="font-display mt-4 text-[40px]">Sign in first.</h1><p className="mt-4 text-slate">One account, one person, one registration.</p><ButtonLink className="mt-6" href={`/sign-in?next=/opens/${slug}/register`} size="lg">Sign in</ButtonLink></Container>;
  const user = await db.user.findUniqueOrThrow({ where: { id: s.userId } });
  const reg = await db.registration.findUnique({ where: { userId_meritOpenId: { userId: user.id, meritOpenId: open.id } }, include: { payment: true } });
  const hasReservation = !!(await db.reservation.findUnique({ where: { userId_meritOpenId: { userId: user.id, meritOpenId: open.id } } }));
  const win = registrationWindow(open, hasReservation);
  const rs = latestRuleset(open);
  const states = eligibleStates(open);

  let step: (typeof STEPS)[number] = (sp.step as (typeof STEPS)[number]) ?? 'eligibility';
  if (reg?.status === 'confirmed') step = 'confirmed';
  else if (!reg) step = 'eligibility';
  else if (step === 'payment' && !reg.acceptedAt) step = 'accept';
  else if ((step === 'accept' || step === 'payment') && user.idvLevel !== 'full') step = 'identity';
  const idx = STEPS.indexOf(step);

  return (
    <Container className="grid gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Plate>Register · {open.name}</Plate>
        <h1 className="font-display mt-4 text-[36px] leading-tight">One registration. {open.registrationFeeCents ? money(open.registrationFeeCents) : 'Free'}.</h1>
        <ol className="mt-8 border-t hair">
          {STEPS.map((st, i) => (
            <li key={st} className={`flex items-center gap-3 border-b hair py-3 ${i === idx ? 'text-ink' : i < idx ? 'text-verify' : 'text-graphite'}`}><span className="plate w-6">{i < idx ? '✓' : `0${i + 1}`}</span><span className="text-[14px] capitalize">{st}</span></li>
          ))}
        </ol>
        <Ledger className="mt-8" rows={[
          { term: 'Fee', detail: `${money(open.registrationFeeCents)} — fixed. No tiers, bundles, credits, or upgrades (Rules 3.3).` },
          { term: 'Goes to', detail: 'The Custodian, not the Sponsor (Rules 3.4, 12.1).' },
          { term: 'Refundable', detail: 'Only if the Merit Open is cancelled under Rules 12.4 — then in full, including processing fees.' },
          { term: 'Closes', detail: fmtDateTime(open.registrationCloseAt) },
        ]} />
      </aside>

      <div>
        {sp.blocked && <Notice tone="warn" title="Registration is not open for you right now">{sp.blocked}</Notice>}
        {step === 'eligibility' && (
          <section>
            <h2 className="font-display text-[28px]">Before we take a cent.</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-slate">We check age, residence, location, exclusions, sanctions, and that you hold no other registration. Every reason is a hard block. If any fails, please don’t try another way — we’d have to refund and remove you.</p>
            {sp.reasons && <Notice className="mt-6" tone="danger" title="Not eligible"><ul className="list-disc pl-5">{sp.reasons.split('|').map((r) => <li key={r}>{r}</li>)}</ul></Notice>}
            {!win.open && <Notice className="mt-6" tone="warn">{win.reason}</Notice>}
            {win.firstAccess && <Notice className="mt-6" tone="verify">First-access window: you hold a reservation.</Notice>}
            <Ledger className="mt-6" rows={[
              { term: 'Age', detail: user.dob ? '18+ check runs on your date of birth' : <>Missing — <Link className="link-rule" href={`/account/profile?next=/opens/${slug}/register`}>add your date of birth</Link></> },
              { term: 'Residence', detail: user.residenceState ? `${user.residenceState} · eligible states: ${states.join(', ')}` : <>Missing — <Link className="link-rule" href={`/account/profile?next=/opens/${slug}/register`}>add your state</Link></> },
              { term: 'Location', detail: 'Checked against your connection; VPNs and proxies are blocked.' },
              { term: 'Exclusions', detail: 'Employees, contractors, vendors, family, and the seller are excluded (Rules 2.2). Prior winners are excluded.' },
            ]} />
            <form action={beginRegistration} className="mt-8"><input type="hidden" name="openSlug" value={slug} /><Button type="submit" size="lg" disabled={!win.open}>Run the eligibility check</Button></form>
          </section>
        )}

        {step === 'identity' && (
          <section>
            <h2 className="font-display text-[28px]">Verify your identity.</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-slate">Government ID plus a selfie, handled by our verification vendor. We store only the vendor’s reference and result — never your images.</p>
            {sp.error && <Notice className="mt-6" tone="danger">{sp.error === 'incomplete' ? 'All fields and the consent are required.' : `Verification ${sp.error}. Contact support.`}</Notice>}
            <form action={completeIdentity} className="mt-8 space-y-5">
              <input type="hidden" name="openSlug" value={slug} />
              <FieldRow label="Legal name" htmlFor="legalName" hint="Exactly as on your ID."><Input id="legalName" name="legalName" required defaultValue={user.legalName ?? ''} /></FieldRow>
              <div className="grid gap-5 sm:grid-cols-2">
                <FieldRow label="Date of birth" htmlFor="dob"><Input id="dob" name="dob" type="date" required defaultValue={user.dob ? user.dob.toISOString().slice(0, 10) : ''} /></FieldRow>
                <FieldRow label="Phone" htmlFor="phone"><Input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ''} /></FieldRow>
              </div>
              <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
                <FieldRow label="State" htmlFor="residenceState"><Select id="residenceState" name="residenceState" required defaultValue={user.residenceState ?? ''}><option value="">—</option>{US_STATES.map(([c, n]) => <option key={c} value={c}>{c} · {n}</option>)}</Select></FieldRow>
                <FieldRow label="Residence address" htmlFor="residenceAddress"><Input id="residenceAddress" name="residenceAddress" required defaultValue={user.residenceAddress ?? ''} /></FieldRow>
              </div>
              <div className="rounded-sm border hair bg-parchment/60 p-4">
                <div className="plate">Document + selfie</div>
                <p className="mt-2 text-[13.5px] text-slate">The vendor capture step opens here. Provider: <Badge>{process.env.IDV_PROVIDER ?? 'mock'}</Badge></p>
              </div>
              <Checkbox name="biometricConsent" required label="I consent to biometric identity verification by the vendor named in the Privacy Policy, and I understand the platform stores only the vendor reference and result." />
              <Button type="submit" size="lg">Verify</Button>
            </form>
          </section>
        )}

        {step === 'accept' && (
          <section>
            <h2 className="font-display text-[28px]">Read. Then agree.</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-slate">Your acceptance is recorded with a timestamp and the hash of the exact rules version you accepted.</p>
            {sp.error && <Notice className="mt-6" tone="danger">Every box is required.</Notice>}
            <Ledger className="mt-6" rows={[
              { term: 'Official Rules', detail: <><Link className="link-rule" href={`/opens/${slug}/rules`}>Version {rs?.version ?? '—'}</Link> · hash <span className="font-mono text-[12px]">{open.rulesHash?.slice(0, 20) ?? 'not locked'}…</span></> },
              { term: 'Terms of Service', detail: <Link className="link-rule" href="/terms">Version {rs?.termsVersion ?? '—'}</Link> },
              { term: 'Privacy Policy', detail: <Link className="link-rule" href="/privacy">Current version</Link> },
            ]} />
            <form action={acceptRules} className="mt-8 space-y-4">
              <input type="hidden" name="openSlug" value={slug} />
              <Checkbox name="acceptRules" required label="I have read and accept the Official Rules, including the advancement, tie-handling, and no-refund provisions." />
              <Checkbox name="acceptTerms" required label="I accept the Platform Terms of Service, including binding individual arbitration and the class-action waiver to the extent enforceable." />
              <Checkbox name="acceptPrivacy" required label="I accept the Privacy Policy." />
              <Checkbox name="consentProctoring" required label="I consent to the technical controls in Rules 8.3: locked browser, focus-loss logging, device and session logging, and live proctoring with webcam, screen recording, room scan, and ID match in later rounds." />
              <Checkbox name="oneRegistration" required label="I hold no other account or registration for this Merit Open and I am not an excluded person under Rules 2.2." />
              <Button type="submit" size="lg">Record my acceptance</Button>
            </form>
          </section>
        )}

        {step === 'payment' && (
          <section>
            <h2 className="font-display text-[28px]">Pay the registration fee.</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-slate">{money(open.registrationFeeCents)}, settled by the processor directly to the Custodian. The Sponsor has no unilateral access to it.</p>
            {sp.error === 'cancelled' && <Notice className="mt-6" tone="warn">Checkout was cancelled. Nothing was charged.</Notice>}
            <form action={startPayment} className="mt-8"><input type="hidden" name="openSlug" value={slug} /><Button type="submit" size="lg">{open.registrationFeeCents ? `Pay ${money(open.registrationFeeCents)}` : 'Confirm free registration'}</Button></form>
            <p className="mt-4 text-[12.5px] text-graphite">Processor: {process.env.PAYMENTS_PROVIDER ?? 'mock'}. Initiating a chargeback other than for actual unauthorized use results in disqualification (Rules 12.5).</p>
          </section>
        )}

        {step === 'confirmed' && reg && (
          <section>
            <Badge tone="verify">Confirmed</Badge>
            <h2 className="font-display mt-3 text-[32px]">Your seat at the test is confirmed.</h2>
            <Ledger className="mt-6" rows={[
              { term: 'Registration ID', detail: <span className="font-mono text-[13px]">{reg.id}</span> },
              { term: 'Confirmed', detail: fmtDateTime(reg.confirmedAt) },
              { term: 'Fee', detail: reg.payment ? <>{money(reg.payment.amountCents)} · {reg.payment.status} · custodian ref <span className="font-mono text-[12px]">{reg.payment.custodianSettlementRef ?? 'pending'}</span></> : '—' },
              { term: 'Rules accepted', detail: <span className="font-mono text-[12px]">{reg.acceptedRulesHash}</span> },
            ]} />
            <p className="mt-6 text-[15px] text-slate">A receipt with the round schedule and technical requirements is in your account notices.</p>
            <ButtonLink className="mt-6" href="/account" size="lg">Go to your account</ButtonLink>
          </section>
        )}
      </div>
    </Container>
  );
}
