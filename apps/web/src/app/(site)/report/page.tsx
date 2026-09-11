import { Container } from '@/components/ui/Container';
import { Plate } from '@/components/ui/Plate';
import { Button } from '@/components/ui/Button';
import { FieldRow, Input, Textarea } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { fileIntegrityReportAction } from '@/modules/disputes/actions';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Report a concern' };

export default async function ReportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const s = await getSession();
  return (
    <Container className="max-w-2xl py-16">
      <Plate>Integrity report · Rules 11.2</Plate>
      <h1 className="font-display mt-4 text-[40px] leading-tight">Report suspected cheating or tampering.</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-slate">Any person may report a suspected violation of Section 8. Reports go directly to the independent Administrator and are reviewed under Exhibit E. Reports are not a way to challenge another registrant’s score.</p>
      {sp.filed && <Notice className="mt-6" tone="verify" title="Received">Reference {sp.filed}. The Administrator will review it under the published procedure.</Notice>}
      {sp.error && <Notice className="mt-6" tone="warn">Please describe what you observed in at least 20 characters.</Notice>}
      <form action={fileIntegrityReportAction} className="mt-8 space-y-5">
        <FieldRow label="Merit Open (slug, optional)" htmlFor="openSlug"><Input id="openSlug" name="openSlug" placeholder="e.g. hollow-creek" /></FieldRow>
        <FieldRow label="What did you observe?" htmlFor="statement" hint="Who, what, when, and how you know."><Textarea id="statement" name="statement" required minLength={20} /></FieldRow>
        {s ? <Button type="submit" size="lg">Send to the Administrator</Button> : <p className="text-[14px] text-slate">Sign in to file a report; reports are attributed to an account so the Administrator can follow up.</p>}
      </form>
    </Container>
  );
}
