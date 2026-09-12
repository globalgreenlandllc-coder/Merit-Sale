import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/Plate';
import { Hash } from '@/components/ui/Hash';
import { PlainRules } from '@/components/site/PlainRules';
import { eligibleStates, featuredOpen, latestRuleset, listOpens, parseConfig } from '@/modules/meritopens/queries';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Official Rules' };

export default async function RulesIndex() {
  const [opens, featured] = await Promise.all([listOpens(), featuredOpen()]);
  return (
    <Container className="py-16">
      <SectionHeading label="Official Rules" title="Each Merit Open has its own locked rules." lede="Rules are locked before registration opens and cannot be changed afterward except by the correction workflow in Section 13, which notifies every registrant and publishes a new hash. Below: the rules of the current Merit Open in plain language, then every event’s full text." />
      {featured && <div className="mt-10"><div className="plate mb-4">{featured.name} · plain language</div><PlainRules open={featured} cfg={parseConfig(latestRuleset(featured))} states={eligibleStates(featured)} rulesHref={`/opens/${featured.slug}/rules`} /></div>}
      <h2 className="plate mt-16">Full text by event</h2>
      <ul className="mt-4 border-t hair">
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
