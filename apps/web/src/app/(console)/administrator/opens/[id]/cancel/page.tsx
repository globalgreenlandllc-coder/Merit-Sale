import { notFound } from 'next/navigation';
import { CANCELLATION_REASONS } from '@etk/rules-config';
import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { Checkbox, FieldRow, Select, Textarea } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { db } from '@/lib/db';
import { getOpenById } from '@/modules/meritopens/queries';
import { cancelMeritOpenAction } from '@/modules/administrator/actions';
import { money } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams;
  const o = await getOpenById(id);
  if (!o) notFound();
  const settled = await db.payment.aggregate({ where: { status: 'settled', registration: { meritOpenId: id } }, _count: { _all: true }, _sum: { amountCents: true, feeCents: true } });
  return (<>
    <PageHead label={o.name} title="Record cancellation" />
    <ErrorBanner sp={sp} />
    <Notice className="mt-5" tone="danger" title="Irreversible">Cancellation is permitted only for the events in Official Rules 12.4. It triggers full refunds ({settled._count._all} settled registrations, {money((settled._sum.amountCents ?? 0) + (settled._sum.feeCents ?? 0))} including processing fees), a public notice, and a mandatory notice to every registrant.</Notice>
    <Card className="mt-6"><form action={cancelMeritOpenAction} className="space-y-5"><input type="hidden" name="openId" value={id} />
      <FieldRow label="Reason code" htmlFor="reasonCode"><Select id="reasonCode" name="reasonCode">{CANCELLATION_REASONS.map((r) => <option key={r.code} value={r.code}>{r.code} — {r.description}</option>)}</Select></FieldRow>
      <FieldRow label="Factual basis (published)" htmlFor="note"><Textarea id="note" name="note" required minLength={20} /></FieldRow>
      <Checkbox name="attest" required label="I have verified the cancellation event and I am recording it as the Independent Administrator." />
      <Button type="submit" variant="danger">Cancel the Merit Open and refund everyone</Button>
    </form></Card>
  </>);
}
