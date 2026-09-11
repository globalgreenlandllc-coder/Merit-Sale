import { Container } from '@/components/ui/Container';
import { Plate } from '@/components/ui/Plate';
import { Badge } from '@/components/ui/Badge';
import { RulesText } from './RulesText';
import { db } from '@/lib/db';
import { safeJson } from '@/lib/format';

export async function LegalPage({ settingKey, title, fallback }: { settingKey: string; title: string; fallback: string }) {
  const row = await db.siteSetting.findUnique({ where: { key: settingKey } });
  const doc = safeJson<{ version?: string; text?: string; status?: string }>(row?.valueJson, {});
  return (
    <Container className="grid gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Plate>Legal</Plate>
        <h1 className="font-display mt-4 text-[34px] leading-tight">{title}</h1>
        <div className="mt-3 flex gap-2"><Badge tone={doc.status === 'approved' ? 'verify' : 'amber'}>{doc.status ?? 'draft for counsel'}</Badge>{doc.version && <Badge>v{doc.version}</Badge>}</div>
        <p className="mt-6 text-[13.5px] leading-relaxed text-graphite">Bracketed items are placeholders or decisions pending counsel. Text is versioned; the version accepted at registration is recorded on each registration.</p>
      </aside>
      <article><RulesText text={doc.text ?? fallback} /></article>
    </Container>
  );
}
