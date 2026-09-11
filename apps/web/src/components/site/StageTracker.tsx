import Link from 'next/link';
import type { OpenFull } from '@/modules/meritopens/queries';
import { fmtDate, fmtDateTime, roundLabel } from '@/lib/format';

export interface StageCounts { registrations?: number; reservations?: number; r1Passed?: number; r2Advanced?: number; r3Advanced?: number; certified?: boolean }
export interface MyStage { registered: boolean; status?: string; rounds: Record<string, { attempt?: string; advanced?: boolean; rank?: number | null; pass?: boolean | null; reason?: string }>; }

const ORDER = ['reservation', 'registration', 'r1', 'r2', 'r3', 'final', 'tiebreak', 'certification', 'closing', 'complete'] as const;
type Stage = (typeof ORDER)[number];

/**
 * Where the event stands: every stage in order with its dates, the current stage marked,
 * public counts where they exist, and, for a signed-in registrant, their own line per stage.
 */
export function StageTracker({ open, counts, mine, dark = false, compact = false }: { open: OpenFull; counts?: StageCounts; mine?: MyStage | null; dark?: boolean; compact?: boolean }) {
  const cancelled = open.status === 'cancelled';
  const current = (cancelled ? 'complete' : open.status) as Stage;
  const currentIdx = ORDER.indexOf(current);
  const rounds = Object.fromEntries(open.rounds.map((r) => [r.number, r]));
  const hasTiebreak = open.rounds.some((r) => r.number.startsWith('tiebreak') && r.status !== 'scheduled') || open.status === 'tiebreak';
  const stages = ORDER.filter((s) => (s === 'reservation' ? open.reservationTarget !== null || open.status === 'reservation' : s === 'tiebreak' ? hasTiebreak : s === 'r3' || s === 'final' ? !!rounds[s] : true));
  const when = (s: Stage): string => {
    if (s === 'registration') return open.registrationOpenAt ? `${fmtDate(open.registrationOpenAt)} → ${fmtDateTime(open.registrationCloseAt)}` : '[dates at lock]';
    if (s === 'r1' || s === 'r2') { const r = rounds[s]; return r?.windowStart ? `${fmtDateTime(r.windowStart)} → ${fmtDateTime(r.windowEnd)}` : '[window at lock]'; }
    if (s === 'r3' || s === 'final') { const r = rounds[s]; return r?.scheduledAt ? fmtDateTime(r.scheduledAt) : '[time at lock]'; }
    if (s === 'tiebreak') return 'Only if the Final ends in an exact tie';
    if (s === 'certification') return 'Identity re-verification, affidavit, acceptance';
    if (s === 'closing') return 'Conventional closing through the title company';
    if (s === 'complete') return open.closedAt ? fmtDate(open.closedAt) : 'Packages released; audit summary published';
    return 'Free, non-binding list';
  };
  const label = (s: Stage) => s === 'reservation' ? 'Reservation list' : s === 'registration' ? 'Registration' : s === 'r1' || s === 'r2' || s === 'r3' || s === 'final' ? roundLabel(s) : s === 'tiebreak' ? 'Tie-break' : s === 'certification' ? 'Result certified' : s === 'closing' ? 'Closing' : 'Complete';
  const count = (s: Stage) => {
    if (!counts) return null;
    if (s === 'reservation' && counts.reservations !== undefined) return `${counts.reservations.toLocaleString()} on the list`;
    if (s === 'registration' && counts.registrations !== undefined) return `${counts.registrations.toLocaleString()} registered`;
    if (s === 'r1' && counts.r1Passed !== undefined) return `${counts.r1Passed.toLocaleString()} qualified`;
    if (s === 'r2' && counts.r2Advanced !== undefined) return `${counts.r2Advanced.toLocaleString()} advanced`;
    if (s === 'r3' && counts.r3Advanced !== undefined) return `${counts.r3Advanced.toLocaleString()} advanced`;
    if (s === 'certification' && counts.certified) return 'certified';
    return null;
  };
  const mineLine = (s: Stage): { text: string; tone: 'ok' | 'out' | 'wait' } | null => {
    if (!mine) return null;
    if (s === 'registration') return mine.registered ? { text: mine.status === 'confirmed' ? 'You are registered' : `Your registration is ${mine.status}`, tone: mine.status === 'confirmed' ? 'ok' : 'out' } : { text: 'Not registered', tone: 'wait' };
    const r = mine.rounds[s === 'tiebreak' ? 'tiebreak_1' : s];
    if (!r) return null;
    if (r.advanced === true) return { text: s === 'r1' ? 'Qualified' : `Advanced${r.rank ? ` · rank ${r.rank}` : ''}`, tone: 'ok' };
    if (r.advanced === false) return { text: s === 'r1' ? 'Did not qualify' : 'Did not advance', tone: 'out' };
    if (r.attempt === 'submitted') return { text: 'Submitted · awaiting certification', tone: 'wait' };
    if (r.attempt === 'expired' || r.attempt === 'voided') return { text: `Attempt ${r.attempt}`, tone: 'out' };
    return null;
  };
  const c = dark ? { line: 'border-paper/20', text: 'text-parchment', dim: 'text-sage', ok: 'text-brass-2', out: 'text-clay-2', wait: 'text-mist' } : { line: 'border-ink/20', text: 'text-ink', dim: 'text-graphite', ok: 'text-verify', out: 'text-clay', wait: 'text-slate' };
  return (
    <ol className={`relative border-l ${c.line} pl-6`} aria-label="Event stages">
      {cancelled && <li className={`mb-4 text-[13px] ${c.out}`}>Cancelled under Rules {open.cancellationReasonCode}: all registration fees refunded in full.</li>}
      {stages.map((s) => {
        const idx = ORDER.indexOf(s); const state = cancelled ? 'done' : idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : 'next';
        const m = mineLine(s); const n = count(s);
        return (
          <li key={s} className={`relative ${compact ? 'pb-4' : 'pb-6'} last:pb-0`}>
            <span className={`absolute -left-[31px] top-1 size-[11px] rounded-full border-2 ${state === 'current' ? 'border-brass bg-brass' : state === 'done' ? (dark ? 'border-sage bg-sage' : 'border-ink bg-ink') : dark ? 'border-paper/40 bg-ink' : 'border-ink/40 bg-paper'}`} aria-hidden />
            <div className={`flex flex-wrap items-baseline gap-x-3 ${state === 'next' ? c.dim : c.text}`}><span className="text-[15px] font-medium">{label(s)}</span>{state === 'current' && <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-brass">now</span>}{n && <span className={`font-mono text-[11px] ${c.dim}`}>{n}</span>}</div>
            {!compact && <div className={`mt-0.5 text-[13px] ${c.dim}`}>{when(s)}</div>}
            {m && <div className={`mt-0.5 text-[13px] ${m.tone === 'ok' ? c.ok : m.tone === 'out' ? c.out : c.wait}`}>{m.text}</div>}
          </li>
        );
      })}
      {!compact && <li className={`pt-2 text-[12.5px] ${c.dim}`}>Certifications and released keys: <Link href="/registry" className="link-rule">registry</Link> · summary: <Link href={`/audit/${open.slug}`} className="link-rule">audit</Link></li>}
    </ol>
  );
}
