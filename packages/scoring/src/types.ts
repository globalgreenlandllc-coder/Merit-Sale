/**
 * Input types permitted in scored rounds. There is deliberately no select-from-list
 * type here (Rules 4.3, Design 6.2): a produced answer cannot be correct by guessing
 * at a fixed probability. Adding a select type is a rules violation, not a feature.
 */
export const INPUT_TYPES = ['integer', 'decimal', 'string_exact', 'ordering', 'assignment', 'allocation'] as const;
export type InputType = (typeof INPUT_TYPES)[number];

export type LinearExpr = Record<string, number>;

export interface LinearConstraint {
  expr: LinearExpr;
  op: '<=' | '>=' | '=';
  rhs: number;
  label?: string;
}

/** One predetermined exact answer (case-insensitive, whitespace-normalised). */
export interface ExactSpec { kind: 'exact'; answer: string; points: number }
/** One predetermined numeric answer; optional absolute tolerance (0 = exact). */
export interface NumericSpec { kind: 'numeric'; answer: number; points: number; tolerance?: number }
/** A predetermined ordering of tokens. All-or-nothing. */
export interface OrderingSpec { kind: 'ordering'; answer: string[]; points: number }
/** A predetermined key→value assignment. All-or-nothing, or fixed partial credit per correct pair. */
export interface AssignmentSpec { kind: 'assignment'; answer: Record<string, string>; points: number; partialPerCorrect?: number }
/** Multi-part item with predetermined weights per part (Round 3 style partial credit). */
export interface ScoringPart {
  key: string;
  label?: string;
  type: 'integer' | 'decimal' | 'string_exact';
  answer: string | number;
  weight: number;
  tolerance?: number;
}
export interface PartsSpec { kind: 'parts'; parts: ScoringPart[] }
/**
 * Continuous optimisation (Final). The registrant submits an allocation over `variables`;
 * validity is checked against linear constraints; the objective is evaluated exactly.
 * Invalid submissions score zero. Higher score is better in every case.
 */
export interface OptimizationSpec {
  kind: 'optimization';
  variables: string[];
  constraints: LinearConstraint[];
  objective: { expr: LinearExpr; sense: 'max' | 'min'; constant?: number };
  integer?: boolean;
  nonNegative?: boolean;
  /** decimal places retained in the score (default 6) — "full precision of the published formula" */
  precision?: number;
}

export type ScoringSpec = ExactSpec | NumericSpec | OrderingSpec | AssignmentSpec | PartsSpec | OptimizationSpec;

export interface ItemScoreResult {
  points: number;
  /** false when the answer could not be parsed or violated a stated constraint */
  valid: boolean;
  /** canonical form of the submitted answer, or null when unparseable */
  canonical: string | null;
  detail?: Record<string, unknown>;
}
