import { notFound } from 'next/navigation';
import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { FieldRow, Input, Select } from '@/components/ui/Field';
import { Table, Td, Tr } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { getOpenById } from '@/modules/meritopens/queries';
import { saveRoundAction } from '@/modules/admin/actions';
import { fmtDateTime, roundLabel } from '@/lib/format';
export const dynamic = 'force-dynamic';
const dt = (v: Date | null | undefined) => (v ? new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams;
  const o = await getOpenById(id);
  if (!o) notFound();
  const editing = o.rounds.find((r) => r.id === sp.edit) ?? null;
  return (<>
    <PageHead label={o.name} title="Round schedule" />
    <ErrorBanner sp={sp} />
    <Card className="mt-6" title="Rounds">
      <Table head={['Round', 'Seq', 'Type', 'Window / time', 'Duration', 'Tier', 'Forms', 'Status', '']}>
        {o.rounds.map((r) => <Tr key={r.id}><Td>{roundLabel(r.number)}</Td><Td mono>{r.sequence}</Td><Td>{r.type}</Td><Td>{r.windowStart ? `${fmtDateTime(r.windowStart)} – ${fmtDateTime(r.windowEnd)}` : fmtDateTime(r.scheduledAt)}</Td><Td mono>{r.durationSeconds}s +{r.latencyGraceSeconds}s</Td><Td mono>{r.integrityTier}</Td><Td className="text-[12px]">{r.form ? `P ${r.form._count.items}` : 'P —'} / {r.reserveForm ? `R ${r.reserveForm._count.items}` : 'R —'}</Td><Td><StatusBadge status={r.status} /></Td><Td>{!o.lockedAt && <a className="link-rule" href={`?edit=${r.id}`}>edit</a>}</Td></Tr>)}
      </Table>
    </Card>
    {!o.lockedAt && (
      <Card className="mt-6" title={editing ? `Edit ${editing.number}` : 'Add round'}>
        <form action={saveRoundAction} className="grid gap-4 md:grid-cols-3">
          <input type="hidden" name="openId" value={id} /><input type="hidden" name="id" value={editing?.id ?? ''} />
          <FieldRow label="Number" htmlFor="number"><Select id="number" name="number" defaultValue={editing?.number ?? 'r1'}>{['r1', 'r2', 'r3', 'final', 'tiebreak_1', 'tiebreak_2', 'tiebreak_3'].map((n) => <option key={n} value={n}>{n}</option>)}</Select></FieldRow>
          <FieldRow label="Sequence" htmlFor="sequence"><Input id="sequence" name="sequence" type="number" defaultValue={editing?.sequence ?? o.rounds.length + 1} /></FieldRow>
          <FieldRow label="Type" htmlFor="type"><Select id="type" name="type" defaultValue={editing?.type ?? 'items'}>{['qualifier', 'items', 'proctored', 'optimization', 'tiebreak'].map((t) => <option key={t} value={t}>{t}</option>)}</Select></FieldRow>
          <FieldRow label="Window start (R1/R2)" htmlFor="windowStart"><Input id="windowStart" name="windowStart" type="datetime-local" defaultValue={dt(editing?.windowStart)} /></FieldRow>
          <FieldRow label="Window end" htmlFor="windowEnd"><Input id="windowEnd" name="windowEnd" type="datetime-local" defaultValue={dt(editing?.windowEnd)} /></FieldRow>
          <FieldRow label="Scheduled at (R3/Final)" htmlFor="scheduledAt"><Input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={dt(editing?.scheduledAt)} /></FieldRow>
          <FieldRow label="Duration (s)" htmlFor="durationSeconds"><Input id="durationSeconds" name="durationSeconds" type="number" defaultValue={editing?.durationSeconds ?? 600} /></FieldRow>
          <FieldRow label="Latency grace (s)" htmlFor="latencyGraceSeconds"><Input id="latencyGraceSeconds" name="latencyGraceSeconds" type="number" defaultValue={editing?.latencyGraceSeconds ?? 3} /></FieldRow>
          <FieldRow label="Integrity tier" htmlFor="integrityTier"><Select id="integrityTier" name="integrityTier" defaultValue={editing?.integrityTier ?? 1}><option value="1">1 · locked browser</option><option value="2">2 · live proctored</option><option value="3">3 · in person / full</option></Select></FieldRow>
          <FieldRow label="Primary form" htmlFor="formId"><Select id="formId" name="formId" defaultValue={editing?.formId ?? ''}><option value="">—</option>{o.forms.map((f) => <option key={f.id} value={f.id}>{f.roundNumber} · {f.label} · {f._count.items} items</option>)}</Select></FieldRow>
          <FieldRow label="Reserve form" htmlFor="reserveFormId"><Select id="reserveFormId" name="reserveFormId" defaultValue={editing?.reserveFormId ?? ''}><option value="">—</option>{o.forms.map((f) => <option key={f.id} value={f.id}>{f.roundNumber} · {f.label} · {f._count.items} items</option>)}</Select></FieldRow>
          <FieldRow label="Capacity override" htmlFor="capacity" hint="R2 uses N, R3 uses M."><Input id="capacity" name="capacity" type="number" defaultValue={editing?.capacity ?? ''} /></FieldRow>
          <div className="md:col-span-3"><Button type="submit">Save round</Button></div>
        </form>
      </Card>
    )}
  </>);
}
