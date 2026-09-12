import { notFound } from 'next/navigation';
import { PageHead, ErrorBanner } from '@/components/console/ConsoleShell';
import { PropertyForm } from '@/components/console/PropertyForm';
import { db } from '@/lib/db';
import { PhotoManager } from '@/components/console/PhotoManager';
import { Card } from '@/components/console/ConsoleShell';
import { safeJson } from '@/lib/format';
import type { PropertyPhoto } from '@/lib/photos';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams;
  const p = await db.property.findUnique({ where: { id } });
  if (!p) notFound();
  return (<><PageHead label="Properties" title={p.name} /><ErrorBanner sp={sp} />
    <Card className="mt-6" title="Photography"><PhotoManager propertyId={p.id} photos={safeJson<PropertyPhoto[]>(p.photosJson, [])} /></Card>
    <Card className="mt-6" title="Details"><PropertyForm p={p} /></Card></>);
}
