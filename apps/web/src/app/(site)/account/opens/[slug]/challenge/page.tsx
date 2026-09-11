import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Plate } from '@/components/ui/Plate';
import { Button } from '@/components/ui/Button';
import { FieldRow, Select, Textarea } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth/guards';
import { fileScoreChallengeAction } from '@/modules/disputes/actions';
import { fmtDateTime, roundLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await requireSession(`/account/opens/${slug}/challenge`);
  const open = await db.meritOpen.findUnique({ where: { slug }, include: { rounds: { where: { scoresPostedAt: { not: null } }, include: { form: { include: { items: { select: { id: true, position: true }, orderBy: { position: 'asc' } } } } } } } });
  if (!open) notFound();
  const reg = await db.registration.findUnique({ where: { userId_meritOpenId: { userId: s.userId, meritOpenId: open.id } }, include: { attempts: { include: { responses: { include: { item: true } } } } } });
  if (!reg) notFound();
  const openRounds = open.rounds.filter((r) => r.disputeDeadlineAt && r.disputeDeadlineAt.getTime() > Date.now());
  return (
    <Container className="max-w-2xl py-16">
      <Plate>Score challenge · Rules 11.1</Plate>
      <h1 className="font-display mt-4 text-[38px] leading-tight">Challenge your own score.</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-slate">Identify the specific item and the claimed error. The Administrator decides by applying the locked answer key and formulas, and has no authority to alter either. Challenges to another registrant’s score are not permitted.</p>
      {!openRounds.length && <Notice className="mt-6" tone="warn">No round is currently within its challenge window.</Notice>}
      {openRounds.length > 0 && (
        <form action={fileScoreChallengeAction} className="mt-8 space-y-5">
          <input type="hidden" name="registrationId" value={reg.id} /><input type="hidden" name="back" value="/account" />
          <FieldRow label="Round" htmlFor="roundId"><Select id="roundId" name="roundId">{openRounds.map((r) => <option key={r.id} value={r.id}>{roundLabel(r.number)} · window closes {fmtDateTime(r.disputeDeadlineAt)}</option>)}</Select></FieldRow>
          <FieldRow label="Item" htmlFor="itemId" hint="Your recorded answer is shown for reference."><Select id="itemId" name="itemId">{openRounds.flatMap((r) => (r.form?.items ?? []).map((it) => { const resp = reg.attempts.find((a) => a.roundId === r.id)?.responses.find((x) => x.itemId === it.id); return <option key={it.id} value={it.id}>{roundLabel(r.number)} · item {it.position}{resp ? ` · your answer: ${resp.rawAnswer.slice(0, 40)} · ${resp.score ?? 0} pts` : ''}</option>; }))}</Select></FieldRow>
          <FieldRow label="Claimed error" htmlFor="statement"><Textarea id="statement" name="statement" required minLength={20} placeholder="State precisely what you believe was scored incorrectly and why." /></FieldRow>
          <Button type="submit" size="lg">File challenge</Button>
        </form>
      )}
    </Container>
  );
}
