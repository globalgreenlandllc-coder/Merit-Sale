import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Plate, SectionHeading } from '@/components/ui/Plate';
import { StatusBadge } from '@/components/ui/Badge';
import { Hash } from '@/components/ui/Hash';
import { Stat } from '@/components/ui/Stat';
import { ButtonLink } from '@/components/ui/Button';
import { StageTracker } from '@/components/site/StageTracker';
import { getSession } from '@/lib/auth/session';
import { certLabel, fmtDateTime } from '@/lib/format';
import { getOpenBySlug } from '@/modules/meritopens/queries';
import { myStage, stageCounts } from '@/modules/meritopens/status';

export const dynamic = 'force-dynamic';

/** Event board: where the Merit Open stands, what happens next, and the signed-in person's own line. */
export default async function StatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const open = await getOpenBySlug(slug);
  if (!open) notFound();
  const session = await getSession();
  const [counts, mine] = await Promise.all([stageCounts(open), myStage(open, session?.userId ?? null)]);
  const active = open.rounds.find((r) => r.number === open.status || (open.status === 'tiebreak' && r.number.startsWith('tiebreak') && r.status === 'open'));
  const next = open.status === 'registration' ? `Registration closes ${fmtDateTime(open.registrationCloseAt)}; Round 1 follows.` : active ? `${active.number.toUpperCase()} ${active.windowStart ? `window ${fmtDateTime(active.windowStart)} → ${fmtDateTime(active.windowEnd)}` : `at ${fmtDateTime(active.scheduledAt)}`}; results are posted after the Administrator unseals and certifies.` : open.status === 'certification' ? 'The Administrator is verifying the highest scorer; the result is published on certification.' : open.status === 'closing' ? 'Closing is in progress through the title company.' : open.status === 'complete' ? 'Complete. Keys released; audit summary published.' : open.status === 'reservation' ? 'Paid registration opens once the platform holds title.' : '';
  return (
    <Container className="py-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading label="Event board" title={open.name} lede={<>Live status of the Merit Open. Every stage below is fixed in the Official Rules; nothing moves. <Link href={`/opens/${slug}`} className="link-rule">Listing →</Link></>} />
        <div className="flex items-center gap-3"><StatusBadge status={open.status} />{mine?.registered ? <ButtonLink href="/account" size="sm">Your account</ButtonLink> : open.status === 'registration' ? <ButtonLink href={`/opens/${slug}/register`} size="sm">Register</ButtonLink> : null}</div>
      </div>
      <div className="mt-8 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Stage" value={<span className="text-[22px] capitalize">{open.status.replace(/_/g, ' ')}</span>} hint={next} />
        <Stat label={open.status === 'reservation' ? 'On the reservation list' : 'Registered'} value={<span className="tabular">{(open.status === 'reservation' ? counts.reservations ?? 0 : counts.registrations ?? 0).toLocaleString()}{(open.status === 'reservation' ? open.reservationTarget : open.registrationTarget ?? open.reservationTarget) && open.showReservationCount ? <span className="text-[16px] text-graphite"> / {(open.status === 'reservation' ? open.reservationTarget : open.registrationTarget ?? open.reservationTarget)!.toLocaleString()}</span> : null}</span>} hint="A pro forma target, not a condition: the event runs on its dates regardless (Rules 12.2)." />
        <Stat label="Qualified · advanced" value={<span className="text-[22px]">{[counts.r1Passed, counts.r2Advanced, counts.r3Advanced].map((v) => (v === undefined ? '—' : v.toLocaleString())).join(' · ')}</span>} hint="R1 · R2 · R3, from certified lists only" />
        <Stat label="Certifications" value={open.certifications.length} hint={<Link href="/registry" className="link-rule">hashes in the registry</Link>} />
      </div>
      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1fr]">
        <div><Plate>Stages</Plate><div className="mt-5"><StageTracker open={open} counts={counts} mine={mine} /></div></div>
        <div>
          <Plate>Certified so far</Plate>
          <ul className="mt-5 border-t hair">{open.certifications.map((c) => <li key={c.id} className="grid gap-1 border-b hair py-3 sm:grid-cols-[minmax(0,1fr)_auto]"><span className="text-[14.5px]">{certLabel(c.type)}<span className="ml-2 font-mono text-[11px] text-graphite">{fmtDateTime(c.signedAt)}</span></span><Hash value={c.hash} short /></li>)}{!open.certifications.length && <li className="py-3 text-[14px] text-graphite">Nothing certified yet. The first certification is the rules lock.</li>}</ul>
          <p className="mt-6 text-[13px] leading-relaxed text-slate">How you hear about changes: every registrant receives a mandatory notice in their account and by email when a round opens, results are certified, or the schedule is re-administered under Rules 8.8. There are no countdowns and no reminders to hurry; the dates are the dates.</p>
        </div>
      </div>
    </Container>
  );
}
