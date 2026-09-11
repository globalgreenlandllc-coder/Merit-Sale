import type { ReactNode } from 'react';

type Tone = 'neutral' | 'verify' | 'brass' | 'clay' | 'amber' | 'ink';
const tones: Record<Tone, string> = {
  neutral: 'bg-linen text-slate',
  verify: 'bg-verify-2 text-verify',
  brass: 'bg-brass-3 text-amber',
  clay: 'bg-clay-2 text-clay',
  amber: 'bg-amber-2 text-amber',
  ink: 'bg-ink text-parchment',
};

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-xs px-2 py-[3px] font-mono text-[10.5px] uppercase tracking-[0.14em] ${tones[tone]} ${className}`}>{children}</span>;
}

export function statusTone(status: string): Tone {
  if (['confirmed', 'certified', 'complete', 'verified', 'settled', 'cleared', 'granted', 'owned', 'passed', 'advanced', 'released', 'completed'].includes(status)) return 'verify';
  if (['disqualified', 'cancelled', 'chargeback', 'upheld', 'failed', 'voided', 'expired', 'denied', 'hit'].includes(status)) return 'clay';
  if (['pending', 'open', 'requested', 'scoring', 'in_progress', 'queued', 'under_option', 'under_contract', 'authorized', 'manual'].includes(status)) return 'amber';
  if (['registration', 'r1', 'r2', 'r3', 'final', 'tiebreak', 'certification', 'closing', 'live'].includes(status)) return 'brass';
  return 'neutral';
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{status.replace(/_/g, ' ')}</Badge>;
}
