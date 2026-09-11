import { z } from 'zod';
import { INPUT_TYPES } from '@etk/scoring';

const LinearExpr = z.record(z.string(), z.number());

export const ScoringSpecSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('exact'), answer: z.string().min(1), points: z.number().positive() }),
  z.object({ kind: z.literal('numeric'), answer: z.number(), points: z.number().positive(), tolerance: z.number().nonnegative().optional() }),
  z.object({ kind: z.literal('ordering'), answer: z.array(z.string().min(1)).min(2), points: z.number().positive() }),
  z.object({ kind: z.literal('assignment'), answer: z.record(z.string(), z.string()), points: z.number().positive(), partialPerCorrect: z.number().positive().optional() }),
  z.object({
    kind: z.literal('parts'),
    parts: z.array(z.object({
      key: z.string().min(1), label: z.string().optional(),
      type: z.enum(['integer', 'decimal', 'string_exact']),
      answer: z.union([z.string(), z.number()]), weight: z.number().positive(), tolerance: z.number().nonnegative().optional(),
    })).min(2),
  }),
  z.object({
    kind: z.literal('optimization'),
    variables: z.array(z.string().min(1)).min(1),
    constraints: z.array(z.object({ expr: LinearExpr, op: z.enum(['<=', '>=', '=']), rhs: z.number(), label: z.string().optional() })).min(1),
    objective: z.object({ expr: LinearExpr, sense: z.enum(['max', 'min']), constant: z.number().optional() }),
    integer: z.boolean().optional(), nonNegative: z.boolean().optional(), precision: z.number().int().min(0).max(12).optional(),
  }),
]);
export type ScoringSpecInput = z.infer<typeof ScoringSpecSchema>;

/**
 * An authored item. `inputType` is one of the enumerated free-response types; the
 * enum comes from @etk/scoring and contains no select-from-list type by design.
 */
export const ItemSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().positive(),
  prompt: z.string().min(20),
  inputType: z.enum(INPUT_TYPES),
  scoring: ScoringSpecSchema,
  maxPoints: z.number().positive(),
  tieOrderFlag: z.boolean().default(false),
  calculatorPermitted: z.boolean().default(false),
  /** shown to the registrant next to the input, e.g. "Whole number" */
  inputHint: z.string().optional(),
  /** optional structured input for allocation/assignment items */
  fields: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
});
export type AuthoredItem = z.infer<typeof ItemSchema>;
export type AuthoredItemInput = z.input<typeof ItemSchema>;

export const FormPackageSchema = z.object({
  meritOpenSlug: z.string(),
  round: z.string(),
  label: z.enum(['primary', 'reserve', 'tiebreak']),
  formId: z.string(),
  items: z.array(ItemSchema).min(1),
  authoredAt: z.string(),
});
export type FormPackage = z.infer<typeof FormPackageSchema>;

/** What the test client is allowed to see: never the scoring spec. */
export const PublicItemSchema = ItemSchema.omit({ scoring: true });
export type PublicItem = z.infer<typeof PublicItemSchema>;
