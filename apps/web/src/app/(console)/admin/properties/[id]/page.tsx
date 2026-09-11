import { notFound } from 'next/navigation';
import { PageHead, ErrorBanner } from '@/components/console/ConsoleShell';
import { PropertyForm } from '@/components/console/PropertyForm';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams;
  const p = await db.property.findUnique({ where: { id } });
  if (!p) notFound();
  return (<><PageHead label="Properties" title={p.name} /><ErrorBanner sp={sp} /><div className="mt-6"><PropertyForm p={p} /></div></>);
}
