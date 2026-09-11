import { maxPoints, normalizeString, scoreItem } from '@etk/scoring';
import { ItemSchema, type AuthoredItem, type AuthoredItemInput } from './schema';

const TRIVIAL = new Set(['0', '1', '-1', '', 'yes', 'no', 'true', 'false', 'none', 'n/a', 'all']);

export interface ValidationReport { ok: boolean; problems: string[]; item?: AuthoredItem }

/**
 * Pre-lock validation (spec §4.3): exactly one correct answer or a deterministic
 * formula, no trivial default answer, free-response only, consistent metadata.
 */
export function validateItem(input: AuthoredItemInput): ValidationReport {
  const parsed = ItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  const item = parsed.data;
  const problems: string[] = [];
  const s = item.scoring;

  const compatible: Record<string, string[]> = {
    integer: ['numeric'], decimal: ['numeric'], string_exact: ['exact', 'parts'],
    ordering: ['ordering'], assignment: ['assignment', 'parts'], allocation: ['optimization', 'parts'],
  };
  if (!compatible[item.inputType]?.includes(s.kind)) problems.push(`inputType ${item.inputType} is not compatible with scoring kind ${s.kind}`);

  // the item must score full marks against its own key (deterministic, self-consistent)
  const key = keyAnswerFor(item);
  if (key !== null) {
    const r = scoreItem(s, key);
    const max = maxPoints(s);
    if (!r.valid || (max !== null && r.points < max)) problems.push('answer key does not score full marks against its own scoring spec');
  }

  // no trivial default answer
  if (s.kind === 'exact' && TRIVIAL.has(normalizeString(s.answer))) problems.push('exact answer is a trivial default');
  if (s.kind === 'numeric' && TRIVIAL.has(String(s.answer))) problems.push('numeric answer is a trivial default (0/1/-1)');
  if (s.kind === 'numeric' && item.inputType === 'integer' && !Number.isInteger(s.answer)) problems.push('integer item has a non-integer key');
  if (s.kind === 'ordering' && new Set(s.answer.map(normalizeString)).size !== s.answer.length) problems.push('ordering key has duplicate tokens');
  if (s.kind === 'assignment') {
    const vals = Object.values(s.answer).map(normalizeString);
    if (Object.keys(s.answer).length < 2) problems.push('assignment key needs at least two pairs');
    if (new Set(vals).size !== vals.length) problems.push('assignment key maps two keys to the same value');
  }
  if (s.kind === 'parts') {
    const keys = s.parts.map((p) => normalizeString(p.key));
    if (new Set(keys).size !== keys.length) problems.push('parts have duplicate keys');
    for (const p of s.parts) if (TRIVIAL.has(normalizeString(String(p.answer)))) problems.push(`part ${p.key} has a trivial default answer`);
  }
  if (s.kind === 'optimization') {
    const vars = new Set(s.variables.map(normalizeString));
    for (const [k] of Object.entries(s.objective.expr)) if (!vars.has(normalizeString(k))) problems.push(`objective references unknown variable ${k}`);
    s.constraints.forEach((c, i) => { for (const k of Object.keys(c.expr)) if (!vars.has(normalizeString(k))) problems.push(`constraint ${i + 1} references unknown variable ${k}`); });
    // the zero allocation must not be optimal-by-default: require at least one >= or = constraint or a positive-coefficient objective
    if (!s.constraints.some((c) => c.op !== '<=') && !Object.values(s.objective.expr).some((v) => v > 0)) problems.push('optimisation is trivially solved by the zero allocation');
  }

  const max = maxPoints(s);
  if (max !== null && Math.abs(max - item.maxPoints) > 1e-9) problems.push(`maxPoints ${item.maxPoints} does not match scoring maximum ${max}`);

  // free-response guardrail: prompts must not present a fixed option list to pick from
  if (/\b(choose one|select one|select all|which of the following|true or false)\b/i.test(item.prompt)) problems.push('prompt reads like a select-from-list item (Rules 4.3)');

  return { ok: problems.length === 0, problems, item };
}

/** Build a raw answer that should score full marks from the key, for self-consistency checks. */
export function keyAnswerFor(item: AuthoredItem): unknown {
  const s = item.scoring;
  switch (s.kind) {
    case 'exact': return s.answer;
    case 'numeric': return String(s.answer);
    case 'ordering': return s.answer.join(', ');
    case 'assignment': return s.answer;
    case 'parts': return Object.fromEntries(s.parts.map((p) => [p.key, String(p.answer)]));
    case 'optimization': return null; // no single key; optimum is not stored
  }
}

export function validateForm(items: AuthoredItemInput[]): { ok: boolean; reports: ValidationReport[]; problems: string[] } {
  const reports = items.map(validateItem);
  const problems = reports.flatMap((r, i) => r.problems.map((p) => `item ${i + 1}: ${p}`));
  const positions = items.map((i) => i.position);
  if (new Set(positions).size !== positions.length) problems.push('duplicate positions');
  const sorted = [...positions].sort((a, b) => a - b);
  if (sorted.some((p, i) => p !== i + 1)) problems.push('positions must be 1..n with no gaps (one common form, fixed order)');
  return { ok: problems.length === 0, reports, problems };
}
