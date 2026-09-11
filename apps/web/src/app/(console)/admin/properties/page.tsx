import Link from 'next/link';
import { PageHead } from '@/components/console/ConsoleShell';
import { ButtonLink } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Td, Tr } from '@/components/ui/Table';
import { db } from '@/lib/db';
import { fmtDate, money } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const rows = await db.property.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { meritOpens: true } } } });
  return (<>
    <PageHead label="Properties" title="Property pipeline" actions={<ButtonLink href="/admin/properties/new" size="sm">New property</ButtonLink>} />
    <Table className="mt-6" head={['Property', 'Address', 'Title', 'Deed recorded', 'Appraised', 'Opens']}>
      {rows.map((p) => <Tr key={p.id}><Td><Link href={`/admin/properties/${p.id}`} className="link-rule">{p.name}</Link></Td><Td>{p.address}, {p.city}, {p.state}</Td><Td><StatusBadge status={p.titleStatus} /></Td><Td>{fmtDate(p.deedRecordedAt)}</Td><Td mono>{money(p.appraisedValueCents)}</Td><Td mono>{p._count.meritOpens}</Td></Tr>)}
    </Table>
  </>);
}
