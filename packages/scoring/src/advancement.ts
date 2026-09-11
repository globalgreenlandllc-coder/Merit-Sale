/**
 * Advancement (Rules 5.2, 5.3). Deterministic and replayable from the Score table.
 * There is no randomness in this file and none may be added: when a tie straddles
 * the cutoff, everyone tied at that position advances (inclusion rule).
 */
export interface RoundStanding {
  registrationId: string;
  totalPoints: number;
  tieOrderPoints: number;
  elapsedSeconds: number;
}

export interface RankedStanding extends RoundStanding {
  /** competition ranking: identical standings share a rank; next rank skips */
  rank: number;
}

export type AdvancementReason = 'score' | 'inclusion_rule' | 'below_cutoff';

export interface AdvancementDecision extends RankedStanding {
  advanced: boolean;
  reason: AdvancementReason;
}

export interface AdvancementResult {
  capacity: number;
  decisions: AdvancementDecision[];
  advancingCount: number;
  inclusionRuleApplied: boolean;
  /** rank of the last advancing group, or null when nobody advanced */
  cutoffRank: number | null;
  /** size of the group tied at the cutoff when the inclusion rule fired */
  tiedAtCutoff: number;
}

/** (a) total desc, (b) tie-order subset desc, (c) elapsed asc. 0 when identical on all three. */
export function compareStandings(a: RoundStanding, b: RoundStanding): number {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  if (b.tieOrderPoints !== a.tieOrderPoints) return b.tieOrderPoints - a.tieOrderPoints;
  if (a.elapsedSeconds !== b.elapsedSeconds) return a.elapsedSeconds - b.elapsedSeconds;
  return 0;
}

/** Sorted standings with competition ranks. Display order inside a tie is by id (never affects advancement). */
export function rankStandings(rows: readonly RoundStanding[]): RankedStanding[] {
  const sorted = [...rows].sort((a, b) => compareStandings(a, b) || a.registrationId.localeCompare(b.registrationId));
  let rank = 0;
  return sorted.map((row, i) => {
    const prev = sorted[i - 1];
    if (i === 0 || (prev && compareStandings(prev, row) !== 0)) rank = i + 1;
    return { ...row, rank };
  });
}

export function selectAdvancing(rows: readonly RoundStanding[], capacity: number): AdvancementResult {
  const ranked = rankStandings(rows);
  const decisions: AdvancementDecision[] = [];
  let count = 0;
  let closed = capacity <= 0;
  let inclusionRuleApplied = false;
  let cutoffRank: number | null = null;
  let tiedAtCutoff = 0;

  let i = 0;
  while (i < ranked.length) {
    const head = ranked[i]!;
    let j = i;
    while (j < ranked.length && ranked[j]!.rank === head.rank) j++;
    const group = ranked.slice(i, j);

    if (closed) {
      for (const g of group) decisions.push({ ...g, advanced: false, reason: 'below_cutoff' });
    } else {
      const remaining = capacity - count;
      if (group.length <= remaining) {
        for (const g of group) decisions.push({ ...g, advanced: true, reason: 'score' });
        count += group.length;
        if (count === capacity) { closed = true; cutoffRank = head.rank; }
      } else {
        // The tie group straddles the cutoff: include the whole group (Rules 5.3).
        for (const g of group) decisions.push({ ...g, advanced: true, reason: 'inclusion_rule' });
        count += group.length;
        inclusionRuleApplied = true;
        tiedAtCutoff = group.length;
        cutoffRank = head.rank;
        closed = true;
      }
    }
    i = j;
  }

  return { capacity, decisions, advancingCount: count, inclusionRuleApplied, cutoffRank, tiedAtCutoff };
}

/* ---------- Final (Rules 5.4, 5.5) ---------- */

export interface FinalStanding {
  registrationId: string;
  score: number;
  valid: boolean;
}

export interface FinalResult {
  ranked: (FinalStanding & { rank: number | null })[];
  /** registrations sharing the highest valid score; length > 1 means a tie-break is required */
  leaders: string[];
  topScore: number | null;
  tied: boolean;
}

/** Highest valid score leads. Elapsed time is never an input here. */
export function selectFinalLeaders(rows: readonly FinalStanding[]): FinalResult {
  const valid = rows.filter((r) => r.valid).sort((a, b) => b.score - a.score || a.registrationId.localeCompare(b.registrationId));
  const invalid = rows.filter((r) => !r.valid).sort((a, b) => a.registrationId.localeCompare(b.registrationId));
  let rank = 0;
  const rankedValid = valid.map((r, i) => {
    const prev = valid[i - 1];
    if (i === 0 || (prev && prev.score !== r.score)) rank = i + 1;
    return { ...r, rank };
  });
  const topScore = rankedValid[0]?.score ?? null;
  const leaders = topScore === null ? [] : rankedValid.filter((r) => r.score === topScore).map((r) => r.registrationId);
  return {
    ranked: [...rankedValid, ...invalid.map((r) => ({ ...r, rank: null }))],
    leaders,
    topScore,
    tied: leaders.length > 1,
  };
}
