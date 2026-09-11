import type { ItemScoreResult, ScoringSpec, ScoringPart, LinearExpr } from './types';
import { normalizeDecimal, normalizeInteger, normalizeString, parseAllocation, parseAssignment, parseList, roundTo } from './normalize';

const EPS = 1e-9;

function numericMatch(canonical: string, answer: number, tolerance?: number): boolean {
  if (tolerance && tolerance > 0) return Math.abs(Number(canonical) - answer) <= tolerance + EPS;
  return canonical === normalizeDecimal(String(answer));
}

function scorePart(part: ScoringPart, raw: unknown): { correct: boolean; canonical: string | null } {
  const str = raw === undefined || raw === null ? '' : String(raw);
  if (part.type === 'string_exact') {
    const c = normalizeString(str);
    return { correct: c.length > 0 && c === normalizeString(String(part.answer)), canonical: c || null };
  }
  const c = part.type === 'integer' ? normalizeInteger(str) : normalizeDecimal(str);
  if (c === null) return { correct: false, canonical: null };
  return { correct: numericMatch(c, Number(part.answer), part.tolerance), canonical: c };
}

function evalExpr(expr: LinearExpr, x: Record<string, number>): number {
  let total = 0;
  for (const [k, coef] of Object.entries(expr)) total += coef * (x[normalizeString(k)] ?? 0);
  return total;
}

/**
 * Score one item. Pure. Never throws on registrant input: unparseable input is
 * `valid: false, points: 0`. A blank answer always scores zero (Rules 5.1).
 */
export function scoreItem(spec: ScoringSpec, raw: unknown): ItemScoreResult {
  const str = raw === undefined || raw === null ? '' : typeof raw === 'string' ? raw : JSON.stringify(raw);
  if (str.trim() === '' || str.trim() === '{}' || str.trim() === '[]') return { points: 0, valid: false, canonical: null };

  switch (spec.kind) {
    case 'exact': {
      const c = normalizeString(str);
      return { points: c === normalizeString(spec.answer) ? spec.points : 0, valid: c.length > 0, canonical: c || null };
    }
    case 'numeric': {
      const c = normalizeDecimal(str);
      if (c === null) return { points: 0, valid: false, canonical: null };
      return { points: numericMatch(c, spec.answer, spec.tolerance) ? spec.points : 0, valid: true, canonical: c };
    }
    case 'ordering': {
      const list = parseList(raw).map(normalizeString);
      const key = spec.answer.map(normalizeString);
      const valid = list.length === key.length && new Set(list).size === list.length;
      const correct = valid && list.every((t, i) => t === key[i]);
      return { points: correct ? spec.points : 0, valid, canonical: list.join(' > ') || null };
    }
    case 'assignment': {
      const parsed = parseAssignment(raw);
      if (!parsed) return { points: 0, valid: false, canonical: null };
      const key: Record<string, string> = {};
      for (const [k, v] of Object.entries(spec.answer)) key[normalizeString(k)] = normalizeString(v);
      const keys = Object.keys(key);
      const valid = keys.every((k) => k in parsed) && Object.keys(parsed).length === keys.length;
      const correct = keys.filter((k) => parsed[k] === key[k]).length;
      let points = 0;
      if (valid && correct === keys.length) points = spec.points;
      else if (valid && spec.partialPerCorrect) points = Math.min(spec.points, correct * spec.partialPerCorrect);
      const canonical = keys.map((k) => `${k}→${parsed[k] ?? '∅'}`).join(', ');
      return { points, valid, canonical, detail: { correct, of: keys.length } };
    }
    case 'parts': {
      const parsed = parseAssignment(raw);
      if (!parsed) return { points: 0, valid: false, canonical: null };
      let points = 0;
      const detail: Record<string, boolean> = {};
      const canon: string[] = [];
      for (const part of spec.parts) {
        const k = normalizeString(part.key);
        const r = scorePart(part, parsed[k]);
        detail[part.key] = r.correct;
        if (r.correct) points += part.weight;
        canon.push(`${k}→${r.canonical ?? '∅'}`);
      }
      return { points: roundTo(points, 6), valid: true, canonical: canon.join(', '), detail };
    }
    case 'optimization': {
      const alloc = parseAllocation(raw);
      if (!alloc) return { points: 0, valid: false, canonical: null };
      const x: Record<string, number> = {};
      for (const v of spec.variables) x[normalizeString(v)] = alloc[normalizeString(v)] ?? 0;
      const violations: string[] = [];
      if (spec.nonNegative !== false) for (const [k, val] of Object.entries(x)) if (val < -EPS) violations.push(`${k} < 0`);
      if (spec.integer) for (const [k, val] of Object.entries(x)) if (Math.abs(val - Math.round(val)) > EPS) violations.push(`${k} not integer`);
      spec.constraints.forEach((c, i) => {
        const lhs = evalExpr(c.expr, x);
        const ok = c.op === '<=' ? lhs <= c.rhs + EPS : c.op === '>=' ? lhs >= c.rhs - EPS : Math.abs(lhs - c.rhs) <= EPS;
        if (!ok) violations.push(c.label ?? `constraint ${i + 1}`);
      });
      const canonical = spec.variables.map((v) => `${v}=${x[normalizeString(v)]}`).join(', ');
      if (violations.length) return { points: 0, valid: false, canonical, detail: { violations } };
      const value = evalExpr(spec.objective.expr, x);
      const score = spec.objective.sense === 'max' ? value : (spec.objective.constant ?? 0) - value;
      return { points: roundTo(score, spec.precision ?? 6), valid: true, canonical, detail: { objective: value } };
    }
  }
}

/** Maximum attainable points for a spec, or null when unbounded (optimisation). */
export function maxPoints(spec: ScoringSpec): number | null {
  switch (spec.kind) {
    case 'exact': case 'numeric': case 'ordering': case 'assignment': return spec.points;
    case 'parts': return roundTo(spec.parts.reduce((s, p) => s + p.weight, 0), 6);
    case 'optimization': return null;
  }
}

/** Round 1: pass iff the single item scores full points and the submission was within the limit. */
export function r1Pass(spec: ScoringSpec, raw: unknown, submittedWithinLimit: boolean): boolean {
  if (!submittedWithinLimit) return false;
  const max = maxPoints(spec);
  const r = scoreItem(spec, raw);
  return r.valid && max !== null && r.points >= max;
}
