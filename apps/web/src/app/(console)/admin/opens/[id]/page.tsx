import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { OpenForm } from '@/components/console/OpenForm';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Hash } from '@/components/ui/Hash';
import { Table, Td, Tr } from '@/components/ui/Table';
import { db } from '@/lib/db';
import { getOpenById } from '@/modules/meritopens/queries';
import { adminTransitionAction, createFormAction } from '@/modules/admin/actions';
import { fmtDateTime, roundLabel } from '@/lib/format';
import { readiness } from '@/modules/meritopens/readiness';
import { Notice } from '@/components/ui/Notice';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams;
  const o = await getOpenById(id);
  if (!o) notFound();
  const properties = await db.property.findMany({ orderBy: { name: 'asc' } });
  const ready = await readiness(o);
  return (<>
    <PageHead label="Merit Open" title={o.name} actions={<><ButtonLink href={`/admin/opens/${id}/rules`} variant="secondary" size="sm">Ruleset</ButtonLink><ButtonLink href={`/admin/opens/${id}/rounds`} variant="secondary" size="sm">Rounds</ButtonLink><ButtonLink href={`/opens/${o.slug}`} variant="ghost" size="sm">Public page →</ButtonLink></>} />
    <ErrorBanner sp={sp} />
    {sp.created && <Notice className="mt-5" tone="verify" title="Listing created">Property, Merit Open, rounds, forms, and a draft ruleset are in place. Work down the readiness list, then the Administrator locks.</Notice>}
    <Card className="mt-6" title={`Readiness · ${ready.ok} of ${ready.total}${ready.locked ? ' · locked' : ''}`}>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-linen"><div className="h-full bg-verify" style={{ width: `${Math.round((ready.ok / Math.max(1, ready.total)) * 100)}%` }} /></div>
      <ul className="grid gap-x-8 gap-y-1.5 md:grid-cols-2">
        {ready.items.map((it) => <li key={it.key} className="flex items-start gap-2 text-[13.5px]"><span className={`mt-1 size-2.5 shrink-0 rounded-full ${it.ok ? 'bg-verify' : 'bg-amber'}`} aria-hidden /><span className="min-w-0"><Link href={it.href} className={`link-rule ${it.ok ? 'text-ink' : 'text-ink'}`}>{it.label}</Link><span className="ml-2 plate">{it.owner}</span><span className="block text-[12.5px] text-graphite">{it.detail}</span></span></li>)}
      </ul>
    </Card>
    <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card title="Configuration"><OpenForm o={o} properties={properties} /></Card>
      <div className="space-y-6">
        <Card title="State"><div className="flex items-center gap-2"><StatusBadge status={o.status} />{o.lockedAt && <Badge tone="verify">locked</Badge>}</div>
          <dl className="mt-4 space-y-2 text-[13.5px]"><div><dt className="plate">Rules hash</dt><dd><Hash value={o.rulesHash} short /></dd></div><div><dt className="plate">Property title</dt><dd><StatusBadge status={o.property.titleStatus} /></dd></div><div><dt className="plate">Locked</dt><dd>{fmtDateTime(o.lockedAt)}</dd></div></dl>
          {o.status === 'draft' && <form action={adminTransitionAction} className="mt-4"><input type="hidden" name="openId" value={id} /><Button type="submit" size="sm">Open reservation list</Button></form>}
          <p className="mt-4 text-[12.5px] text-graphite">Every later transition (lock, registration, rounds, certification, cancellation) belongs to the Independent Administrator.</p>
        </Card>
        <Card title="Forms (sealed workspace)">
          <ul className="space-y-2 text-[13.5px]">{o.forms.map((f) => <li key={f.id} className="flex items-center justify-between gap-2"><Link href={`/admin/opens/${id}/forms/${f.id}`} className="link-rule">{f.roundNumber} · {f.label} · {f._count.items} items</Link>{f.hashPublishedAt ? <Badge tone="verify">sealed</Badge> : <Badge tone="amber">draft</Badge>}</li>)}</ul>
          {!o.lockedAt && <form action={createFormAction} className="mt-4 flex flex-wrap gap-2"><input type="hidden" name="openId" value={id} /><select name="roundNumber" className="field w-auto py-1.5 text-[13px]">{['r1', 'r2', 'r3', 'final', 'tiebreak_1', 'tiebreak_2'].map((r) => <option key={r} value={r}>{r}</option>)}</select><select name="label" className="field w-auto py-1.5 text-[13px]"><option value="primary">primary</option><option value="reserve">reserve</option><option value="tiebreak">tiebreak</option></select><Button type="submit" size="sm" variant="secondary">Add form</Button></form>}
        </Card>
      </div>
    </div>
    <Card className="mt-6" title="Rounds">
      <Table head={['Round', 'When', 'Duration', 'Tier', 'Primary form', 'Reserve form', 'Status']}>
        {o.rounds.map((r) => <Tr key={r.id}><Td>{roundLabel(r.number)}</Td><Td>{r.windowStart ? `${fmtDateTime(r.windowStart)} – ${fmtDateTime(r.windowEnd)}` : fmtDateTime(r.scheduledAt)}</Td><Td mono>{r.durationSeconds}s</Td><Td mono>{r.integrityTier}</Td><Td>{r.form ? <Hash value={r.form.packageHash} short /> : <span className="text-clay">none</span>}</Td><Td>{r.reserveForm ? <Hash value={r.reserveForm.packageHash} short /> : <span className="text-graphite">none</span>}</Td><Td><StatusBadge status={r.status} /></Td></Tr>)}
      </Table>
    </Card>
  </>);
}
