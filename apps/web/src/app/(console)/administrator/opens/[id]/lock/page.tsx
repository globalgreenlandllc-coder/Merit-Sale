import { notFound } from 'next/navigation';
import { validateForm, type AuthoredItemInput } from '@etk/items';
import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Field';
import { db } from '@/lib/db';
import { getOpenById, parseConfig } from '@/modules/meritopens/queries';
import { lockMeritOpenAction } from '@/modules/administrator/actions';
import { safeJson } from '@/lib/format';
export const dynamic = 'force-dynamic';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams;
  const o = await getOpenById(id);
  if (!o) notFound();
  const rs = o.rulesets[0] ?? null;
  const cfg = parseConfig(rs);
  const forms = await db.form.findMany({ where: { meritOpenId: id }, include: { items: { orderBy: { position: 'asc' } } } });
  const checks = forms.map((f) => {
    const items: AuthoredItemInput[] = f.items.map((it) => ({ id: it.id, position: it.position, prompt: it.prompt, inputType: it.inputType as AuthoredItemInput['inputType'], scoring: safeJson(it.scoringSpecJson, null) as unknown as AuthoredItemInput['scoring'], maxPoints: it.maxPoints, tieOrderFlag: it.tieOrderFlag, calculatorPermitted: it.calculatorPermitted, inputHint: it.inputHint ?? undefined, fields: safeJson(it.fieldsJson, undefined) ?? undefined }));
    const v = f.hashPublishedAt ? { ok: true, problems: [] as string[] } : validateForm(items);
    return { f, ok: v.ok && f.items.length > 0, problems: f.items.length ? v.problems : ['no items'] };
  });
  const roundsOk = o.rounds.map((r) => ({ r, ok: !!r.formId && (!!r.reserveFormId || r.number.startsWith('tiebreak')) }));
  const allOk = !!cfg && !!o.registrationOpenAt && !!o.registrationCloseAt && checks.every((c) => c.ok) && roundsOk.every((r) => r.ok) && o.rounds.length > 0;
  return (<>
    <PageHead label={o.name} title="Lock ceremony" />
    <ErrorBanner sp={sp} />
    <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-slate">One irreversible act: the ruleset is hashed; every form is validated, packaged, hashed, and sealed under the Administrator key; plaintext keys are wiped from the platform; hashes are published in the public registry. Afterward no rule and no key can change.</p>
    <Card className="mt-6" title="Checklist">
      <ul className="space-y-2 text-[14px]">
        <li>{cfg ? <Badge tone="verify">ok</Badge> : <Badge tone="clay">fail</Badge>} Ruleset version {rs?.version ?? '—'} parses against the schema</li>
        <li>{o.registrationOpenAt && o.registrationCloseAt ? <Badge tone="verify">ok</Badge> : <Badge tone="clay">fail</Badge>} Registration open/close set (immutable after lock)</li>
        <li>{o.property.titleStatus === 'owned' ? <Badge tone="verify">ok</Badge> : <Badge tone="amber">note</Badge>} Property title: {o.property.titleStatus.replace(/_/g, ' ')} — registration will require title or a recorded override</li>
        {roundsOk.map(({ r, ok }) => <li key={r.id}>{ok ? <Badge tone="verify">ok</Badge> : <Badge tone="clay">fail</Badge>} {r.number}: primary {r.formId ? 'assigned' : 'missing'}, reserve {r.reserveFormId ? 'assigned' : r.number.startsWith('tiebreak') ? 'n/a' : 'missing'}</li>)}
        {checks.map(({ f, ok, problems }) => <li key={f.id}>{ok ? <Badge tone="verify">ok</Badge> : <Badge tone="clay">fail</Badge>} Form {f.roundNumber}/{f.label}: {f.items.length} items{f.hashPublishedAt ? ' · already sealed' : ''}{problems.length ? <span className="text-clay"> — {problems.slice(0, 3).join('; ')}</span> : null}</li>)}
      </ul>
    </Card>
    <Card className="mt-6" title="Execute">
      <form action={lockMeritOpenAction} className="space-y-4"><input type="hidden" name="openId" value={id} />
        <Checkbox name="attest" required label="I am the Independent Administrator. I have reviewed the ruleset and every form. I understand this action is irreversible and publishes the hashes." />
        <Button type="submit" size="lg" disabled={!allOk || !!o.lockedAt}>{o.lockedAt ? 'Already locked' : 'Lock rules and forms · publish hashes'}</Button>
      </form>
    </Card>
  </>);
}
