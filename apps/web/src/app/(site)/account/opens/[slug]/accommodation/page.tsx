import { Container } from '@/components/ui/Container';
import { Plate } from '@/components/ui/Plate';
import { Button } from '@/components/ui/Button';
import { FieldRow, Textarea } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { requireSession } from '@/lib/auth/guards';
import { requestAccommodationAction } from '@/modules/accounts/accommodation';

export const dynamic = 'force-dynamic';

export default async function AccommodationPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params; const sp = await searchParams;
  await requireSession(`/account/opens/${slug}/accommodation`);
  return (
    <Container className="max-w-2xl py-16">
      <Plate>Accommodation · Rules 8.7</Plate>
      <h1 className="font-display mt-4 text-[38px] leading-tight">Request an accommodation.</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-slate">Extended time, screen-reader compatibility, or alternative input are provided where reasonable. Accommodations never alter the items, the answer key, or the scoring formulas, and decisions are never made on the basis of any score. Requests are due no later than the deadline in the Official Rules.</p>
      {sp.done && <Notice className="mt-6" tone="verify" title="Received">Your request is with the Administrator. You will be notified of the decision and it will appear in your account.</Notice>}
      <form action={requestAccommodationAction} className="mt-8 space-y-5">
        <input type="hidden" name="openSlug" value={slug} />
        <FieldRow label="What do you need?" htmlFor="request"><Textarea id="request" name="request" required minLength={10} /></FieldRow>
        <Button type="submit" size="lg">Submit request</Button>
      </form>
    </Container>
  );
}
