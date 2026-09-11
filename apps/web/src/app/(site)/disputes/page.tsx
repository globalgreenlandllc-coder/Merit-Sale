import { LegalPage } from '@/components/site/LegalPage';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dispute procedure' };
export default function Page() { return <LegalPage settingKey="legal.disputes" title="Dispute procedure (Exhibit E)" fallback="[Exhibit E — Integrity review, technical-failure verification, and dispute procedure — pending counsel.]" />; }
