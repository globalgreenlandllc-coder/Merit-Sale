import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/Plate';
import { listOpens } from '@/modules/meritopens/queries';
import { Hash } from '@/components/ui/Hash';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Official Rules' };

export default async function RulesIndex() {
  const opens = await listOpens();
  return (
    <Container className="py-16">
      <SectionHeading label="Official Rules" title="Each Merit Open has its own locked rules." lede="Rules are locked before registration opens and cannot be changed afterward except by the correction workflow in Section 13, which notifies every registrant and publishes a new hash." />
      <ul className="mt-10 border-t hair">
        {opens.map((o) => (
          <li key={o.id} className="grid gap-2 border-b hair py-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div><Link href={`/opens/${o.slug}/rules`} className="font-display text-[22px] link-rule">{o.name}</Link><div className="mt-1 text-[13px] text-graphite">version {o.rulesVersion ?? 'draft'}</div></div>
            <Hash value={o.rulesHash} short />
          </li>
        ))}
      </ul>
    </Container>
  );
}
