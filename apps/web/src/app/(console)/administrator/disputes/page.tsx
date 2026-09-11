import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Field';
import { db } from '@/lib/db';
import { decideDisputeAction } from '@/modules/disputes/actions';
import { fmtDateTime, roundLabel } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const rows = await db.dispute.findMany({ include: { registration: { include: { user: true, meritOpen: true } }, round: true, item: { select: { position: true } } }, orderBy: [{ status: 'asc' }, { filedAt: 'desc' }], take: 200 });
  return (<>
    <PageHead label="Disputes" title="Score challenges, integrity reports, technical failures (Rules 11)" />
    <ErrorBanner sp={sp} />
    <div className="mt-6 space-y-4">
      {rows.map((d) => (
        <Card key={d.id}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><Badge>{d.type.replace(/_/g, ' ')}</Badge><StatusBadge status={d.status} />{d.round && <span className="text-[13px]">{roundLabel(d.round.number)}{d.item ? ` · item ${d.item.position}` : ''}</span>}{d.deadlineAt && <span className="text-[12px] text-graphite">window {fmtDateTime(d.deadlineAt)}</span>}</div><span className="font-mono text-[11.5px] text-graphite">{fmtDateTime(d.filedAt)}</span></div>
          <div className="mt-2 text-[13px] text-graphite">{d.registration ? `${d.registration.user.legalName ?? d.registration.user.email} · ${d.registration.meritOpen.name}` : `reporter ${d.reporterUserId ?? 'anonymous'}`}</div>
          <p className="mt-3 text-[14px] leading-relaxed">{d.statement}</p>
          {d.status === 'open' ? (
            <form action={decideDisputeAction} className="mt-3 space-y-2"><input type="hidden" name="disputeId" value={d.id} /><Textarea name="decision" required minLength={10} placeholder="Written decision applying the locked key, formulas, and Rules. No authority to alter any of them." /><Button type="submit" size="sm">Record decision</Button></form>
          ) : <p className="mt-3 rounded-sm bg-linen/60 p-3 text-[13.5px]">Decision {fmtDateTime(d.decidedAt)}: {d.decision}</p>}
        </Card>
      ))}
      {!rows.length && <p className="text-slate">No disputes.</p>}
    </div>
  </>);
}
