import { PageHead, ErrorBanner } from '@/components/console/ConsoleShell';
import { OpenForm } from '@/components/console/OpenForm';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const properties = await db.property.findMany({ orderBy: { name: 'asc' } });
  return (<><PageHead label="Merit Opens" title="New Merit Open" /><ErrorBanner sp={sp} /><div className="mt-6"><OpenForm o={null} properties={properties} /></div></>);
}
