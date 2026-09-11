import Link from 'next/link';
import { PageHead, Card } from '@/components/console/ConsoleShell';
import { Stat } from '@/components/ui/Stat';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Table, Td, Tr } from '@/components/ui/Table';
import { db } from '@/lib/db';
import { listOpens } from '@/modules/meritopens/queries';
import { fmtDateTime } from '@/lib/format';
export const dynamic = 'force-dynamic';

function nextAction(o: Awaited<ReturnType<typeof listOpens>>[number]) {
  if (!o.lockedAt && ['draft', 'reservation'].includes(o.status)) return 'Lock ceremony';
  if (o.status === 'reservation' && o.lockedAt) return 'Open registration (title check)';
  if (o.status === 'registration') return o.registrationCloseAt && o.registrationCloseAt.getTime() < Date.now() ? 'Close registration → R1' : 'Waiting for close';
  if (['r1', 'r2', 'r3', 'final', 'tiebreak'].includes(o.status)) { const r = o.rounds.find((x) => x.number === o.status) ?? o.rounds.find((x) => x.status === 'open'); return r ? `${r.number}: ${r.status === 'certified' ? 'advance' : r.status === 'scoring' ? 'certify' : r.status === 'closed' ? 'unseal' : r.status === 'open' ? 'in window' : 'open round'}` : '—'; }
  if (o.status === 'certification') return 'Winner wizard';
  if (o.status === 'closing') return 'Record deed → complete';
  if (o.status === 'complete') return 'Release remaining packages';
  return '—';
}

export default async function Page() {
  const [opens, flags, disputes, accommodations] = await Promise.all([listOpens({ includeDraft: true }), db.integrityFlag.count({ where: { status: 'open' } }), db.dispute.count({ where: { status: 'open' } }), db.accommodation.count({ where: { status: 'requested' } })]);
  return (<>
    <PageHead label="Independent Administrator" title="Queue" />
    <div className="mt-6 grid gap-x-8 sm:grid-cols-3">
      <Stat label="Open integrity flags" value={flags} hint={<Link href="/administrator/flags" className="link-rule">decide</Link>} />
      <Stat label="Open disputes" value={disputes} hint={<Link href="/administrator/disputes" className="link-rule">decide</Link>} />
      <Stat label="Accommodation requests" value={accommodations} hint={<Link href="/administrator/accommodations" className="link-rule">review</Link>} />
    </div>
    <Card className="mt-8" title="Merit Opens">
      <Table head={['Merit Open', 'Status', 'Locked', 'Registration closes', 'Next action']}>
        {opens.map((o) => <Tr key={o.id}><Td><Link href={`/administrator/opens/${o.id}`} className="link-rule">{o.name}</Link>{o.isPractice && <Badge className="ml-2">practice</Badge>}</Td><Td><StatusBadge status={o.status} /></Td><Td>{o.lockedAt ? <Badge tone="verify">locked</Badge> : <Badge tone="amber">unlocked</Badge>}</Td><Td>{fmtDateTime(o.registrationCloseAt)}</Td><Td>{nextAction(o)}</Td></Tr>)}
      </Table>
    </Card>
    <p className="mt-6 max-w-3xl text-[13px] text-graphite">This realm locks rules and keys, publishes hashes, unseals per round, certifies advancement and the result, decides flags and disputes, records cancellations, and releases packages. It cannot create Merit Opens, edit items, or touch payments.</p>
  </>);
}
