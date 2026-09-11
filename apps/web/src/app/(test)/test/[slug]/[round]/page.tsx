import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getRoundContext } from '@/modules/rounds/service';
import { startAttemptAction } from '@/modules/rounds/actions';
import { RoundRunner } from '@/components/test/RoundRunner';
import { Fingerprint } from '@/components/test/Fingerprint';
import { fmtDateTime, fmtDuration, roundLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TestPage({ params, searchParams }: { params: Promise<{ slug: string; round: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug, round } = await params; const sp = await searchParams;
  const s = await getSession();
  const ctx = await getRoundContext(slug, round, s?.userId ?? null);
  if (!ctx) notFound();
  const { open, round: rd, gate, attempt } = ctx;
  const label = `${open.name} · ${roundLabel(rd.number)}`;

  if (gate.state === 'in_progress' && attempt) {
    return <RoundRunner attemptId={attempt.id} sessionToken={attempt.sessionToken} startedAt={attempt.startedAt.getTime()} expiresAt={attempt.expiresAt.getTime()} serverNow={ctx.serverNow} graceSeconds={rd.latencyGraceSeconds} items={ctx.items} roundLabel={roundLabel(rd.number)} single={ctx.items.length === 1} tier={rd.integrityTier} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="plate-dark">{label}</div>
      <h1 className="font-display mt-4 text-[40px] leading-tight">{gate.state === 'ready' ? 'Ready when you are.' : gate.state === 'submitted' ? 'Submitted.' : gate.state === 'not_signed_in' ? 'Sign in to continue.' : 'Not available.'}</h1>
      {sp.notice && <p className="mt-4 rounded-sm border border-amber/50 bg-amber/10 px-4 py-3 text-[14px] text-brass-3">{sp.notice}</p>}
      {gate.reason && <p className="mt-4 text-[16px] leading-relaxed text-mist">{gate.reason}</p>}

      {gate.state === 'ready' && (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-6 border-t hair-light pt-6">
            <div><dt className="plate-dark">Time limit</dt><dd className="font-display mt-1 text-[28px]">{fmtDuration(rd.durationSeconds + ctx.extraTimeSeconds)}{ctx.extraTimeSeconds ? <span className="ml-2 text-[13px] text-sage">incl. accommodation</span> : null}</dd></div>
            <div><dt className="plate-dark">Items</dt><dd className="font-display mt-1 text-[28px]">{rd.form?._count.items ?? '—'}</dd></div>
            <div><dt className="plate-dark">Window</dt><dd className="mt-1 text-[14px] text-mist">{rd.windowStart ? `${fmtDateTime(rd.windowStart)} – ${fmtDateTime(rd.windowEnd)}` : fmtDateTime(rd.scheduledAt)}</dd></div>
            <div><dt className="plate-dark">Committed key</dt><dd className="mt-1 font-mono text-[12px] text-mist break-all">{rd.form?.packageHash?.slice(0, 24)}…</dd></div>
          </dl>
          <ul className="mt-8 space-y-2 text-[14.5px] leading-relaxed text-mist">
            <li>· The clock starts when the first item renders, on the server. One attempt. No pausing.</li>
            <li>· Full-screen is required. Leaving the window, copy, paste, and right-click are logged{rd.integrityTier >= 2 ? '; this round is proctored on camera' : ''}.</li>
            <li>· No other people, devices, AI tools, or searches. Calculators only where an item says so.</li>
            <li>· Answers are typed. Blank or unreadable answers score zero.</li>
            <li>· Your own device or connection failing is not a platform failure (Rules 8.8).</li>
          </ul>
          <form action={startAttemptAction} className="mt-10">
            <input type="hidden" name="openSlug" value={slug} /><input type="hidden" name="roundNumber" value={round} /><Fingerprint />
            <button type="submit" className="h-13 rounded-sm bg-brass px-7 text-[15px] font-medium text-ink hover:bg-brass-2">Start {roundLabel(rd.number)} — the clock begins now</button>
          </form>
        </>
      )}
      {gate.state === 'not_signed_in' && <Link href={`/sign-in?next=/test/${slug}/${round}`} className="mt-8 inline-flex h-11 items-center rounded-sm bg-parchment px-5 text-ink">Sign in</Link>}
      {gate.state !== 'ready' && gate.state !== 'not_signed_in' && <Link href="/account" className="mt-8 inline-flex h-11 items-center rounded-sm border hair-light px-5 text-parchment">Back to your account</Link>}
    </div>
  );
}
