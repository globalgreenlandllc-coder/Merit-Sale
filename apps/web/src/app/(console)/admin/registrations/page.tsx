import { PageHead, Card } from '@/components/console/ConsoleShell';
import { Table, Td, Tr } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { db } from '@/lib/db';
import { fmtDateTime, money, safeJson } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const rows = await db.registration.findMany({ include: { user: true, meritOpen: true, payment: true }, orderBy: { createdAt: 'desc' }, take: 300 });
  return (<>
    <PageHead label="Support tools" title="Registrations" />
    <p className="mt-4 max-w-3xl text-[13.5px] text-slate">Identity, eligibility snapshot, and payment state. Scores and answer keys are not visible in this realm by design.</p>
    <Card className="mt-6"><Table dense head={['Merit Open', 'Registrant', 'State', 'IDV', 'Payment', 'Status', 'Confirmed']}>
      {rows.map((r) => { const snap = safeJson<{ state?: string; geoState?: string }>(r.eligibilitySnapshotJson, {}); return <Tr key={r.id}><Td>{r.meritOpen.name}</Td><Td>{r.user.legalName ?? r.user.email}<div className="font-mono text-[11px] text-graphite">{r.id}</div></Td><Td mono>{snap.state ?? '—'}{snap.geoState && snap.geoState !== snap.state ? ` / geo ${snap.geoState}` : ''}</Td><Td><StatusBadge status={r.user.idvStatus} /></Td><Td>{r.payment ? <>{money(r.payment.amountCents)} <StatusBadge status={r.payment.status} /></> : '—'}</Td><Td><StatusBadge status={r.status} /></Td><Td>{fmtDateTime(r.confirmedAt)}</Td></Tr>; })}
    </Table></Card>
  </>);
}
