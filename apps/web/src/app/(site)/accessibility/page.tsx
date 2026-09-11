import { LegalPage } from '@/components/site/LegalPage';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Accessibility' };
export default function Page() { return <LegalPage settingKey="legal.accessibility" title="Accessibility and accommodations" fallback="[Accessibility statement pending.]" />; }
