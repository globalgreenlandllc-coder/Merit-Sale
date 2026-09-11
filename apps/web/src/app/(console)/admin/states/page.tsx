import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { db } from '@/lib/db';
import { saveStateRuleAction } from '@/modules/admin/actions';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const rows = await db.stateRule.findMany({ orderBy: { code: 'asc' } });
  return (<>
    <PageHead label="Compliance" title="States matrix" />
    <ErrorBanner sp={sp} />
    <p className="mt-4 max-w-3xl text-[13.5px] text-slate">Eligibility is a hard block enforced at registration (residence + ID + IP). Disclosure templates render on the Merit Open page per state (e.g. CA B&amp;P 17539.1). Counsel status is informational.</p>
    <Card className="mt-6">
      <div className="overflow-x-auto"><table className="w-full border-t hair text-[13px]"><thead><tr>{['State', 'Eligible', 'Disclosure template', 'Counsel status', 'Notes', ''].map((h) => <th key={h} className="plate border-b hair py-2 pr-3 text-left font-normal">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.code} className="border-b hair align-middle">
            <td className="py-1.5 pr-3 font-mono">{r.code} <span className="font-sans text-graphite">{r.name}</span></td>
            <td className="py-1.5 pr-3"><form id={`f-${r.code}`} action={saveStateRuleAction}><input type="hidden" name="code" value={r.code} /><input type="hidden" name="name" value={r.name} /><input type="checkbox" name="eligible" defaultChecked={r.eligible} className="accent-[#1f3b2e]" /></form>{r.eligible && <Badge tone="verify" className="ml-2">eligible</Badge>}</td>
            <td className="py-1.5 pr-3"><input form={`f-${r.code}`} name="disclosureTemplate" defaultValue={r.disclosureTemplate ?? ''} className="field py-1 text-[12.5px]" placeholder="e.g. CA-BP-17539.1" /></td>
            <td className="py-1.5 pr-3"><select form={`f-${r.code}`} name="counselStatus" defaultValue={r.counselStatus} className="field py-1 text-[12.5px]">{['not_reviewed', 'in_review', 'cleared', 'blocked', 'later_phase', 'demo_only'].map((s) => <option key={s} value={s}>{s}</option>)}</select></td>
            <td className="py-1.5 pr-3"><input form={`f-${r.code}`} name="notes" defaultValue={r.notes ?? ''} className="field py-1 text-[12.5px]" /></td>
            <td className="py-1.5"><Button form={`f-${r.code}`} type="submit" size="sm" variant="secondary">Save</Button></td>
          </tr>))}</tbody></table></div>
    </Card>
  </>);
}
