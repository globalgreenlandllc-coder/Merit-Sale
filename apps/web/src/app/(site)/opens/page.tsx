import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/Plate';
import { OpenCard } from '@/components/site/OpenCard';
import { listOpens } from '@/modules/meritopens/queries';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Merit Opens' };

export default async function OpensPage() {
  const opens = await listOpens();
  const live = opens.filter((o) => !['complete', 'cancelled'].includes(o.status));
  const past = opens.filter((o) => ['complete', 'cancelled'].includes(o.status));
  return (
    <Container className="py-16">
      <SectionHeading index="Index" label="Merit Opens" title="Every property event." lede="A Merit Open runs on its published schedule regardless of how many people register." />
      <div className="mt-12">{live.map((o) => <OpenCard key={o.id} open={o} />)}{!live.length && <p className="text-slate">Nothing is open right now.</p>}</div>
      {past.length > 0 && (<><h2 className="plate mt-16">Completed</h2><div className="mt-4">{past.map((o) => <OpenCard key={o.id} open={o} />)}</div></>)}
    </Container>
  );
}
