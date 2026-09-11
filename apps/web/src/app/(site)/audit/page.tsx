import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/Plate';
import { StatusBadge } from '@/components/ui/Badge';
import { listOpens } from '@/modules/meritopens/queries';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Public audit summaries' };

export default async function AuditIndex() {
  const opens = await listOpens();
  return (
    <Container className="py-16">
      <SectionHeading label="Public audit summaries" title="One per Merit Open. Generated from the record." lede="Registrations by state, advancing counts per round, integrity flags and their dispositions, the certified result, and every hash. Nothing on these pages is typed in by hand." />
      <ul className="mt-10 border-t hair">
        {opens.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b hair py-4">
            <div><Link href={`/audit/${o.slug}`} className="font-display text-[22px] link-rule">{o.name}</Link><div className="mt-1 text-[13px] text-graphite">{o.closedAt ? `Closed ${fmtDate(o.closedAt)}` : 'In progress — summary updates live'}</div></div>
            <StatusBadge status={o.status} />
          </li>
        ))}
      </ul>
    </Container>
  );
}
