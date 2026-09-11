import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Plate } from '@/components/ui/Plate';
import { Button } from '@/components/ui/Button';
import { FieldRow, Select, Textarea } from '@/components/ui/Field';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth/guards';
import { fileTechnicalFailureAction } from '@/modules/disputes/actions';
import { roundLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TechnicalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await requireSession(`/account/opens/${slug}/technical`);
  const open = await db.meritOpen.findUnique({ where: { slug }, include: { rounds: { orderBy: { sequence: 'asc' } } } });
  if (!open) notFound();
  const reg = await db.registration.findUnique({ where: { userId_meritOpenId: { userId: s.userId, meritOpenId: open.id } } });
  if (!reg) notFound();
  return (
    <Container className="max-w-2xl py-16">
      <Plate>Technical failure · Rules 8.8</Plate>
      <h1 className="font-display mt-4 text-[38px] leading-tight">Report a platform outage.</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-slate">A verified failure of the platform or proctoring system is remedied by re-administering the affected round to all affected registrants with the committed reserve form — never by adjusting any score. Failures of your own device, connection, or environment are not platform failures. The platform provides server logs (uptime, error rates) to the Administrator under Exhibit E.</p>
      <form action={fileTechnicalFailureAction} className="mt-8 space-y-5">
        <input type="hidden" name="registrationId" value={reg.id} /><input type="hidden" name="back" value="/account" />
        <FieldRow label="Round" htmlFor="roundId"><Select id="roundId" name="roundId">{open.rounds.map((r) => <option key={r.id} value={r.id}>{roundLabel(r.number)}</option>)}</Select></FieldRow>
        <FieldRow label="What happened, and when?" htmlFor="statement" hint="Times, error messages, what you were doing."><Textarea id="statement" name="statement" required minLength={20} /></FieldRow>
        <Button type="submit" size="lg">Send to the Administrator</Button>
      </form>
    </Container>
  );
}
