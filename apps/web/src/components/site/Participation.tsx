import type { OpenFull } from '@/modules/meritopens/queries';

export interface ParticipationCounts { reservations: number; registrations: number }

/**
 * Participation as a neutral figure: the current count against the stated pro forma target for
 * the stage the event is in. Never a condition, never a countdown: the Merit Open runs on its
 * published dates regardless of the count (Rules 12.2).
 */
export function participation(open: OpenFull, counts: ParticipationCounts) {
  const reservationPhase = open.status === 'reservation' || open.status === 'draft';
  const now = reservationPhase ? counts.reservations : counts.registrations;
  const target = reservationPhase ? open.reservationTarget : (open.registrationTarget ?? open.reservationTarget);
  const label = reservationPhase ? 'On the reservation list' : 'Registered';
  const pct = target ? Math.min(100, Math.round((now / target) * 100)) : null;
  return { now, target, label, pct, show: open.showReservationCount };
}

export function ParticipationMeter({ open, counts, dark = false, compact = false }: { open: OpenFull; counts: ParticipationCounts; dark?: boolean; compact?: boolean }) {
  const p = participation(open, counts);
  if (!p.show) return null;
  const text = dark ? 'text-parchment' : 'text-ink'; const dim = dark ? 'text-sage' : 'text-graphite'; const track = dark ? 'bg-paper/15' : 'bg-linen';
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className={dark ? 'plate-dark' : 'plate'}>{p.label}</span>
        <span className={`font-display tabular text-[22px] leading-none ${text}`}>{p.now.toLocaleString()}{p.target ? <span className={`font-sans text-[13px] ${dim}`}> of {p.target.toLocaleString()} target</span> : null}</span>
      </div>
      {p.pct !== null && <div className={`mt-2 h-1 w-full overflow-hidden rounded-full ${track}`} role="meter" aria-valuemin={0} aria-valuemax={p.target ?? 0} aria-valuenow={p.now} aria-label={`${p.label}: ${p.now} of ${p.target} target`}><div className="h-full bg-brass" style={{ width: `${p.pct}%` }} /></div>}
      {!compact && <p className={`mt-2 text-[12px] leading-relaxed ${dim}`}>{open.isPractice ? 'Practice events run on their dates regardless of the count.' : 'A pro forma target, not a condition. The Merit Open is held on the published dates regardless of the number of registrants (Rules 12.2).'}{!open.isPractice && ` Top ${open.advanceN.toLocaleString()} advance from Round 2; top ${open.advanceM.toLocaleString()} from Round 3.`}</p>}
    </div>
  );
}
