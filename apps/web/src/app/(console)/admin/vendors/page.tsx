import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { Checkbox, FieldRow, Input, Select, Textarea } from '@/components/ui/Field';
import { Table, Td, Tr } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { db } from '@/lib/db';
import { saveVendorAction } from '@/modules/admin/actions';
import { ACCOUNT_TYPES, checkSettlement, custodyProfile, DEFAULT_RELEASE_EVENTS, parseCustodyConfig } from '@/lib/custody';
export const dynamic = 'force-dynamic';
const KINDS = ['payments', 'custodian', 'administrator', 'idv', 'sanctions', 'proctoring', 'email', 'title', 'geolocation', 'timestamping'];
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const rows = await db.vendor.findMany({ orderBy: { kind: 'asc' } });
  const editing = rows.find((v) => v.id === sp.edit) ?? null;
  const [profile, settlement] = await Promise.all([custodyProfile(), checkSettlement()]);
  const custody = parseCustodyConfig(editing?.kind === 'custodian' ? editing : null);
  const editingCustodian = editing?.kind === 'custodian';
  return (<>
    <PageHead label="Integrations" title="Vendors" />
    <ErrorBanner sp={sp} />
    <Card className="mt-6" title="Custody of registration fees (Rules 12.1)">
      <div className="grid gap-4 text-[13.5px] md:grid-cols-3">
        <div><div className="plate">Custodian profile</div><p className="mt-1">{profile.vendor?.name ?? 'No custodian vendor yet.'}</p><p className="mt-1 text-[12.5px] text-graphite">{profile.complete ? 'Complete; shown on /custody and every docket.' : `Pending: ${profile.missing.join(', ')}.`}</p></div>
        <div><div className="plate">Settlement destination</div><p className="mt-1"><Badge tone={settlement.ok ? 'verify' : settlement.configured ? 'amber' : 'neutral'}>{settlement.provider}</Badge> {settlement.destination ?? ''}</p><p className="mt-1 text-[12.5px] text-graphite">{settlement.detail}</p></div>
        <div><div className="plate">How it is wired</div><p className="mt-1 text-[12.5px] text-graphite">The processor’s connected account for the custodian goes in the environment as STRIPE_CUSTODIAN_ACCOUNT_ID; every checkout is created with that account as the transfer destination. No bank details are stored or shown anywhere on the site. <a className="link-rule" href="/custody">Public page →</a> · <a className="link-rule" href="/auditor/custody">Reconciliation →</a></p></div>
      </div>
    </Card>
    <Card className="mt-6"><Table head={['Kind', 'Name', 'Public summary', 'Active', '']}>{rows.map((v) => <Tr key={v.id}><Td><Badge>{v.kind}</Badge></Td><Td>{v.name}</Td><Td>{v.publicSummaryUrl ? <a className="link-rule" href={v.publicSummaryUrl}>link</a> : '—'}</Td><Td>{v.active ? 'yes' : 'no'}</Td><Td><a className="link-rule" href={`?edit=${v.id}`}>edit</a></Td></Tr>)}</Table></Card>
    <Card className="mt-6" title={editing ? `Edit ${editing.name}` : 'Add vendor'}>
      <form action={saveVendorAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="id" value={editing?.id ?? ''} />
        <FieldRow label="Kind" htmlFor="kind"><Select id="kind" name="kind" defaultValue={editing?.kind ?? 'payments'}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</Select></FieldRow>
        <FieldRow label="Name" htmlFor="name"><Input id="name" name="name" required defaultValue={editing?.name ?? ''} /></FieldRow>
        <FieldRow label="Public summary URL" htmlFor="publicSummaryUrl" hint="Rendered in “Verify everything”."><Input id="publicSummaryUrl" name="publicSummaryUrl" defaultValue={editing?.publicSummaryUrl ?? ''} /></FieldRow>
        <div className="pt-6"><Checkbox name="active" defaultChecked={editing?.active ?? true} label="Active" /></div>
        {editingCustodian ? (<>
          <FieldRow label="Institution" htmlFor="institution" hint="Bank or escrow company holding the account."><Input id="institution" name="institution" defaultValue={custody.institution} /></FieldRow>
          <FieldRow label="Account form" htmlFor="accountType"><Select id="accountType" name="accountType" defaultValue={custody.accountType ?? ''}><option value="">— pending —</option>{Object.entries(ACCOUNT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></FieldRow>
          <FieldRow label="Custody agreement signed" htmlFor="agreementDate"><Input id="agreementDate" name="agreementDate" type="date" defaultValue={custody.agreementDate ?? ''} /></FieldRow>
          <FieldRow label="Agreement SHA-256" htmlFor="agreementHash" hint="Hash of the signed PDF; published, the PDF is not."><Input id="agreementHash" name="agreementHash" className="font-mono text-[12.5px]" defaultValue={custody.agreementHash ?? ''} /></FieldRow>
          <FieldRow label="Processor settlement" htmlFor="settlement"><Select id="settlement" name="settlement" defaultValue={custody.settlement}><option value="destination">Settlement destination set to the custodian</option><option value="merchant_of_record">Custodian is merchant of record</option></Select></FieldRow>
          <FieldRow label="Reconciliation contact" htmlFor="reconciliationEmail" hint="Receives nothing automatically; recorded for the auditor."><Input id="reconciliationEmail" name="reconciliationEmail" type="email" defaultValue={custody.reconciliationEmail ?? ''} /></FieldRow>
          <div className="md:col-span-2"><FieldRow label="Release events (one per line)" htmlFor="releaseEvents" hint="From the custody agreement, Exhibit G. Shown publicly."><Textarea id="releaseEvents" name="releaseEvents" rows={5} defaultValue={(custody.releaseEvents.length ? custody.releaseEvents : DEFAULT_RELEASE_EVENTS).join('\n')} /></FieldRow></div>
        </>) : (
          <div className="md:col-span-2"><FieldRow label="Config (JSON, non-secret)" htmlFor="configJson" hint="Secrets live in environment variables, never here."><Textarea id="configJson" name="configJson" className="font-mono text-[12.5px]" defaultValue={editing?.configJson ?? '{}'} /></FieldRow></div>
        )}
        <div className="md:col-span-2"><Button type="submit">Save vendor</Button></div>
      </form>
    </Card>
  </>);
}
