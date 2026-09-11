import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Field';
import { db } from '@/lib/db';
import { decideAccommodationAction } from '@/modules/administrator/actions';
import { fmtDateTime, fmtDuration } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const rows = await db.accommodation.findMany({ include: { user: true, meritOpen: true }, orderBy: [{ status: 'desc' }, { createdAt: 'desc' }] });
  return (<>
    <PageHead label="Accessibility" title="Accommodation requests (Rules 8.7)" />
    <ErrorBanner sp={sp} />
    <p className="mt-4 max-w-3xl text-[13.5px] text-slate">Extra time and assistive flags are applied by the test client without altering items, keys, or scoring. Decisions are never made on the basis of any score.</p>
    <div className="mt-6 space-y-4">
      {rows.map((a) => (
        <Card key={a.id}>
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><StatusBadge status={a.status} /><span className="text-[13.5px]">{a.user.legalName ?? a.user.email} · {a.meritOpen.name}</span></div><span className="font-mono text-[11.5px] text-graphite">{fmtDateTime(a.createdAt)}</span></div>
          <p className="mt-3 text-[14px]">{a.request}</p>
          {a.status === 'requested' ? (
            <form action={decideAccommodationAction} className="mt-3 grid gap-2 sm:grid-cols-[8rem_1fr_1fr_auto_auto]"><input type="hidden" name="accommodationId" value={a.id} />
              <Input name="extraTimeSeconds" type="number" placeholder="Extra seconds" /><Input name="assistiveFlags" placeholder="flags: screen_reader, large_text" /><Input name="decision" placeholder="Written decision" required />
              <Button type="submit" name="status" value="granted" size="sm">Grant</Button><Button type="submit" name="status" value="denied" size="sm" variant="secondary">Deny</Button></form>
          ) : <p className="mt-2 text-[13px] text-slate">{a.decision}{a.status === 'granted' ? ` · +${fmtDuration(a.extraTimeSeconds)}` : ''}</p>}
        </Card>
      ))}
      {!rows.length && <p className="text-slate">No requests.</p>}
    </div>
  </>);
}
