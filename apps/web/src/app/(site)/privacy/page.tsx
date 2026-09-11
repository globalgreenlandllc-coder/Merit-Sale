import { LegalPage } from '@/components/site/LegalPage';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Privacy Policy' };
export default function Page() { return <LegalPage settingKey="legal.privacy" title="Privacy Policy" fallback="[Privacy Policy pending counsel.]" />; }
