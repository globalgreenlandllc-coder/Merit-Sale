import { LegalPage } from '@/components/site/LegalPage';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Terms of Service' };
export default function Page() { return <LegalPage settingKey="legal.terms" title="Platform Terms of Service" fallback="[Terms of Service draft not loaded. Run the seed or paste the counsel draft into Site settings.]" />; }
