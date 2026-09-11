import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rankStandings, selectAdvancing, selectFinalLeaders, type RoundStanding } from '../src';

const here = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(join(here, 'golden/advancement.json'), 'utf8')) as {
  cases: { name: string; capacity: number; rows: RoundStanding[]; expect: { advancing: string[]; inclusionRuleApplied: boolean; cutoffRank: number | null; tiedAtCutoff: number } }[];
};

describe('advancement golden cases (Rules 5.2, 5.3)', () => {
  for (const c of golden.cases) {
    it(c.name, () => {
      const r = selectAdvancing(c.rows, c.capacity);
      const advancing = r.decisions.filter((d) => d.advanced).map((d) => d.registrationId);
      expect(advancing).toEqual(c.expect.advancing);
      expect(r.inclusionRuleApplied).toBe(c.expect.inclusionRuleApplied);
      expect(r.cutoffRank).toBe(c.expect.cutoffRank);
      expect(r.tiedAtCutoff).toBe(c.expect.tiedAtCutoff);
    });
  }

  it('is order-independent (replayable from the Score table in any row order)', () => {
    for (const c of golden.cases) {
      const reversed = [...c.rows].reverse();
      const a = selectAdvancing(c.rows, c.capacity);
      const b = selectAdvancing(reversed, c.capacity);
      expect(b).toEqual(a);
    }
  });

  it('assigns competition ranks (1,1,3)', () => {
    const ranked = rankStandings([
      { registrationId: 'x', totalPoints: 5, tieOrderPoints: 1, elapsedSeconds: 10 },
      { registrationId: 'y', totalPoints: 5, tieOrderPoints: 1, elapsedSeconds: 10 },
      { registrationId: 'z', totalPoints: 4, tieOrderPoints: 1, elapsedSeconds: 10 },
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it('capacity zero advances nobody', () => {
    const r = selectAdvancing([{ registrationId: 'a', totalPoints: 1, tieOrderPoints: 0, elapsedSeconds: 1 }], 0);
    expect(r.advancingCount).toBe(0);
  });
});

describe('final (Rules 5.4, 5.5)', () => {
  it('highest valid score leads; invalid submissions are unranked', () => {
    const r = selectFinalLeaders([
      { registrationId: 'a', score: 162000, valid: true },
      { registrationId: 'b', score: 170000, valid: false },
      { registrationId: 'c', score: 150000, valid: true },
    ]);
    expect(r.leaders).toEqual(['a']);
    expect(r.tied).toBe(false);
    expect(r.ranked.find((x) => x.registrationId === 'b')?.rank).toBeNull();
  });

  it('exact tie at full precision requires a tie-break, never a draw', () => {
    const r = selectFinalLeaders([
      { registrationId: 'a', score: 162000.000001, valid: true },
      { registrationId: 'b', score: 162000.000001, valid: true },
    ]);
    expect(r.tied).toBe(true);
    expect(r.leaders.sort()).toEqual(['a', 'b']);
  });
});
