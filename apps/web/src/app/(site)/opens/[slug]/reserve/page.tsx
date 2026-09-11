import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Plate } from '@/components/ui/Plate';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Ledger } from '@/components/ui/Ledger';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getOpenBySlug, openCounts } from '@/modules/meritopens/queries';
import { reserveAction } from '@/modules/accounts/actions';

export const dynamic = 'force-dynamic';

export default async function ReservePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params; const sp = await searchParams;
  const open = await getOpenBySlug(slug);
  if (!open) notFound();
  const s = await getSession();
  const counts = await openCounts(open.id);
  const mine = s ? await db.reservation.findUnique({ where: { userId_meritOpenId: { userId: s.userId, meritOpenId: open.id } } }) : null;
  return (
    <Container className="max-w-2xl py-16">
      <Plate>Reservation list · free · non-binding</Plate>
      <h1 className="font-display mt-4 text-[40px] leading-tight">{open.name}</h1>
      <Notice className="mt-6" tone="info" title="What this is, and isn’t">This is a free, non-binding reservation. No prize is awarded at this stage. Paid registration opens only after the platform owns the home. Reservation holders get a {open.firstAccessHours}-hour first-access window before general opening.</Notice>
      <Ledger className="mt-8" rows={[
        { term: 'Property status', detail: `${open.property.titleStatus.replace(/_/g, ' ')} — ${open.property.address}, ${open.property.city}, ${open.property.state}` },
        { term: 'On the list', detail: open.showReservationCount ? `${counts.reservations.toLocaleString()}${open.reservationTarget ? ` of ${open.reservationTarget.toLocaleString()} target` : ''}` : 'count not shown' },
        { term: 'What we verify now', detail: 'Email, phone, date of birth, and state. Full identity verification happens at paid registration.' },
      ]} />
      <div className="mt-8">
        {open.status !== 'reservation' && <Notice tone="warn">The reservation phase for this Merit Open has ended.</Notice>}
        {open.status === 'reservation' && (mine || sp.done) && <Notice tone="verify" title="You’re on the list">We’ll notify you when the platform takes title and your first-access window opens.</Notice>}
        {open.status === 'reservation' && !mine && !sp.done && (s ? (
          <form action={reserveAction}><input type="hidden" name="openSlug" value={slug} /><Button type="submit" size="lg">Reserve my place — free</Button></form>
        ) : <ButtonLink href={`/sign-in?next=/opens/${slug}/reserve`} size="lg">Sign in to reserve</ButtonLink>)}
      </div>
    </Container>
  );
}
