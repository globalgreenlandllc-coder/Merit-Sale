import { PageHead, ErrorBanner } from '@/components/console/ConsoleShell';
import { PropertyForm } from '@/components/console/PropertyForm';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (<><PageHead label="Properties" title="New property" /><ErrorBanner sp={sp} /><div className="mt-6"><PropertyForm p={null} /></div></>);
}
