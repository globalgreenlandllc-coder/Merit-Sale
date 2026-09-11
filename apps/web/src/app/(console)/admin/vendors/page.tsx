import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { Checkbox, FieldRow, Input, Select, Textarea } from '@/components/ui/Field';
import { Table, Td, Tr } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { db } from '@/lib/db';
import { saveVendorAction } from '@/modules/admin/actions';
export const dynamic = 'force-dynamic';
const KINDS = ['payments', 'custodian', 'administrator', 'idv', 'sanctions', 'proctoring', 'email', 'title', 'geolocation', 'timestamping'];
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const rows = await db.vendor.findMany({ orderBy: { kind: 'asc' } });
  const editing = rows.find((v) => v.id === sp.edit) ?? null;
  return (<>
    <PageHead label="Integrations" title="Vendors" />
    <ErrorBanner sp={sp} />
    <Card className="mt-6"><Table head={['Kind', 'Name', 'Public summary', 'Active', '']}>{rows.map((v) => <Tr key={v.id}><Td><Badge>{v.kind}</Badge></Td><Td>{v.name}</Td><Td>{v.publicSummaryUrl ? <a className="link-rule" href={v.publicSummaryUrl}>link</a> : '—'}</Td><Td>{v.active ? 'yes' : 'no'}</Td><Td><a className="link-rule" href={`?edit=${v.id}`}>edit</a></Td></Tr>)}</Table></Card>
    <Card className="mt-6" title={editing ? `Edit ${editing.name}` : 'Add vendor'}>
      <form action={saveVendorAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="id" value={editing?.id ?? ''} />
        <FieldRow label="Kind" htmlFor="kind"><Select id="kind" name="kind" defaultValue={editing?.kind ?? 'payments'}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</Select></FieldRow>
        <FieldRow label="Name" htmlFor="name"><Input id="name" name="name" required defaultValue={editing?.name ?? ''} /></FieldRow>
        <FieldRow label="Public summary URL" htmlFor="publicSummaryUrl" hint="Rendered in “Verify everything”."><Input id="publicSummaryUrl" name="publicSummaryUrl" defaultValue={editing?.publicSummaryUrl ?? ''} /></FieldRow>
        <div className="pt-6"><Checkbox name="active" defaultChecked={editing?.active ?? true} label="Active" /></div>
        <div className="md:col-span-2"><FieldRow label="Config (JSON, non-secret)" htmlFor="configJson" hint="Secrets live in environment variables, never here."><Textarea id="configJson" name="configJson" className="font-mono text-[12.5px]" defaultValue={editing?.configJson ?? '{}'} /></FieldRow></div>
        <div className="md:col-span-2"><Button type="submit">Save vendor</Button></div>
      </form>
    </Card>
  </>);
}
