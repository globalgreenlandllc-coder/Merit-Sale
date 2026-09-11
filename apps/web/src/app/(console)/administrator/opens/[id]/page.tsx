import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Hash } from '@/components/ui/Hash';
import { Table, Td, Tr } from '@/components/ui/Table';
import { Notice } from '@/components/ui/Notice';
import { Input } from '@/components/ui/Field';
import { getOpenById } from '@/modules/meritopens/queries';
import { transitionOpenAction, releasePackageAction } from '@/modules/administrator/actions';
import { fmtDateTime, roundLabel } from '@/lib/format';
export const dynamic = 'force-dynamic';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams;
  const o = await getOpenById(id);
  if (!o) notFound();
  const back = `/administrator/opens/${id}`;
  const regClosed = !!o.registrationCloseAt && o.registrationCloseAt.getTime() < Date.now();
  return (<>
    <PageHead label="Ceremony hub" title={o.name} actions={<><ButtonLink href={`/opens/${o.slug}`} variant="ghost" size="sm">Public page →</ButtonLink><ButtonLink href={`/audit/${o.slug}`} variant="ghost" size="sm">Audit summary →</ButtonLink></>} />
    <ErrorBanner sp={sp} />
    {sp.locked && <Notice className="mt-5" tone="verify" title="Locked">Rules hash and all form hashes are published. Platform admins no longer have key access.</Notice>}
    {sp.winner && <Notice className="mt-5" tone="verify" title="Result certified">The Merit Open has moved to closing.</Notice>}
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card title="State machine">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={o.status} />{o.lockedAt ? <Badge tone="verify">locked {fmtDateTime(o.lockedAt)}</Badge> : <Badge tone="amber">not locked</Badge>}<Badge tone={o.property.titleStatus === 'owned' ? 'verify' : 'amber'}>title {o.property.titleStatus.replace(/_/g, ' ')}</Badge></div>
        <dl className="mt-4 text-[13.5px]"><dt className="plate">Rules hash</dt><dd><Hash value={o.rulesHash} /></dd></dl>
        <div className="mt-5 space-y-3">
          {!o.lockedAt && <ButtonLink href={`${back}/lock`} size="sm">Run lock ceremony</ButtonLink>}
          {o.status === 'reservation' && o.lockedAt && (
            <form action={transitionOpenAction} className="space-y-2"><input type="hidden" name="openId" value={id} /><input type="hidden" name="to" value="registration" /><input type="hidden" name="back" value={back} />
              {o.property.titleStatus !== 'owned' && <Input name="justification" placeholder="Counsel-approved override justification (contract + committed financing)…" />}
              <Button type="submit" size="sm">Open registration</Button></form>
          )}
          {o.status === 'registration' && <form action={transitionOpenAction}><input type="hidden" name="openId" value={id} /><input type="hidden" name="to" value="r1" /><input type="hidden" name="back" value={back} /><Button type="submit" size="sm" disabled={!regClosed}>{regClosed ? 'Close registration and open Round 1' : `Registration closes ${fmtDateTime(o.registrationCloseAt)} — cannot be shortened`}</Button></form>}
          {o.status === 'certification' && <ButtonLink href={`${back}/winner`} size="sm">Winner certification wizard</ButtonLink>}
          {o.status === 'closing' && <ButtonLink href={`${back}/winner`} size="sm" variant="secondary">Record closing</ButtonLink>}
          {!['complete', 'cancelled'].includes(o.status) && <ButtonLink href={`${back}/cancel`} size="sm" variant="danger">Record cancellation (Rules 12.4)</ButtonLink>}
        </div>
      </Card>
      <Card title="Certifications">
        <ul className="space-y-2 text-[13px]">{o.certifications.map((c) => <li key={c.id} className="flex flex-wrap items-center gap-2"><Badge>{c.type.replace(/_/g, ' ')}</Badge><Hash value={c.hash} short /><span className="text-graphite">{fmtDateTime(c.signedAt)}</span></li>)}{!o.certifications.length && <li className="text-graphite">None yet.</li>}</ul>
      </Card>
    </div>
    <Card className="mt-6" title="Rounds">
      <Table head={['Round', 'Window', 'Status', 'Primary hash', 'Reserve', 'Released', 'Console']}>
        {o.rounds.map((r) => (
          <Tr key={r.id}><Td>{roundLabel(r.number)}</Td><Td>{r.windowStart ? `${fmtDateTime(r.windowStart)} – ${fmtDateTime(r.windowEnd)}` : fmtDateTime(r.scheduledAt)}</Td><Td><StatusBadge status={r.status} /></Td><Td>{r.form ? <Hash value={r.form.packageHash} short /> : <span className="text-clay">none</span>}</Td><Td>{r.reserveForm ? <Hash value={r.reserveForm.packageHash} short /> : '—'}</Td><Td>{r.form?.packageReleasedAt ? <Badge tone="verify">released</Badge> : r.form?.hashPublishedAt ? <form action={releasePackageAction}><input type="hidden" name="formId" value={r.form.id} /><input type="hidden" name="back" value={back} /><Button size="sm" variant="secondary" type="submit">Release</Button></form> : '—'}</Td><Td><Link href={`${back}/rounds/${r.id}`} className="link-rule">open</Link></Td></Tr>
        ))}
      </Table>
    </Card>
  </>);
}
