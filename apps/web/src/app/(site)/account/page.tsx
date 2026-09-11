import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Plate, SectionHeading } from '@/components/ui/Plate';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { ButtonLink, Button } from '@/components/ui/Button';
import { Ledger } from '@/components/ui/Ledger';
import { Notice } from '@/components/ui/Notice';
import { Table, Td, Tr } from '@/components/ui/Table';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth/guards';
import { signOut } from '@/modules/accounts/actions';
import { fmtDateTime, fmtDuration, money, roundLabel } from '@/lib/format';
import { openInclude } from '@/modules/meritopens/queries';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your account' };

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const s = await requireSession('/account');
  const user = await db.user.findUniqueOrThrow({ where: { id: s.userId } });
  const [registrations, reservations, notices, accommodations] = await Promise.all([
    db.registration.findMany({ where: { userId: user.id }, include: { meritOpen: { include: openInclude }, payment: true, attempts: { include: { score: true, round: true } }, advancements: { include: { round: true } }, disputes: true }, orderBy: { createdAt: 'desc' } }),
    db.reservation.findMany({ where: { userId: user.id }, include: { meritOpen: true } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { sentAt: 'desc' }, take: 12 }),
    db.accommodation.findMany({ where: { userId: user.id }, include: { meritOpen: true } }),
  ]);
  return (
    <Container className="py-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading label="Your account" title={user.legalName ?? user.email} lede={<>Identity: <Badge tone={user.idvStatus === 'verified' ? 'verify' : 'amber'}>{user.idvStatus}{user.idvLevel ? ` · ${user.idvLevel}` : ''}</Badge> <span className="ml-2">Role: <Badge tone="ink">{s.role}</Badge></span></>} />
        <div className="flex gap-2"><ButtonLink href="/account/profile" variant="secondary">Edit profile</ButtonLink><form action={signOut}><Button type="submit" variant="ghost">Sign out</Button></form></div>
      </div>
      {sp.filed && <Notice className="mt-8" tone="verify" title="Filed">Reference {sp.filed}. The Administrator decides against the locked key and rules; the written decision is final for the Merit Open.</Notice>}
      {sp.error && <Notice className="mt-8" tone="warn">{sp.error.replace(/_/g, ' ')}</Notice>}

      <h2 className="plate mt-14">Registrations</h2>
      {!registrations.length && <p className="mt-4 text-[15px] text-slate">No registrations yet. <Link href="/opens" className="link-rule">See Merit Opens →</Link></p>}
      <div className="mt-4 space-y-8">
        {registrations.map((r) => {
          const open = r.meritOpen;
          const activeRound = open.rounds.find((rd) => rd.number === open.status || (open.status === 'tiebreak' && rd.number.startsWith('tiebreak') && rd.status === 'open'));
          const myAttemptFor = (roundId: string) => r.attempts.find((a) => a.roundId === roundId);
          const advFor = (roundId: string) => r.advancements.find((a) => a.roundId === roundId);
          return (
            <section key={r.id} className="rounded-md border hair bg-paper p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><Link href={`/opens/${open.slug}`} className="font-display text-[26px] leading-tight link-rule">{open.name}</Link><div className="mt-1 font-mono text-[11.5px] text-graphite">Registration {r.id}</div></div>
                <div className="flex gap-2"><StatusBadge status={r.status} /><StatusBadge status={open.status} /></div>
              </div>
              {r.status === 'disqualified' && <Notice className="mt-4" tone="danger" title="Disqualified">{r.disqualifiedReason}</Notice>}
              <Ledger className="mt-6" rows={[
                { term: 'Fee', detail: r.payment ? <>{money(r.payment.amountCents)} · {r.payment.status} · settled to custodian {r.payment.custodianSettlementRef ? <span className="font-mono text-[12px]">{r.payment.custodianSettlementRef}</span> : '(pending)'}</> : 'No payment recorded' },
                { term: 'Rules accepted', detail: r.acceptedAt ? <>{fmtDateTime(r.acceptedAt)} · rules hash <span className="font-mono text-[12px]">{r.acceptedRulesHash?.slice(0, 16)}…</span></> : 'Not yet' },
              ]} />
              {activeRound && r.status === 'confirmed' && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-sm bg-ink p-5 text-parchment">
                  <div><div className="plate-dark">Now</div><div className="font-display mt-1 text-[22px]">{roundLabel(activeRound.number)} · {fmtDuration(activeRound.durationSeconds)}</div><div className="mt-1 text-[13px] text-sage">{activeRound.windowStart ? `Window ${fmtDateTime(activeRound.windowStart)} – ${fmtDateTime(activeRound.windowEnd)}` : `Starts ${fmtDateTime(activeRound.scheduledAt)}`}</div></div>
                  <ButtonLink href={`/test/${open.slug}/${activeRound.number}`} variant="brass" size="lg">{myAttemptFor(activeRound.id) ? 'Open your attempt' : 'Enter the round'}</ButtonLink>
                </div>
              )}
              <h3 className="plate mt-8">Rounds</h3>
              <Table className="mt-3" dense head={['Round', 'When', 'Your attempt', 'Score', 'Result']}>
                {open.rounds.filter((rd) => !rd.number.startsWith('tiebreak') || myAttemptFor(rd.id) || advFor(rd.id)).map((rd) => {
                  const a = myAttemptFor(rd.id); const adv = advFor(rd.id);
                  return (
                    <Tr key={rd.id}>
                      <Td>{roundLabel(rd.number)}</Td>
                      <Td>{rd.windowStart ? `${fmtDateTime(rd.windowStart)} – ${fmtDateTime(rd.windowEnd)}` : fmtDateTime(rd.scheduledAt)}</Td>
                      <Td>{a ? <StatusBadge status={a.status} /> : <span className="text-graphite">—</span>}</Td>
                      <Td mono>{rd.scoresPostedAt && a?.score ? (rd.number === 'r1' ? (a.score.r1Pass ? 'pass' : 'no pass') : `${a.score.totalPoints} pts · tie-order ${a.score.tieOrderPoints} · ${fmtDuration(a.score.elapsedSeconds)}`) : rd.status === 'certified' && !a ? 'no attempt' : <span className="text-graphite">not posted</span>}</Td>
                      <Td>{adv ? <Badge tone={adv.advanced ? 'verify' : 'neutral'}>{adv.advanced ? `advanced · ${adv.reason.replace(/_/g, ' ')}${adv.rank ? ` · rank ${adv.rank}` : ''}` : adv.reason.replace(/_/g, ' ')}</Badge> : <span className="text-graphite">—</span>}</Td>
                    </Tr>
                  );
                })}
              </Table>
              <div className="mt-6 flex flex-wrap gap-2">
                {open.rounds.some((rd) => rd.scoresPostedAt && rd.disputeDeadlineAt && rd.disputeDeadlineAt.getTime() > Date.now()) && <ButtonLink href={`/account/opens/${open.slug}/challenge`} variant="secondary" size="sm">Challenge your score</ButtonLink>}
                <ButtonLink href={`/account/opens/${open.slug}/technical`} variant="secondary" size="sm">Report a technical failure</ButtonLink>
                <ButtonLink href={`/account/opens/${open.slug}/accommodation`} variant="secondary" size="sm">Request an accommodation</ButtonLink>
              </div>
              {r.disputes.length > 0 && (
                <ul className="mt-4 space-y-2 text-[13.5px]">
                  {r.disputes.map((d) => <li key={d.id} className="rounded-sm border hair px-3 py-2"><StatusBadge status={d.status} /> <span className="ml-2">{d.type.replace(/_/g, ' ')} · filed {fmtDateTime(d.filedAt)}</span>{d.decision && <div className="mt-1 text-slate">Decision: {d.decision}</div>}</li>)}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {reservations.length > 0 && (<><h2 className="plate mt-14">Reservations</h2><ul className="mt-4 border-t hair">{reservations.map((rv) => <li key={rv.id} className="flex flex-wrap items-center justify-between gap-2 border-b hair py-3"><Link href={`/opens/${rv.meritOpen.slug}`} className="link-rule">{rv.meritOpen.name}</Link><span className="text-[13px] text-graphite">free · non-binding · {fmtDateTime(rv.createdAt)}</span></li>)}</ul></>)}

      {accommodations.length > 0 && (<><h2 className="plate mt-14">Accommodations</h2><ul className="mt-4 border-t hair">{accommodations.map((a) => <li key={a.id} className="border-b hair py-3 text-[14px]"><StatusBadge status={a.status} /> <span className="ml-2">{a.meritOpen.name}</span>{a.status === 'granted' && <span className="ml-2 text-slate">· +{fmtDuration(a.extraTimeSeconds)}</span>}{a.decision && <div className="mt-1 text-slate">{a.decision}</div>}</li>)}</ul></>)}

      <h2 className="plate mt-14">Notices</h2>
      <ul className="mt-4 border-t hair">
        {notices.map((n) => (
          <li key={n.id} className="border-b hair py-4"><div className="flex flex-wrap items-center gap-2"><Badge tone={n.mandatory ? 'brass' : 'neutral'}>{n.kind.replace(/_/g, ' ')}</Badge><span className="text-[13px] text-graphite">{fmtDateTime(n.sentAt)}</span></div><div className="mt-1 text-[15px] font-medium">{n.subject}</div><p className="mt-1 whitespace-pre-line text-[14px] text-slate">{n.body}</p></li>
        ))}
        {!notices.length && <li className="py-4 text-[14px] text-graphite">No notices yet.</li>}
      </ul>
    </Container>
  );
}
