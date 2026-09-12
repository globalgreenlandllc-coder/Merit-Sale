import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeading, Plate } from '@/components/ui/Plate';
import { Ledger } from '@/components/ui/Ledger';
import { Hash } from '@/components/ui/Hash';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Table, Td, Tr } from '@/components/ui/Table';
import { Placeholder } from '@/components/ui/Placeholder';
import { ACCOUNT_TYPES, custodyLedger, custodyProfile, DEFAULT_RELEASE_EVENTS, RELEASE_LABEL, releaseInstructions } from '@/lib/custody';
import { fmtDay, fmtDateTime, money } from '@/lib/format';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Custody of fees' };

const flow = [
  { n: '01', who: 'You', what: 'Pay the registration fee by card on this site. There is no other way to pay: no wire, no transfer, no account number to send money to. Anyone asking you to pay differently is not us.' },
  { n: '02', who: 'The payment processor', what: 'Settles the fee directly to the Custodian. The processor is configured so the settlement destination is the custodian’s account, not the Sponsor’s.' },
  { n: '03', who: 'The Custodian', what: 'Holds every fee under a written custody agreement. The Sponsor has no unilateral access. Funds move only on the release events below, each recorded as a hashed instruction.' },
  { n: '04', who: 'You, again', what: 'Can check the position of every Merit Open on this page: how much settled, how much was refunded, how much is held, and every release instruction ever issued.' },
];

export default async function CustodyPage() {
  const [profile, ledger, releases, processor] = await Promise.all([custodyProfile(), custodyLedger(), releaseInstructions(), db.vendor.findFirst({ where: { kind: 'payments', active: true } })]);
  const { vendor, config } = profile;
  const events = config.releaseEvents.length ? config.releaseEvents : DEFAULT_RELEASE_EVENTS;
  return (
    <Container className="py-16">
      <SectionHeading index="§ 12" label="Custody of registration fees" title="Your money is not in our bank account." lede="Registration fees settle from the payment processor directly to a third-party custodian and are held under a written custody agreement. The platform holds no balance. This page shows who holds the money, on what terms, and what has happened to it." />

      <ol className="mt-12 grid gap-8 md:grid-cols-4">{flow.map((s) => <li key={s.n} className="border-t hair pt-5"><span className="plate">{s.n} · {s.who}</span><p className="mt-3 text-[14.5px] leading-relaxed text-slate">{s.what}</p></li>)}</ol>

      <div className="mt-16 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Plate index="§ 12.1">The custodian</Plate>
          <p className="mt-4 text-[15px] leading-relaxed text-slate">Named in the Official Rules and bound by a custody agreement whose summary is public. Account numbers are never published; the custodian’s own summary confirms the arrangement.</p>
          {!profile.complete && <p className="mt-4 text-[13px] leading-relaxed text-amber">Pending: {profile.missing.join(', ')}. Paid registration does not open until the custody arrangement is complete.</p>}
        </div>
        <Ledger rows={[
          { term: 'Custodian', detail: vendor && !vendor.name.startsWith('[') ? vendor.name : <Placeholder>[Custodian name]</Placeholder> },
          { term: 'Institution', detail: config.institution || <Placeholder>[Institution]</Placeholder> },
          { term: 'Account form', detail: config.accountType ? ACCOUNT_TYPES[config.accountType] : <Placeholder>[trust / FBO / escrow]</Placeholder> },
          { term: 'Custody agreement', detail: <>{config.agreementDate ? `Signed ${fmtDay(config.agreementDate)}` : <Placeholder>[date pending]</Placeholder>}{config.agreementHash && <> · <Hash value={config.agreementHash} short /></>}</> },
          { term: 'Settlement', detail: <>{processor && !processor.name.startsWith('[') ? processor.name : <Placeholder>[Payment processor]</Placeholder>} → custodian, {config.settlement === 'merchant_of_record' ? 'custodian as merchant of record' : 'settlement destination set to the custodian'}. The platform holds no balance.</> },
          { term: 'Public summary', detail: vendor?.publicSummaryUrl ? <a className="link-rule" href={vendor.publicSummaryUrl}>Custodian’s statement ↗</a> : <Placeholder>[link pending]</Placeholder> },
          { term: 'Release events', detail: <ul className="space-y-1.5">{events.map((e) => <li key={e}>{e}</li>)}</ul> },
        ]} />
      </div>

      <section className="mt-16">
        <Plate index="§ 12.2">Position by Merit Open</Plate>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-slate">Aggregates only. Settled means confirmed by the processor into custody; held is settled less refunds. Practice events carry no fee.</p>
        <Table className="mt-6" head={['Merit Open', 'Status', 'Settled', 'Amount', 'Refunded', 'Chargebacks', 'Held in custody']}>
          {ledger.map((r) => <Tr key={r.openId}><Td><Link href={`/opens/${r.slug}`} className="link-rule">{r.name}</Link></Td><Td><StatusBadge status={r.status} /></Td><Td mono>{r.settledCount.toLocaleString()}</Td><Td mono>{money(r.settledCents)}</Td><Td mono>{r.refundedCount ? `${r.refundedCount.toLocaleString()} · ${money(r.refundedCents)}` : '—'}</Td><Td mono>{r.chargebackCount || '—'}</Td><Td mono>{money(r.heldCents)}</Td></Tr>)}
          {!ledger.length && <Tr><Td className="text-graphite">No paid Merit Opens yet.</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td></Tr>}
        </Table>
      </section>

      <section className="mt-16">
        <Plate index="§ 12.3">Release instructions</Plate>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-slate">Every instruction to move money out of custody is an entry in the append-only audit log, hashed and chained. The custodian acts on the entry, not on a phone call.</p>
        <Table className="mt-6" head={['Issued', 'Merit Open', 'Event', 'Amount', 'Payee', 'Hash']}>
          {releases.map((r) => <Tr key={r.seq}><Td>{fmtDateTime(r.timestamp)}</Td><Td>{r.meritOpen}</Td><Td><Badge tone="brass">{RELEASE_LABEL[r.event] ?? r.event}</Badge></Td><Td mono>{r.amountCents != null ? money(r.amountCents) : '—'}</Td><Td>{r.payee}{r.reference ? <span className="text-graphite"> · {r.reference}</span> : null}</Td><Td><Hash value={r.hash} short /></Td></Tr>)}
          {!releases.length && <Tr><Td className="text-graphite">No release instructions have been issued.</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td></Tr>}
        </Table>
      </section>

      <p className="mt-12 text-[13px] leading-relaxed text-graphite">Refunds happen only if a Merit Open is cancelled (then in full, including processing fees) or a registration is verified ineligible (<Link href="/rules" className="link-rule">Rules 12.4</Link>). Initiating a chargeback other than for actual unauthorised use is grounds for disqualification (Rules 12.5).</p>
    </Container>
  );
}
