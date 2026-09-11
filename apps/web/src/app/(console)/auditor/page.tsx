import { PageHead, Card } from '@/components/console/ConsoleShell';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { Hash } from '@/components/ui/Hash';
import { Table, Td, Tr } from '@/components/ui/Table';
import { db } from '@/lib/db';
import { verifyAuditChain } from '@/lib/audit';
import { fmtDateTime } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [chain, events, certs, forms] = await Promise.all([
    verifyAuditChain(),
    db.auditEvent.findMany({ where: sp.q ? { OR: [{ action: { contains: sp.q } }, { objectId: { contains: sp.q } }, { objectType: { contains: sp.q } }] } : {}, orderBy: { seq: 'desc' }, take: 200 }),
    db.certification.findMany({ include: { meritOpen: { select: { name: true } } }, orderBy: { signedAt: 'desc' } }),
    db.form.findMany({ where: { hashPublishedAt: { not: null } }, include: { meritOpen: { select: { name: true } } } }),
  ]);
  return (<>
    <PageHead label="Read-only" title="Audit log and locked artifacts" />
    <div className="mt-6 grid gap-x-8 sm:grid-cols-3">
      <Stat label="Hash chain" value={chain.ok ? 'intact' : 'BROKEN'} hint={chain.ok ? `${chain.checked} entries verified` : `break at seq ${chain.brokenAtSeq}`} />
      <Stat label="Certifications" value={certs.length} /><Stat label="Sealed packages" value={forms.length} />
    </div>
    <Card className="mt-6" title="Locked artifacts">
      <Table dense head={['Merit Open', 'Form', 'Package hash', 'Committed', 'Released']}>{forms.map((f) => <Tr key={f.id}><Td>{f.meritOpen.name}</Td><Td mono>{f.roundNumber}/{f.label}</Td><Td><Hash value={f.packageHash} /></Td><Td>{fmtDateTime(f.hashPublishedAt)}</Td><Td>{f.packageReleasedAt ? fmtDateTime(f.packageReleasedAt) : '—'}</Td></Tr>)}</Table>
    </Card>
    <Card className="mt-6" title="Certifications"><Table dense head={['Merit Open', 'Type', 'Hash', 'Signed by', 'Signed']}>{certs.map((c) => <Tr key={c.id}><Td>{c.meritOpen.name}</Td><Td><Badge>{c.type.replace(/_/g, ' ')}</Badge></Td><Td><Hash value={c.hash} /></Td><Td mono>{c.signedById}</Td><Td>{fmtDateTime(c.signedAt)}</Td></Tr>)}</Table></Card>
    <Card className="mt-6" title="Events (append-only, newest first)">
      <form className="mb-4"><input name="q" defaultValue={sp.q ?? ''} placeholder="filter by action / object" className="field max-w-sm py-2 text-[13px]" /></form>
      <Table dense head={['Seq', 'Time', 'Actor', 'Action', 'Object', 'Entry hash']}>{events.map((e) => <Tr key={e.seq}><Td mono>{e.seq}</Td><Td>{fmtDateTime(e.timestamp)}</Td><Td mono>{e.actorRole}{e.actorId ? ` ${e.actorId.slice(-6)}` : ''}</Td><Td mono>{e.action}</Td><Td mono>{e.objectType} {e.objectId.slice(-8)}</Td><Td><Hash value={e.entryHash} short /></Td></Tr>)}</Table>
    </Card>
  </>);
}
