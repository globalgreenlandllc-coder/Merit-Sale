import { z } from 'zod';

export const ROUND_NUMBERS = ['r1', 'r2', 'r3', 'final'] as const;
export type RoundNumber = (typeof ROUND_NUMBERS)[number];

export const MERIT_OPEN_STATUSES = [
  'draft', 'reservation', 'registration', 'r1', 'r2', 'r3', 'final', 'tiebreak',
  'certification', 'closing', 'complete', 'cancelled',
] as const;
export type MeritOpenStatus = (typeof MERIT_OPEN_STATUSES)[number];

/** Rules 12.4 cancellation events. The Administrator records one of these; nothing else cancels a Merit Open. */
export const CANCELLATION_REASONS = [
  { code: '12.4(a)', description: 'A court, regulator, or change in law prohibits the Merit Open.' },
  { code: '12.4(b)', description: 'The Property is destroyed, condemned, or becomes impossible to convey and Section 13.3 does not apply.' },
  { code: '12.4(c)', description: 'A platform security failure makes fair administration impossible and cannot be remedied under Section 8.8.' },
  { code: '12.4(d)', description: 'Fraud or tampering affecting the Merit Open as a whole is discovered.' },
] as const;

export const RoundScheduleSchema = z.object({
  number: z.enum(ROUND_NUMBERS),
  /** windowed rounds (R1, R2) */
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
  /** synchronised rounds (R3, Final) */
  scheduledAt: z.string().optional(),
  durationSeconds: z.number().int().positive(),
  integrityTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  itemCount: z.number().int().positive(),
});

export const DisclosureSchema = z.object({
  /** e.g. "CA-BP-17539.1" */
  templateKey: z.string(),
  maxRounds: z.number().int(),
  maxCostCents: z.number().int(),
  laterRoundsHarder: z.boolean(),
  endDate: z.string(),
  tieMethod: z.string(),
  priorEventStats: z.string(),
});

export const RulesetConfigSchema = z.object({
  version: z.string(),
  meritOpenSlug: z.string(),
  registrationFeeCents: z.number().int().nonnegative(),
  cashComponentCents: z.number().int().nonnegative(),
  eligibleStates: z.array(z.string().length(2)),
  minimumAge: z.number().int().min(18).default(18),
  registrationOpenAt: z.string(),
  registrationCloseAt: z.string(),
  rounds: z.array(RoundScheduleSchema).min(1),
  /** advance from R2 */
  advanceN: z.number().int().positive(),
  /** advance from R3 */
  advanceM: z.number().int().positive(),
  tieOrderSubsets: z.object({ r2: z.array(z.number().int().positive()), r3: z.array(z.number().int().positive()) }),
  r1LatencyGraceSeconds: z.number().int().nonnegative().default(3),
  disputeWindowHours: z.number().int().positive().default(72),
  refundSlaDays: z.number().int().positive().default(30),
  firstAccessHours: z.number().int().nonnegative().default(72),
  retention: z.object({
    scoresKeysCertificationsYears: z.number().default(7),
    proctoringMediaMonthsPostClosing: z.number().default(12),
  }),
  technicalFailurePolicy: z.string(),
  accommodationPolicy: z.string(),
  accommodationRequestDeadlineDays: z.number().int().nonnegative().default(7),
  cancellationReasonCodes: z.array(z.object({ code: z.string(), description: z.string() })),
  termsVersion: z.string(),
  privacyVersion: z.string(),
  disclosures: z.array(DisclosureSchema).default([]),
  parties: z.object({
    sponsor: z.string(),
    propertyOwner: z.string(),
    administrator: z.string(),
    custodian: z.string(),
    titleCompany: z.string().optional(),
  }),
});

export type RulesetConfig = z.infer<typeof RulesetConfigSchema>;
export type RulesetConfigInput = z.input<typeof RulesetConfigSchema>;

export function parseRuleset(input: unknown): RulesetConfig {
  return RulesetConfigSchema.parse(input);
}

export const STATUS_ORDER: MeritOpenStatus[] = [
  'draft', 'reservation', 'registration', 'r1', 'r2', 'r3', 'final', 'tiebreak', 'certification', 'closing', 'complete',
];

/** Allowed forward transitions of the Merit Open state machine (spec §3). Cancellation is handled separately. */
export const TRANSITIONS: Record<MeritOpenStatus, MeritOpenStatus[]> = {
  draft: ['reservation'],
  reservation: ['registration'],
  registration: ['r1'],
  r1: ['r2'],
  r2: ['r3'],
  r3: ['final'],
  final: ['tiebreak', 'certification'],
  tiebreak: ['tiebreak', 'certification'],
  certification: ['closing'],
  closing: ['complete'],
  complete: [],
  cancelled: [],
};

export function canTransition(from: MeritOpenStatus, to: MeritOpenStatus): boolean {
  if (to === 'cancelled') return from !== 'complete' && from !== 'cancelled';
  return TRANSITIONS[from].includes(to);
}
