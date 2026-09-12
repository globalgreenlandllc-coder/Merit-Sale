import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Wordmark } from './Wordmark';
import { Placeholder } from '@/components/ui/Placeholder';
import { site } from '@/lib/site';

const cols = [
  { title: 'The record', links: [['/registry', 'Hash registry'], ['/audit', 'Public audit summaries'], ['/custody', 'Custody of fees'], ['/opens', 'Merit Opens'], ['/practice', 'Practice problems']] },
  { title: 'The rules', links: [['/rules', 'Official Rules'], ['/terms', 'Terms of Service'], ['/privacy', 'Privacy Policy'], ['/accessibility', 'Accessibility'], ['/disputes', 'Dispute procedure']] },
  { title: 'People', links: [['/account', 'Your account'], ['/report', 'Report a concern'], ['/sign-in', 'Sign in']] },
];

export function SiteFooter() {
  return (
    <footer className="grain grain-dark mt-24 border-t border-ink bg-ink text-parchment">
      <Container className="relative z-[2] py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark dark />
            <p className="mt-6 max-w-sm text-[14px] leading-relaxed text-mist">
              A merit sale is a way of selling a home where the buyer is chosen by objective skill instead of by price or by luck. One registration. One test. The highest score takes the keys.
            </p>
            <dl className="mt-8 space-y-1.5 text-[13px] text-sage">
              <div><span className="plate-dark mr-2">Entity</span><Placeholder dark>{site.legalEntity}</Placeholder></div>
              <div><span className="plate-dark mr-2">Address</span><Placeholder dark>{site.physicalAddress}</Placeholder></div>
              <div><span className="plate-dark mr-2">Registration</span><Placeholder dark>{site.stateRegistrationNumber}</Placeholder></div>
            </dl>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="plate-dark">{c.title}</div>
              <ul className="mt-4 space-y-2.5">
                {c.links.map(([href, label]) => (
                  <li key={href}><Link href={href!} className="text-[14px] text-mist transition hover:text-parchment">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 border-t hair-light pt-6 text-[12.5px] leading-relaxed text-sage">
          <p>{site.disclosureLine}</p>
          <p className="mt-2">{site.claimsLine}</p>
          <p className="mt-2 text-sage/80">Photographs are credited on each listing. Map tiles © Esri; OpenStreetMap fallback © OpenStreetMap contributors.</p>
        </div>
      </Container>
    </footer>
  );
}
