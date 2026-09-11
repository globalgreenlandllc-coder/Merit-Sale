import { describe, expect, it } from 'vitest';
import { maxPoints, normalizeDecimal, normalizeInteger, normalizeString, r1Pass, scoreAttempt, scoreItem, INPUT_TYPES } from '../src';

describe('normalisation', () => {
  it('integers', () => {
    expect(normalizeInteger(' 1,234 ')).toBe('1234');
    expect(normalizeInteger('0085')).toBe('85');
    expect(normalizeInteger('-0')).toBe('0');
    expect(normalizeInteger('12.0')).toBeNull();
    expect(normalizeInteger('abc')).toBeNull();
  });
  it('decimals', () => {
    expect(normalizeDecimal('3.750')).toBe('3.75');
    expect(normalizeDecimal('.5')).toBe('0.5');
    expect(normalizeDecimal('18.40')).toBe('18.4');
    expect(normalizeDecimal('1e3')).toBeNull();
  });
  it('strings', () => {
    expect(normalizeString('  Lars.  ')).toBe('lars');
    expect(normalizeString('West,  East')).toBe('west, east');
  });
});

describe('scoreItem', () => {
  it('exact string, case-insensitive', () => {
    expect(scoreItem({ kind: 'exact', answer: 'Lars', points: 1 }, 'lars ').points).toBe(1);
    expect(scoreItem({ kind: 'exact', answer: 'Lars', points: 1 }, 'Mira').points).toBe(0);
  });
  it('numeric exact vs tolerance', () => {
    expect(scoreItem({ kind: 'numeric', answer: 3.75, points: 1 }, '3.750').points).toBe(1);
    expect(scoreItem({ kind: 'numeric', answer: 3.75, points: 1 }, '3.8').points).toBe(0);
    expect(scoreItem({ kind: 'numeric', answer: 3.75, points: 1, tolerance: 0.05 }, '3.8').points).toBe(1);
    expect(scoreItem({ kind: 'numeric', answer: 85, points: 1 }, 'eighty-five')).toMatchObject({ points: 0, valid: false });
  });
  it('blank answers always score zero and are invalid (Rules 5.1)', () => {
    expect(scoreItem({ kind: 'numeric', answer: 0, points: 1 }, '')).toMatchObject({ points: 0, valid: false });
    expect(scoreItem({ kind: 'exact', answer: 'x', points: 1 }, '   ')).toMatchObject({ points: 0, valid: false });
  });
  it('ordering is all-or-nothing', () => {
    const spec = { kind: 'ordering' as const, answer: ['West', 'East', 'North', 'South'], points: 2 };
    expect(scoreItem(spec, 'west, east, north, south').points).toBe(2);
    expect(scoreItem(spec, 'West > East > South > North').points).toBe(0);
    expect(scoreItem(spec, 'West, East').valid).toBe(false);
  });
  it('assignment with optional partial credit', () => {
    const spec = { kind: 'assignment' as const, answer: { A: '2', B: '1', C: '3' }, points: 3, partialPerCorrect: 1 };
    expect(scoreItem(spec, 'A→2, B→1, C→3').points).toBe(3);
    expect(scoreItem(spec, 'A=2; B=3; C=1').points).toBe(1);
    expect(scoreItem(spec, 'A=2').valid).toBe(false);
  });
  it('multi-part partial credit', () => {
    const spec = {
      kind: 'parts' as const,
      parts: [
        { key: 'a', type: 'integer' as const, answer: 46, weight: 2 },
        { key: 'b', type: 'string_exact' as const, answer: 'B', weight: 1 },
        { key: 'c', type: 'decimal' as const, answer: 18.4, weight: 1.5 },
        { key: 'd', type: 'decimal' as const, answer: 55.2, weight: 1.5 },
      ],
    };
    expect(maxPoints(spec)).toBe(6);
    expect(scoreItem(spec, 'a=46, b=B, c=18.40, d=55.2').points).toBe(6);
    expect(scoreItem(spec, { a: '46', b: 'C', c: '18.4', d: '0' }).points).toBe(3.5);
  });
  it('optimisation: validity then exact objective', () => {
    const spec = {
      kind: 'optimization' as const,
      variables: ['x1', 'x2', 'x3', 'x4'],
      constraints: [
        { expr: { x1: 1, x2: 1, x3: 1, x4: 1 }, op: '<=' as const, rhs: 100000, label: 'budget' },
        { expr: { x1: 1 }, op: '<=' as const, rhs: 40000, label: 'x1 cap' },
        { expr: { x3: 1 }, op: '>=' as const, rhs: 10000, label: 'x3 floor' },
        { expr: { x2: 1, x4: 1 }, op: '<=' as const, rhs: 50000, label: 'x2+x4 cap' },
      ],
      objective: { expr: { x1: 1.8, x2: 1.2, x3: 1.5, x4: 1.1 }, sense: 'max' as const },
    };
    expect(scoreItem(spec, 'x1=40000, x3=60000')).toMatchObject({ points: 162000, valid: true });
    expect(scoreItem(spec, 'x1=50000, x3=50000')).toMatchObject({ points: 0, valid: false });
    expect(scoreItem(spec, 'x1=-1, x3=10000').valid).toBe(false);
    expect(maxPoints(spec)).toBeNull();
  });
});

describe('round 1 pass rule', () => {
  const spec = { kind: 'numeric' as const, answer: 85, points: 1 };
  it('passes only on an exact answer within the limit', () => {
    expect(r1Pass(spec, '85', true)).toBe(true);
    expect(r1Pass(spec, '85', false)).toBe(false);
    expect(r1Pass(spec, '86', true)).toBe(false);
  });
});

describe('attempt roll-up', () => {
  it('sums totals and tie-order subset', () => {
    const form = [
      { itemId: 'i1', position: 1, spec: { kind: 'numeric' as const, answer: 239, points: 1 }, tieOrderFlag: false },
      { itemId: 'i2', position: 2, spec: { kind: 'numeric' as const, answer: 26, points: 1 }, tieOrderFlag: false },
      { itemId: 'i3', position: 3, spec: { kind: 'numeric' as const, answer: 18, points: 1 }, tieOrderFlag: true },
    ];
    const s = scoreAttempt(form, { registrationId: 'r', answers: { i1: '239', i2: '25', i3: '18' }, elapsedSeconds: 412 });
    expect(s.totalPoints).toBe(2);
    expect(s.tieOrderPoints).toBe(1);
    expect(s.elapsedSeconds).toBe(412);
  });
});

describe('rules invariants', () => {
  it('schema has no select-from-list input type (Rules 4.3)', () => {
    for (const t of INPUT_TYPES) expect(t).not.toMatch(/select|choice|boolean|multiple/);
  });
});
