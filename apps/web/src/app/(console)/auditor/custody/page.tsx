import { PageHead, Card } from '@/components/console/ConsoleShell';
import { Table, Td, Tr } from '@/components/ui/Table';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Hash } from '@/components/ui/Hash';
import { db } from '@/lib/db';
import { checkSettlement, custodyLedger, custodyProfile, reconciliation, RELEASE_LABEL, releaseInstructions } from '@/lib/custody';
import { fmtDateTime, money } from '@/lib/format';
export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const openId = sp.open || undefined;
  const [opens, profile, settlement, ledger, rows, releases] = await Promise.all([
    db.meritOpen.findMany({ where: { isPractice: false, status: { not: 'draft' } }, select: { id: true, name: true }, orderBy: { createdAt: 'desc' } }),
    custodyProfile(), checkSettlement(), custodyLedger(), reconciliation({ openId }), releaseInstructions(openId),
  ]);
  const csv = `/api/custody/reconciliation${openId ? `?open=${openId}` : ''}`;
  return (<>
    <PageHead label="Custody" title="Reconciliation" actions={<a className="link-rule text-[13px]" href={csv}>Download CSV</a>} />
    <p className="mt-4 max-w-3xl text-[13.5px] text-slate">Every payment by reference, for matching against the custodian’s statement. Names never appear here; the registration ID is the join key for support.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      <Card title="Custodian"><p className="text-[14px]">{profile.vendor?.name ?? '—'}</p><p className="mt-1 text-[12.5px] text-graphite">{profile.complete ? 'Profile complete.' : `Pending: ${profile.missing.join(', ')}.`}</p></Card>
      <Card title="Settlement destination"><p className="text-[14px]"><Badge tone={settlement.ok ? 'verify' : settlement.configured ? 'amber' : 'neutral'}>{settlement.provider}</Badge> {settlement.destination ?? ''}</p><p className="mt-1 text-[12.5px] text-graphite">{settlement.detail}</p></Card>
      <Card title="Held in custody"><p className="font-display tabular text-[26px] leading-none">{money(ledger.reduce((a, r) => a + r.heldCents, 0))}</p><p className="mt-1 text-[12.5px] text-graphite">{ledger.reduce((a, r) => a + r.settledCount, 0).toLocaleString()} settled · {money(ledger.reduce((a, r) => a + r.refundedCents, 0))} refunded</p></Card>
    </div>
    <form className="mt-6 flex flex-wrap items-center gap-3 text-[13px]"><label htmlFor="open" className="plate">Merit Open</label><select id="open" name="open" defaultValue={openId ?? ''} className="field py-1.5 text-[13px]"><option value="">All</option>{opens.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select><button type="submit" className="link-rule">Filter</button></form>
    <Card className="mt-6" title={`Payments · ${rows.length.toLocaleString()}`}><Table dense head={['Created / settled', 'Merit Open', 'Registration', 'Processor ref', 'Custodian ref', 'Amount', 'Fee', 'Status', 'Refund']}>
      {rows.map((r) => <Tr key={r.paymentId}><Td>{fmtDateTime(r.settledAt)}</Td><Td>{r.meritOpen}</Td><Td mono>{r.registrationId}</Td><Td mono>{r.processorRef ?? '—'}</Td><Td mono>{r.custodianRef ?? '—'}</Td><Td mono>{money(r.amountCents)}</Td><Td mono>{money(r.feeCents)}</Td><Td><StatusBadge status={r.status} /></Td><Td mono>{r.refunds.length ? r.refunds.map((f) => `${money(f.amountCents)} ${f.status}`).join('; ') : '—'}</Td></Tr>)}
      {!rows.length && <Tr><Td className="text-graphite">No payments.</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td></Tr>}
    </Table></Card>
    <Card className="mt-6" title="Release instructions"><Table dense head={['Issued', 'Merit Open', 'Event', 'Amount', 'Payee', 'Reference', 'Hash', 'Audit seq']}>
      {releases.map((r) => <Tr key={r.seq}><Td>{fmtDateTime(r.timestamp)}</Td><Td>{r.meritOpen}</Td><Td><Badge tone="brass">{RELEASE_LABEL[r.event] ?? r.event}</Badge></Td><Td mono>{r.amountCents != null ? money(r.amountCents) : '—'}</Td><Td>{r.payee}</Td><Td mono>{r.reference ?? '—'}</Td><Td><Hash value={r.hash} short /></Td><Td mono>{r.seq}</Td></Tr>)}
      {!releases.length && <Tr><Td className="text-graphite">None issued.</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td></Tr>}
    </Table></Card>
  </>);
}
