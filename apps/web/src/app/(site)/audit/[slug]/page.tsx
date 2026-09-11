import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Plate, SectionHeading } from '@/components/ui/Plate';
import { Stat } from '@/components/ui/Stat';
import { Hash } from '@/components/ui/Hash';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Table, Td, Tr } from '@/components/ui/Table';
import { Seal } from '@/components/ui/Seal';
import { getOpenBySlug } from '@/modules/meritopens/queries';
import { buildAuditSummary } from '@/modules/audit/summary';
import { certLabel, fmtDateTime, roundLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AuditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const open = await getOpenBySlug(slug);
  if (!open) notFound();
  const s = await buildAuditSummary(open);
  return (
    <Container className="py-16">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <SectionHeading label="Public audit summary" title={open.name} lede={<>Generated from the record on request. Rules hash <Hash value={s.rulesHash} short />. <Link href={`/opens/${slug}`} className="link-rule">Merit Open page →</Link></>} />
        <div className="flex items-center gap-4 text-brass"><StatusBadge status={open.status} /><Seal size={96} /></div>
      </div>

      <div className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Completed registrations" value={s.registrations.toLocaleString()} />
        <Stat label="States represented" value={Object.keys(s.byState).length} hint={Object.entries(s.byState).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')} />
        <Stat label="Integrity flags" value={s.flags.reduce((n, f) => n + f.count, 0)} hint={s.flags.map((f) => `${f.type.replace(/_/g, ' ')}: ${f.count} ${f.status}`).join(' · ') || 'none'} />
        <Stat label="Certified result" value={s.winner ? (s.winner.score ?? '—') : '—'} hint={s.winner ? (s.winner.name ? `${s.winner.name}${s.winner.city ? `, ${s.winner.city}` : ''}` : 'Name withheld (no consent on file)') : 'Not yet certified'} />
      </div>

      <h2 className="plate mt-14">Rounds</h2>
      <Table className="mt-4" head={['Round', 'Status', 'Attempts', 'Scored', 'Advanced', 'Inclusion rule', 'Package hash', 'Certified']}>
        {s.rounds.map((r) => (
          <Tr key={r.number}><Td>{roundLabel(r.number)}</Td><Td><StatusBadge status={r.status} /></Td><Td mono>{r.attempts}</Td><Td mono>{r.scored}</Td><Td mono>{r.advanced}</Td><Td>{r.inclusionRuleApplied ? <Badge tone="brass">applied</Badge> : <span className="text-graphite">—</span>}</Td><Td><Hash value={r.packageHash} short />{r.released && <Badge tone="verify" className="ml-2">released</Badge>}</Td><Td>{fmtDateTime(r.certifiedAt)}</Td></Tr>
        ))}
      </Table>

      <div className="mt-14 grid gap-12 md:grid-cols-2">
        <div>
          <Plate>Integrity flags and dispositions</Plate>
          <Table className="mt-4" dense head={['Type', 'Status', 'Count']}>
            {s.flags.map((f, i) => <Tr key={i}><Td>{f.type.replace(/_/g, ' ')}</Td><Td><StatusBadge status={f.status} /></Td><Td mono>{f.count}</Td></Tr>)}
            {!s.flags.length && <Tr><Td className="text-graphite">None raised.</Td><Td>{''}</Td><Td>{''}</Td></Tr>}
          </Table>
        </div>
        <div>
          <Plate>Disputes</Plate>
          <Table className="mt-4" dense head={['Type', 'Status', 'Count']}>
            {s.disputes.map((d, i) => <Tr key={i}><Td>{d.type.replace(/_/g, ' ')}</Td><Td><StatusBadge status={d.status} /></Td><Td mono>{d.count}</Td></Tr>)}
            {!s.disputes.length && <Tr><Td className="text-graphite">None filed.</Td><Td>{''}</Td><Td>{''}</Td></Tr>}
          </Table>
        </div>
      </div>

      <h2 className="plate mt-14">Certifications</h2>
      <Table className="mt-4" dense head={['Type', 'Document hash', 'Signed']}>
        {s.certifications.map((c, i) => <Tr key={i}><Td><Badge>{certLabel(c.type)}</Badge></Td><Td><Hash value={c.hash} /></Td><Td>{fmtDateTime(c.signedAt)}</Td></Tr>)}
      </Table>

      {s.cancellation && (
        <div className="mt-14 rounded-sm border border-clay/40 bg-clay-2/60 p-5 text-clay"><div className="plate text-clay">Cancellation notice · Rules {s.cancellation.code}</div><p className="mt-2 text-[15px]">{s.cancellation.note}</p><p className="mt-1 text-[13px]">{fmtDateTime(s.cancellation.at)} · All registration fees refunded in full including processing fees.</p></div>
      )}
    </Container>
  );
}
