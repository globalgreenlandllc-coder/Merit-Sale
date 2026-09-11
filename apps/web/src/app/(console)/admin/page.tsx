import Link from 'next/link';
import { PageHead, Card } from '@/components/console/ConsoleShell';
import { Stat } from '@/components/ui/Stat';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Td, Tr } from '@/components/ui/Table';
import { db } from '@/lib/db';
import { listOpens, openCounts } from '@/modules/meritopens/queries';
import { readiness } from '@/modules/meritopens/readiness';
import { ButtonLink } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const opens = await listOpens({ includeDraft: true });
  const rows = await Promise.all(opens.map(async (o) => {
    const c = await openCounts(o.id);
    const r1 = o.rounds.find((r) => r.number === 'r1'); const r2 = o.rounds.find((r) => r.number === 'r2');
    const [r1Attempts, r2Attempts] = await Promise.all([r1 ? db.attempt.count({ where: { roundId: r1.id, status: { not: 'in_progress' } } }) : 0, r2 ? db.attempt.count({ where: { roundId: r2.id, status: { not: 'in_progress' } } }) : 0]);
    const ready = await readiness(o);
    return { o, c, r1Attempts, r2Attempts, ready };
  }));
  const [refunds, flagsOpen, events] = await Promise.all([db.refund.count({ where: { status: { in: ['queued', 'failed', 'manual'] } } }), db.integrityFlag.count({ where: { status: 'open' } }), db.auditEvent.count()]);
  return (
    <>
      <PageHead label="Platform admin" title="Dashboard" actions={<ButtonLink href="/admin/listings/new" size="sm">New listing</ButtonLink>} />
      <div className="mt-6 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Merit Opens" value={opens.length} hint={`${opens.filter((o) => !['complete', 'cancelled', 'draft'].includes(o.status)).length} live`} />
        <Stat label="Confirmed registrations" value={rows.reduce((n, r) => n + r.c.registrations, 0).toLocaleString()} />
        <Stat label="Refund queue" value={refunds} hint={<Link href="/admin/refunds" className="link-rule">open queue</Link>} />
        <Stat label="Audit events" value={events.toLocaleString()} hint={`${flagsOpen} integrity flags awaiting the Administrator`} />
      </div>
      <Card className="mt-8" title="Funnel per Merit Open · reservation → registration → R1 → R2 (no score access in this realm)">
        <Table head={['Merit Open', 'Status', 'Ready', 'Reservations', 'Registrations', 'By state', 'R1 attempts', 'R2 attempts']}>
          {rows.map(({ o, c, r1Attempts, r2Attempts, ready }) => (
            <Tr key={o.id}><Td><Link href={`/admin/opens/${o.id}`} className="link-rule">{o.name}</Link></Td><Td><StatusBadge status={o.status} /></Td><Td mono>{ready.ok}/{ready.total}</Td><Td mono>{c.reservations}</Td><Td mono>{c.registrations}</Td><Td className="text-[12.5px]">{Object.entries(c.byState).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}</Td><Td mono>{r1Attempts}</Td><Td mono>{r2Attempts}</Td></Tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
