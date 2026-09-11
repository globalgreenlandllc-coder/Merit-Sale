import { notFound } from 'next/navigation';
import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { Checkbox, FieldRow, Input, Select, Textarea } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Hash } from '@/components/ui/Hash';
import { db } from '@/lib/db';
import { saveItemAction, deleteItemAction } from '@/modules/admin/actions';
import { INPUT_TYPES } from '@etk/scoring';
export const dynamic = 'force-dynamic';

const EXAMPLES: Record<string, string> = {
  integer: '{"kind":"numeric","answer":85,"points":1}',
  decimal: '{"kind":"numeric","answer":3.75,"points":1}',
  string_exact: '{"kind":"exact","answer":"Lars","points":1}',
  ordering: '{"kind":"ordering","answer":["West","East","North","South"],"points":1}',
  assignment: '{"kind":"assignment","answer":{"A":"2","B":"1","C":"3"},"points":1}',
  allocation: '{"kind":"optimization","variables":["x1","x2","x3","x4"],"constraints":[{"expr":{"x1":1,"x2":1,"x3":1,"x4":1},"op":"<=","rhs":100000,"label":"budget"}],"objective":{"expr":{"x1":1.8,"x2":1.2,"x3":1.5,"x4":1.1},"sense":"max"}}',
};

export default async function Page({ params, searchParams }: { params: Promise<{ id: string; formId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id, formId } = await params; const sp = await searchParams;
  const form = await db.form.findUnique({ where: { id: formId }, include: { items: { orderBy: { position: 'asc' } }, meritOpen: true } });
  if (!form || form.meritOpenId !== id) notFound();
  const sealed = !!form.hashPublishedAt;
  const editing = form.items.find((i) => i.id === sp.edit) ?? null;
  return (<>
    <PageHead label={`${form.meritOpen.name} · ${form.roundNumber} · ${form.label}`} title="Items" actions={sealed ? <Badge tone="verify">sealed · <Hash value={form.packageHash} short /></Badge> : <Badge tone="amber">authoring workspace</Badge>} />
    <ErrorBanner sp={sp} />
    <p className="mt-4 max-w-3xl text-[13.5px] text-slate">Free-response only: the input types are {INPUT_TYPES.join(', ')}. There is no select-from-list type in the schema. Each item is validated on save: exactly one key or a deterministic formula, no trivial default, prompt not phrased as a choice. After lock the keys below disappear from this realm.</p>
    <Card className="mt-6" title={`${form.items.length} items`}>
      <ol className="divide-y hair">
        {form.items.map((it) => (
          <li key={it.id} className="grid gap-3 py-4 md:grid-cols-[3rem_1fr_auto]">
            <div className="font-mono text-[13px] text-graphite">#{it.position}{it.tieOrderFlag && <span className="ml-1 text-brass" title="tie-order subset">†</span>}</div>
            <div><p className="text-[14.5px] leading-relaxed">{it.prompt}</p><div className="mt-2 flex flex-wrap gap-2 text-[12px]"><Badge>{it.inputType}</Badge><Badge>{it.maxPoints} pts</Badge>{it.calculatorPermitted && <Badge>calculator</Badge>}{!sealed && it.scoringSpecJson && <code className="rounded-xs bg-linen px-1.5 py-0.5 font-mono text-[11.5px] text-ink-3">{it.scoringSpecJson.slice(0, 120)}{it.scoringSpecJson.length > 120 ? '…' : ''}</code>}{sealed && <span className="font-mono text-[11.5px] text-graphite">key sealed</span>}</div></div>
            {!sealed && <div className="flex gap-2"><a className="link-rule text-[13px]" href={`?edit=${it.id}`}>edit</a><form action={deleteItemAction}><input type="hidden" name="id" value={it.id} /><input type="hidden" name="openId" value={id} /><button className="text-[13px] text-clay">delete</button></form></div>}
          </li>
        ))}
      </ol>
    </Card>
    {!sealed && (
      <Card className="mt-6" title={editing ? `Edit item #${editing.position}` : 'Add item'}>
        <form action={saveItemAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="formId" value={formId} /><input type="hidden" name="openId" value={id} /><input type="hidden" name="id" value={editing?.id ?? ''} />
          <FieldRow label="Position" htmlFor="position"><Input id="position" name="position" type="number" defaultValue={editing?.position ?? form.items.length + 1} /></FieldRow>
          <FieldRow label="Input type" htmlFor="inputType"><Select id="inputType" name="inputType" defaultValue={editing?.inputType ?? 'integer'}>{INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></FieldRow>
          <div className="md:col-span-2"><FieldRow label="Prompt" htmlFor="prompt" hint="Self-contained. Every fact needed is in the item."><Textarea id="prompt" name="prompt" required defaultValue={editing?.prompt ?? ''} /></FieldRow></div>
          <div className="md:col-span-2"><FieldRow label="Scoring spec (JSON)" htmlFor="scoringJson" hint={`Examples: ${Object.values(EXAMPLES).slice(0, 3).join('  ·  ')}`}><Textarea id="scoringJson" name="scoringJson" className="font-mono text-[12.5px]" required defaultValue={editing?.scoringSpecJson ?? EXAMPLES.integer} /></FieldRow></div>
          <FieldRow label="Max points" htmlFor="maxPoints"><Input id="maxPoints" name="maxPoints" type="number" step="0.5" defaultValue={editing?.maxPoints ?? 1} /></FieldRow>
          <FieldRow label="Input hint (shown to registrant)" htmlFor="inputHint"><Input id="inputHint" name="inputHint" defaultValue={editing?.inputHint ?? ''} /></FieldRow>
          <FieldRow label="Structured fields (JSON, allocation/parts)" htmlFor="fieldsJson" hint='e.g. [{"key":"x1","label":"Roof"}]'><Input id="fieldsJson" name="fieldsJson" defaultValue={editing?.fieldsJson ?? ''} /></FieldRow>
          <div className="space-y-3 pt-6"><Checkbox name="tieOrderFlag" defaultChecked={editing?.tieOrderFlag ?? false} label="Tie-order subset item" /><Checkbox name="calculatorPermitted" defaultChecked={editing?.calculatorPermitted ?? false} label="Calculator permitted" /></div>
          <div className="md:col-span-2"><Button type="submit">Validate and save</Button></div>
        </form>
      </Card>
    )}
  </>);
}
