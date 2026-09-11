import { PageHead, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { FieldRow, Input, Select } from '@/components/ui/Field';
import { Table, Td, Tr } from '@/components/ui/Table';
import { db } from '@/lib/db';
import { addExclusionAction } from '@/modules/admin/actions';
import { fmtDateTime } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const rows = await db.exclusionEntry.findMany({ orderBy: { createdAt: 'desc' } });
  return (<>
    <PageHead label="Eligibility" title="Exclusion lists (Rules 2.2)" />
    <Card className="mt-6" title="Add entry"><form action={addExclusionAction} className="grid gap-4 md:grid-cols-5">
      <FieldRow label="Match" htmlFor="matchType"><Select id="matchType" name="matchType"><option value="email">email</option><option value="domain">domain</option><option value="name">name</option></Select></FieldRow>
      <FieldRow label="Value" htmlFor="value"><Input id="value" name="value" required /></FieldRow>
      <FieldRow label="Category" htmlFor="category"><Select id="category" name="category">{['employee', 'contractor', 'vendor', 'family', 'seller', 'title_company', 'item_author'].map((c) => <option key={c} value={c}>{c}</option>)}</Select></FieldRow>
      <FieldRow label="Party" htmlFor="party"><Input id="party" name="party" defaultValue="Sponsor" /></FieldRow>
      <div className="pt-6"><Button type="submit">Add</Button></div>
    </form></Card>
    <Card className="mt-6"><Table head={['Match', 'Value', 'Category', 'Party', 'Added']}>{rows.map((r) => <Tr key={r.id}><Td>{r.matchType}</Td><Td mono>{r.value}</Td><Td>{r.category}</Td><Td>{r.party}</Td><Td>{fmtDateTime(r.createdAt)}</Td></Tr>)}</Table></Card>
  </>);
}
