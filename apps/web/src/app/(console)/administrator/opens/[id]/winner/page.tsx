import { notFound } from 'next/navigation';
import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { Checkbox, FieldRow, Input } from '@/components/ui/Field';
import { Ledger } from '@/components/ui/Ledger';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { db } from '@/lib/db';
import { getOpenById } from '@/modules/meritopens/queries';
import { certifyWinnerAction, completeClosingAction } from '@/modules/administrator/actions';
import { fmtDateTime } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams;
  const o = await getOpenById(id);
  if (!o) notFound();
  const reg = o.winnerRegistrationId ? await db.registration.findUnique({ where: { id: o.winnerRegistrationId }, include: { user: true, attempts: { include: { score: true, round: true } } } }) : null;
  const finalScore = reg?.attempts.find((a) => a.round.number === 'final' || a.round.number.startsWith('tiebreak'))?.score;
  return (<>
    <PageHead label={o.name} title="Result certification (Rules 9)" />
    <ErrorBanner sp={sp} />
    {!reg && <p className="mt-6 text-slate">No potential winner has been determined yet. Certify the Final first.</p>}
    {reg && (
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Potential winner (highest valid Final score)">
          <Ledger rows={[
            { term: 'Registration', detail: <span className="font-mono text-[12.5px]">{reg.id}</span> },
            { term: 'Legal name', detail: reg.user.legalName ?? '—' },
            { term: 'Identity', detail: <><StatusBadge status={reg.user.idvStatus} /> <span className="ml-2 font-mono text-[12px]">{reg.user.idvVendorRef}</span></> },
            { term: 'Sanctions', detail: <><StatusBadge status={reg.user.sanctionsStatus} /> {fmtDateTime(reg.user.sanctionsCheckedAt)}</> },
            { term: 'Certified score', detail: <span className="font-mono">{finalScore?.totalPoints ?? '—'}</span> },
            { term: 'Registration status', detail: <StatusBadge status={reg.status} /> },
            { term: 'Re-verified', detail: fmtDateTime(reg.reVerifiedAt) }, { term: 'Affidavit', detail: fmtDateTime(reg.affidavitSignedAt) },
          ]} />
          <p className="mt-4 text-[12.5px] text-graphite">If verification fails or the prize is declined, the next-highest valid Final score becomes the potential winner (Rules 9.2). Never a new selection.</p>
        </Card>
        {o.status === 'certification' && (
          <Card title="Wizard">
            <form action={certifyWinnerAction} className="space-y-4"><input type="hidden" name="openId" value={id} />
              <Checkbox name="reVerified" required label="Identity, age, residency, and eligibility re-verified against the vendor and the exclusion lists." />
              <Checkbox name="sanctionsRecheck" required label="Sanctions screening re-run before certification." />
              <Checkbox name="affidavit" required label="Affidavit of eligibility and unassisted work received and on file." />
              <Checkbox name="acceptance" required label="Prize acceptance and disclosure acknowledgments (Exhibit F) signed." />
              <Checkbox name="publicityConsent" label="Publicity release signed — name and city may appear in the public audit summary." />
              <Button type="submit">Certify the result → closing</Button>
            </form>
          </Card>
        )}
        {o.status === 'closing' && (
          <Card title="Closing hand-off"><p className="text-[13.5px] text-slate">Certification package exported to the title company; cash component release instruction sent to the Custodian. Record the deed to complete.</p>
            <form action={completeClosingAction} className="mt-4 space-y-3"><input type="hidden" name="openId" value={id} /><FieldRow label="Deed recording reference" htmlFor="deedRef"><Input id="deedRef" name="deedRef" required /></FieldRow><Button type="submit">Mark complete</Button></form></Card>
        )}
        {['complete'].includes(o.status) && <Card title="Done"><Badge tone="verify">complete</Badge><p className="mt-3 text-[13.5px] text-slate">Release any remaining packages from the hub. The public audit summary is live.</p></Card>}
      </div>
    )}
  </>);
}
