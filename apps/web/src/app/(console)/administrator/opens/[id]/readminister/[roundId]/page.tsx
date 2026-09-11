import { notFound } from 'next/navigation';
import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { FieldRow, Input, Select, Textarea } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { Hash } from '@/components/ui/Hash';
import { db } from '@/lib/db';
import { getOpenById } from '@/modules/meritopens/queries';
import { rescheduleRoundAction } from '@/modules/administrator/actions';
import { roundLabel } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: { params: Promise<{ id: string; roundId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id, roundId } = await params; const sp = await searchParams;
  const o = await getOpenById(id); const r = o?.rounds.find((x) => x.id === roundId);
  if (!o || !r) notFound();
  const reports = await db.dispute.findMany({ where: { roundId, type: 'technical_failure' }, include: { registration: { include: { user: true } } } });
  return (<>
    <PageHead label={`${o.name} · ${roundLabel(r.number)}`} title="Technical failure / compromised form" />
    <ErrorBanner sp={sp} />
    <Notice className="mt-5" tone="warn" title="The only permitted remedy">A verified platform failure (Rules 8.8) or a materially compromised form (Rules 8.9) is remedied by re-administering the round to all affected registrants using the committed reserve form. No score is ever adjusted. All attempts on this round are voided, scores are discarded, and every registrant is notified with the reserve hash.</Notice>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Card title="Evidence"><p className="text-[13px] text-slate">Server logs (uptime, error rates) are provided by the platform under Exhibit E. Registrant reports for this round:</p>
        <ul className="mt-3 space-y-2 text-[13px]">{reports.map((d) => <li key={d.id} className="rounded-sm border hair p-3"><div className="text-graphite">{d.registration?.user.email} · {d.filedAt.toISOString()}</div><div>{d.statement}</div></li>)}{!reports.length && <li className="text-graphite">None filed.</li>}</ul>
        <dl className="mt-4 text-[13px]"><dt className="plate">Reserve form hash</dt><dd><Hash value={r.reserveForm?.packageHash} /></dd></dl>
      </Card>
      <Card title="Re-administer with reserve form"><form action={rescheduleRoundAction} className="space-y-4"><input type="hidden" name="roundId" value={roundId} /><input type="hidden" name="back" value={`/administrator/opens/${id}/rounds/${roundId}`} />
        <FieldRow label="Basis" htmlFor="reason"><Select id="reason" name="reason"><option value="technical_failure">Verified technical failure (8.8)</option><option value="compromised_form">Compromised form (8.9)</option></Select></FieldRow>
        <FieldRow label="Verified findings" htmlFor="note"><Textarea id="note" name="note" required minLength={20} /></FieldRow>
        <div className="grid grid-cols-2 gap-3"><FieldRow label="New window start" htmlFor="windowStart"><Input id="windowStart" name="windowStart" type="datetime-local" /></FieldRow><FieldRow label="New window end" htmlFor="windowEnd"><Input id="windowEnd" name="windowEnd" type="datetime-local" /></FieldRow></div>
        <Button type="submit" variant="danger" disabled={!r.reserveForm?.hashPublishedAt}>Void attempts and re-administer</Button>
      </form></Card>
    </div>
  </>);
}
