import Link from 'next/link';
import { PageHead } from '@/components/console/ConsoleShell';
import { ButtonLink } from '@/components/ui/Button';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Table, Td, Tr } from '@/components/ui/Table';
import { listOpens } from '@/modules/meritopens/queries';
import { fmtDateTime, money } from '@/lib/format';
import { getSession } from '@/lib/auth/session';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const [opens, s] = await Promise.all([listOpens({ includeDraft: true }), getSession()]);
  return (<>
    <PageHead label="Merit Opens" title="Configuration (pre-lock)" actions={s?.role === 'admin' ? <ButtonLink href="/admin/opens/new" size="sm">New Merit Open</ButtonLink> : null} />
    <Table className="mt-6" head={['Merit Open', 'Status', 'Fee', 'Closes', 'Locked', 'Forms']}>
      {opens.map((o) => <Tr key={o.id}><Td><Link href={`/admin/opens/${o.id}`} className="link-rule">{o.name}</Link>{o.isPractice && <Badge className="ml-2">practice</Badge>}</Td><Td><StatusBadge status={o.status} /></Td><Td mono>{money(o.registrationFeeCents)}</Td><Td>{fmtDateTime(o.registrationCloseAt)}</Td><Td>{o.lockedAt ? <Badge tone="verify">locked</Badge> : <Badge tone="amber">editable</Badge>}</Td><Td mono>{o.forms.length}</Td></Tr>)}
    </Table>
  </>);
}
