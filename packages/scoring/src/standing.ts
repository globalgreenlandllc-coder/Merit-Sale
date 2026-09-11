import type { ScoringSpec } from './types';
import { scoreItem } from './score';
import { roundTo } from './normalize';

export interface FormItemKey {
  itemId: string;
  position: number;
  spec: ScoringSpec;
  tieOrderFlag: boolean;
}

export interface AttemptResponses {
  registrationId: string;
  /** itemId → raw answer */
  answers: Record<string, unknown>;
  /** seconds from first-item render to final submission */
  elapsedSeconds: number;
}

export interface ScoredAttempt {
  registrationId: string;
  totalPoints: number;
  tieOrderPoints: number;
  elapsedSeconds: number;
  perItem: Record<string, { points: number; valid: boolean; canonical: string | null }>;
}

/** Score every item of a form for one attempt and roll up totals. Pure. */
export function scoreAttempt(form: readonly FormItemKey[], attempt: AttemptResponses): ScoredAttempt {
  let total = 0;
  let tieOrder = 0;
  const perItem: ScoredAttempt['perItem'] = {};
  for (const item of form) {
    const r = scoreItem(item.spec, attempt.answers[item.itemId]);
    perItem[item.itemId] = { points: r.points, valid: r.valid, canonical: r.canonical };
    total += r.points;
    if (item.tieOrderFlag) tieOrder += r.points;
  }
  return {
    registrationId: attempt.registrationId,
    totalPoints: roundTo(total, 6),
    tieOrderPoints: roundTo(tieOrder, 6),
    elapsedSeconds: attempt.elapsedSeconds,
    perItem,
  };
}
