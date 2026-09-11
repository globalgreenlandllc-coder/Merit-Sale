import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Hash } from '@/components/ui/Hash';
import { Notice } from '@/components/ui/Notice';
import { Checkbox } from '@/components/ui/Field';
import { Table, Td, Tr } from '@/components/ui/Table';
import { Stat } from '@/components/ui/Stat';
import { db } from '@/lib/db';
import { getOpenById } from '@/modules/meritopens/queries';
import { advancementPreview } from '@/modules/scoring/service';
import { setRoundStatusAction, unsealRoundAction, certifyRoundAction, releasePackageAction } from '@/modules/administrator/actions';
import { fmtDateTime, fmtDuration, roundLabel } from '@/lib/format';
export const dynamic = 'force-dynamic';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string; roundId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id, roundId } = await params; const sp = await searchParams;
  const o = await getOpenById(id);
  const r = o?.rounds.find((x) => x.id === roundId);
  if (!o || !r) notFound();
  const back = `/administrator/opens/${id}/rounds/${roundId}`;
  const counts = await db.attempt.groupBy({ by: ['status'], where: { roundId }, _count: { _all: true } });
  const n = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const preview = ['scoring', 'certified'].includes(r.status) ? await advancementPreview(roundId) : null;
  const windowClosed = r.windowEnd ? r.windowEnd.getTime() < Date.now() : r.scheduledAt ? r.scheduledAt.getTime() + r.durationSeconds * 1000 < Date.now() : false;
  return (<>
    <PageHead label={`${o.name} · ${roundLabel(r.number)}`} title={<>Round console <StatusBadge status={r.status} /></>} actions={<ButtonLink href={`/administrator/opens/${id}`} variant="ghost" size="sm">← Hub</ButtonLink>} />
    <ErrorBanner sp={sp} />
    {sp.scored && <Notice className="mt-5" tone="verify" title="Unsealed and scored">{sp.scored} attempts scored against the committed key; {sp.flags} integrity flags raised by screening.</Notice>}
    {sp.certified && <Notice className="mt-5" tone="verify" title="Certified">Certification {sp.certified} recorded and hashed. Registrants notified; dispute window open.</Notice>}

    <div className="mt-6 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-5">
      <Stat label="Window" value={<span className="text-[16px]">{r.windowStart ? `${fmtDateTime(r.windowStart)} → ${fmtDateTime(r.windowEnd)}` : fmtDateTime(r.scheduledAt)}</span>} hint={`${fmtDuration(r.durationSeconds)} · tier ${r.integrityTier}${windowClosed ? ' · closed' : ''}`} />
      <Stat label="Submitted" value={n('submitted')} /><Stat label="In progress" value={n('in_progress')} /><Stat label="Expired" value={n('expired')} /><Stat label="Voided" value={n('voided')} />
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <Card title="1 · Commitment"><dl className="text-[13px]"><dt className="plate">Primary package</dt><dd><Hash value={r.form?.packageHash} /></dd><dt className="plate mt-3">Published</dt><dd>{fmtDateTime(r.form?.hashPublishedAt)}</dd><dt className="plate mt-3">Reserve package</dt><dd><Hash value={r.reserveForm?.packageHash} /></dd></dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {r.status === 'scheduled' && <form action={setRoundStatusAction}><input type="hidden" name="roundId" value={roundId} /><input type="hidden" name="status" value="open" /><input type="hidden" name="back" value={back} /><Button size="sm" type="submit" disabled={!r.form?.hashPublishedAt}>Open round</Button></form>}
          {r.status === 'open' && <form action={setRoundStatusAction}><input type="hidden" name="roundId" value={roundId} /><input type="hidden" name="status" value="closed" /><input type="hidden" name="back" value={back} /><Button size="sm" variant="secondary" type="submit">Mark closed</Button></form>}
          <ButtonLink href={`/administrator/opens/${id}/readminister/${roundId}`} size="sm" variant="ghost">Technical failure / compromised form</ButtonLink>
        </div>
      </Card>
      <Card title="2 · Unseal and score"><p className="text-[13px] text-slate">Decrypts the committed package with the Administrator key, verifies it against the published hash, scores every submitted attempt, and runs integrity screening. Logged.</p>
        {!windowClosed && o.isPractice && <p className="mt-2 text-[12.5px] text-amber">Practice event: early unseal is permitted for manual scoring review (Phase 0) and is recorded as such.</p>}
        {!windowClosed && !o.isPractice && <p className="mt-2 text-[12.5px] text-clay">Blocked until the window closes (Rules 7.2).</p>}
        <form action={unsealRoundAction} className="mt-4"><input type="hidden" name="roundId" value={roundId} /><input type="hidden" name="back" value={back} /><Button size="sm" type="submit" disabled={!['open', 'closed'].includes(r.status) || (!windowClosed && !o.isPractice)}>Unseal and score</Button></form>
        {r.unsealedAt && <p className="mt-3 font-mono text-[11.5px] text-graphite">unsealed {fmtDateTime(r.unsealedAt)}</p>}
      </Card>
      <Card title="3 · Certify"><p className="text-[13px] text-slate">Writes the deterministic list below as a hashed certification and advances the state machine. Requires zero open integrity flags for this round.</p>
        {preview && r.status === 'scoring' && (
          <form action={certifyRoundAction} className="mt-4 space-y-3"><input type="hidden" name="roundId" value={roundId} /><input type="hidden" name="back" value={back} />
            <Checkbox name="attest" required label="This list was produced solely under Rules 5.1–5.5 and 8–9. I have no authority to alter it and have not." />
            <Button size="sm" type="submit" disabled={preview.held.length > 0}>{preview.held.length ? `${preview.held.length} held on open flags` : 'Certify'}</Button></form>
        )}
        {r.status === 'certified' && <div className="mt-4 space-y-2 text-[13px]"><Badge tone="verify">certified {fmtDateTime(r.scoresPostedAt)}</Badge><div>Dispute window until {fmtDateTime(r.disputeDeadlineAt)}</div>{r.form && !r.form.packageReleasedAt && <form action={releasePackageAction}><input type="hidden" name="formId" value={r.form.id} /><input type="hidden" name="back" value={back} /><Button size="sm" variant="secondary" type="submit">Release package</Button></form>}{r.form?.packageReleasedAt && <Badge tone="verify">package released</Badge>}</div>}
      </Card>
    </div>

    {preview && (
      <Card className="mt-6" title={preview.kind === 'r1' ? 'Pass list (exact match within the limit)' : preview.kind === 'final' ? 'Final standings — highest valid score' : `Advancement — capacity ${preview.capacity}${preview.result?.inclusionRuleApplied ? ` · inclusion rule applied (${preview.result.tiedAtCutoff} tied at rank ${preview.result.cutoffRank})` : ''}`}>
        {preview.final?.tied && <Notice tone="warn" className="mb-4" title="Exact tie">{preview.final.leaders.length} finalists share the highest valid score to full precision. Certification will open the next sealed tie-break problem (Rules 5.5). No coin flip, drawing, or preference is available.</Notice>}
        <Table dense head={['Rank', 'Registrant', 'State', 'Total', 'Tie-order', 'Elapsed', 'Decision', 'Reason']}>
          {preview.rows.map((x) => <Tr key={x.registrationId} className={x.advanced ? '' : 'text-graphite'}><Td mono>{x.rank ?? '—'}</Td><Td>{x.userLabel}<div className="font-mono text-[10.5px] text-graphite">{x.registrationId}</div></Td><Td mono>{x.state ?? '—'}</Td><Td mono>{x.totalPoints}</Td><Td mono>{x.tieOrderPoints}</Td><Td mono>{fmtDuration(x.elapsedSeconds)}</Td><Td>{x.advanced ? <Badge tone="verify">advance</Badge> : <Badge>no</Badge>}</Td><Td><span className="font-mono text-[11.5px]">{x.reason.replace(/_/g, ' ')}</span></Td></Tr>)}
        </Table>
        {preview.held.length > 0 && (<><h3 className="plate mt-8 text-clay">Held on open integrity flags — decide before certification</h3>
          <Table dense className="mt-3" head={['Registrant', 'Total', 'Tie-order', 'Elapsed', 'Flags']}>{preview.held.map((x) => <Tr key={x.registrationId}><Td>{x.userLabel}</Td><Td mono>{x.totalPoints}</Td><Td mono>{x.tieOrderPoints}</Td><Td mono>{fmtDuration(x.elapsedSeconds)}</Td><Td>{x.flagTypes.map((t) => <Badge key={t} tone="clay" className="mr-1">{t.replace(/_/g, ' ')}</Badge>)} <Link href={`/administrator/flags?round=${roundId}`} className="link-rule">decide</Link></Td></Tr>)}</Table></>)}
      </Card>
    )}
  </>);
}
