import { PageHead, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { Table, Td, Tr } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { db } from '@/lib/db';
import { retryRefundAction } from '@/modules/admin/actions';
import { fmtDateTime, money } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const rows = await db.refund.findMany({ include: { payment: { include: { registration: { include: { user: true, meritOpen: true } } } } }, orderBy: { createdAt: 'desc' } });
  return (<>
    <PageHead label="Payments" title="Refund queue" />
    <p className="mt-4 max-w-3xl text-[13.5px] text-slate">Refunds arise only from cancellation under Rules 12.4 (full amount incl. processing fees) or a verified ineligible registration. Failures queue here for manual follow-up.</p>
    <Card className="mt-6"><Table head={['Merit Open', 'Registrant', 'Amount', 'Reason', 'Status', 'Attempted', '']}>
      {rows.map((r) => <Tr key={r.id}><Td>{r.payment.registration.meritOpen.name}</Td><Td>{r.payment.registration.user.email}</Td><Td mono>{money(r.amountCents)}</Td><Td>{r.reason}</Td><Td><StatusBadge status={r.status} /></Td><Td>{fmtDateTime(r.attemptedAt)}</Td><Td>{r.status !== 'completed' && <form action={retryRefundAction}><input type="hidden" name="refundId" value={r.id} /><Button size="sm" variant="secondary" type="submit">Retry</Button></form>}</Td></Tr>)}
      {!rows.length && <Tr><Td className="text-graphite">Queue is empty.</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td></Tr>}
    </Table></Card>
  </>);
}
