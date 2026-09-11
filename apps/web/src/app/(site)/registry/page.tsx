import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeading, Plate } from '@/components/ui/Plate';
import { Hash } from '@/components/ui/Hash';
import { Badge } from '@/components/ui/Badge';
import { Table, Td, Tr } from '@/components/ui/Table';
import { db } from '@/lib/db';
import { certLabel, fmtDateTime } from '@/lib/format';
import { HashVerifier } from '@/components/site/HashVerifier';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Hash registry' };

export default async function RegistryPage() {
  const [forms, opens, certs] = await Promise.all([
    db.form.findMany({ where: { hashPublishedAt: { not: null } }, include: { meritOpen: { select: { name: true, slug: true } } }, orderBy: [{ hashPublishedAt: 'desc' }] }),
    db.meritOpen.findMany({ where: { rulesHash: { not: null } }, select: { name: true, slug: true, rulesVersion: true, rulesHash: true, lockedAt: true } }),
    db.certification.findMany({ include: { meritOpen: { select: { name: true, slug: true } } }, orderBy: { signedAt: 'desc' } }),
  ]);
  return (
    <Container className="py-16">
      <SectionHeading label="Hash registry" title="Commit before, release after." lede="Before each round opens, the Administrator publishes a SHA-256 hash of the sealed package (items, answer keys, scoring formulas). After scores are certified and the dispute window closes, the exact bytes are released here. Anyone can verify that the keys used for scoring are the keys committed before the round." />

      <div className="mt-10 grid gap-8 rounded-md border hair bg-parchment/60 p-6 md:grid-cols-[1fr_1.4fr]">
        <div><Plate>Verify it yourself</Plate><p className="mt-3 text-[14px] leading-relaxed text-slate">Download a released package and hash the file. The output must equal the published hash character for character.</p></div>
        <pre className="overflow-x-auto rounded-sm bg-ink p-4 font-mono text-[12.5px] leading-6 text-parchment"><code>{`# macOS / Linux
shasum -a 256 package.json        # or: sha256sum package.json
# Windows PowerShell
Get-FileHash package.json -Algorithm SHA256`}</code></pre>
      </div>

      <div className="mt-8"><HashVerifier published={[...forms.filter((f) => f.packageHash).map((f) => ({ label: `${f.meritOpen.name} · ${f.roundNumber} · ${f.label}`, hash: f.packageHash! })), ...opens.map((o) => ({ label: `${o.name} · Official Rules v${o.rulesVersion}`, hash: o.rulesHash! })), ...certs.map((c) => ({ label: `${c.meritOpen.name} · ${certLabel(c.type)}`, hash: c.hash }))]} /></div>

      <h2 className="plate mt-16">Sealed packages</h2>
      <Table className="mt-4" head={['Merit Open', 'Round', 'Form', 'SHA-256', 'Committed', 'Release']}>
        {forms.map((f) => (
          <Tr key={f.id}>
            <Td><Link href={`/opens/${f.meritOpen.slug}`} className="link-rule">{f.meritOpen.name}</Link></Td>
            <Td mono>{f.roundNumber}</Td>
            <Td><Badge tone={f.label === 'primary' ? 'ink' : 'neutral'}>{f.label}</Badge></Td>
            <Td><Hash value={f.packageHash} /></Td>
            <Td>{fmtDateTime(f.hashPublishedAt)}</Td>
            <Td>{f.packageReleasedAt ? <a className="link-rule" href={`/api/registry/${f.id}/package`}>Download · {fmtDateTime(f.packageReleasedAt)}</a> : <span className="text-graphite">sealed</span>}</Td>
          </Tr>
        ))}
        {!forms.length && <Tr><Td className="text-graphite">No hashes published yet.</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td></Tr>}
      </Table>

      <h2 className="plate mt-16">Locked rulesets</h2>
      <Table className="mt-4" head={['Merit Open', 'Version', 'SHA-256', 'Locked']}>
        {opens.map((o) => (
          <Tr key={o.slug}><Td><Link href={`/opens/${o.slug}/rules`} className="link-rule">{o.name}</Link></Td><Td mono>{o.rulesVersion}</Td><Td><Hash value={o.rulesHash} /></Td><Td>{fmtDateTime(o.lockedAt)}</Td></Tr>
        ))}
      </Table>

      <h2 className="plate mt-16">Certifications</h2>
      <Table className="mt-4" head={['Merit Open', 'Type', 'Document hash', 'Signed']}>
        {certs.map((c) => (
          <Tr key={c.id}><Td><Link href={`/audit/${c.meritOpen.slug}`} className="link-rule">{c.meritOpen.name}</Link></Td><Td><Badge>{certLabel(c.type)}</Badge></Td><Td><Hash value={c.hash} /></Td><Td>{fmtDateTime(c.signedAt)}</Td></Tr>
        ))}
      </Table>
    </Container>
  );
}
