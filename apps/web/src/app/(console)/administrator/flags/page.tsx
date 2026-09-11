import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Field';
import { db } from '@/lib/db';
import { decideFlagAction } from '@/modules/integrity/actions';
import { fmtDateTime, roundLabel } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const flags = await db.integrityFlag.findMany({ where: sp.round ? { attempt: { roundId: sp.round } } : {}, include: { attempt: { include: { round: { include: { meritOpen: true } }, registration: { include: { user: true } } } } }, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 200 });
  return (<>
    <PageHead label="Integrity" title="Flag queue (Rules 8.4)" />
    <ErrorBanner sp={sp} />
    <p className="mt-4 max-w-3xl text-[13.5px] text-slate">Screening produces evidence; only this realm decides. Uphold → attempt voided, registration disqualified, advancement recomputed. Clear → the registrant proceeds. Every decision is logged.</p>
    <div className="mt-6 space-y-4">
      {flags.map((f) => (
        <Card key={f.id}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><Badge tone="clay">{f.type.replace(/_/g, ' ')}</Badge><StatusBadge status={f.status} /><span className="text-[13px]">{f.attempt.round.meritOpen.name} · {roundLabel(f.attempt.round.number)}</span></div><span className="font-mono text-[11.5px] text-graphite">{fmtDateTime(f.createdAt)}</span></div>
          <div className="mt-3 text-[13.5px]">{f.attempt.registration.user.legalName ?? f.attempt.registration.user.email} <span className="font-mono text-[11px] text-graphite">reg {f.attempt.registrationId} · attempt {f.attemptId}</span></div>
          <pre className="mt-3 max-h-48 overflow-auto rounded-sm bg-ink p-3 font-mono text-[11.5px] leading-5 text-parchment">{JSON.stringify(JSON.parse(f.evidenceJson), null, 2)}</pre>
          {f.status === 'open' ? (
            <form action={decideFlagAction} className="mt-3 flex flex-wrap items-center gap-2"><input type="hidden" name="flagId" value={f.id} /><input type="hidden" name="back" value={`/administrator/flags${sp.round ? `?round=${sp.round}` : ''}`} />
              <Input name="note" placeholder="Decision note (published in aggregate)" className="max-w-md" />
              <Button type="submit" name="decision" value="cleared" size="sm" variant="secondary">Clear</Button><Button type="submit" name="decision" value="upheld" size="sm" variant="danger">Uphold → disqualify</Button></form>
          ) : <p className="mt-3 text-[13px] text-slate">Decided {fmtDateTime(f.decidedAt)}{f.decisionNote ? ` — ${f.decisionNote}` : ''}</p>}
        </Card>
      ))}
      {!flags.length && <p className="text-slate">No flags.</p>}
    </div>
  </>);
}
