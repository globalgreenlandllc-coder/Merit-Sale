import 'server-only';
import type { Prisma } from '@prisma/client';
import { RulesetConfigSchema, type RulesetConfig } from '@etk/rules-config';
import { db } from '@/lib/db';
import { safeJson } from '@/lib/format';
import { siteMode } from '@/lib/site-mode';

const formSelect = { id: true, label: true, roundNumber: true, packageHash: true, hashPublishedAt: true, packageReleasedAt: true, _count: { select: { items: true } } } as const;

export const openInclude = {
  property: true,
  rounds: { orderBy: { sequence: 'asc' as const }, include: { form: { select: formSelect }, reserveForm: { select: formSelect } } },
  rulesets: { orderBy: { createdAt: 'desc' as const } },
  certifications: { orderBy: { signedAt: 'asc' as const } },
  forms: { select: formSelect, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.MeritOpenInclude;

export type OpenFull = Prisma.MeritOpenGetPayload<{ include: typeof openInclude }>;
export type RoundFull = OpenFull['rounds'][number];

/** Sample records (seeded, `demo: true`) are public only in demo mode; the console always sees them. */
export async function sampleFilter(includeDemo?: boolean): Promise<Prisma.MeritOpenWhereInput> {
  return includeDemo || (await siteMode()) === 'demo' ? {} : { demo: false };
}

export async function getOpenBySlug(slug: string, opts: { includeDemo?: boolean } = {}): Promise<OpenFull | null> {
  return db.meritOpen.findFirst({ where: { slug, ...(await sampleFilter(opts.includeDemo)) }, include: openInclude });
}
export async function getOpenById(id: string): Promise<OpenFull | null> {
  return db.meritOpen.findUnique({ where: { id }, include: openInclude });
}
export async function listOpens(opts: { includeDraft?: boolean; includeDemo?: boolean } = {}): Promise<OpenFull[]> {
  const where: Prisma.MeritOpenWhereInput = { ...(opts.includeDraft ? {} : { status: { not: 'draft' } }), ...(await sampleFilter(opts.includeDemo ?? opts.includeDraft)) };
  return db.meritOpen.findMany({ where, include: openInclude, orderBy: { createdAt: 'desc' } });
}

const LIVE = ['registration', 'r1', 'r2', 'r3', 'final', 'tiebreak', 'certification', 'closing'];

export async function featuredOpen(): Promise<OpenFull | null> {
  const sample = await sampleFilter();
  const live = await db.meritOpen.findFirst({ where: { status: { in: LIVE }, isPractice: false, ...sample }, include: openInclude, orderBy: { createdAt: 'desc' } });
  if (live) return live;
  return db.meritOpen.findFirst({ where: { status: 'reservation', ...sample }, include: openInclude, orderBy: { createdAt: 'desc' } });
}

export async function openCounts(openId: string) {
  const [reservations, regs] = await Promise.all([
    db.reservation.count({ where: { meritOpenId: openId } }),
    db.registration.findMany({ where: { meritOpenId: openId, status: 'confirmed' }, select: { eligibilitySnapshotJson: true } }),
  ]);
  const byState: Record<string, number> = {};
  for (const r of regs) {
    const s = safeJson<{ state?: string }>(r.eligibilitySnapshotJson, {}).state ?? '??';
    byState[s] = (byState[s] ?? 0) + 1;
  }
  return { reservations, registrations: regs.length, byState };
}

export function latestRuleset(open: OpenFull) {
  return open.rulesets.find((r) => r.lockedAt) ?? open.rulesets[0] ?? null;
}

export function parseConfig(ruleset: { configJson: string } | null | undefined): RulesetConfig | null {
  if (!ruleset) return null;
  const r = RulesetConfigSchema.safeParse(safeJson(ruleset.configJson, null));
  return r.success ? r.data : null;
}

export function eligibleStates(open: OpenFull): string[] {
  return safeJson<string[]>(open.stateEligibilityJson, []);
}

export function isLive(open: { status: string }) {
  return LIVE.includes(open.status);
}

export function roundByNumber(open: OpenFull, number: string): RoundFull | undefined {
  return open.rounds.find((r) => r.number === number);
}

/** Which round number, if any, the open is currently in. */
export function activeRoundNumber(open: OpenFull): string | null {
  if (['r1', 'r2', 'r3', 'final'].includes(open.status)) return open.status;
  if (open.status === 'tiebreak') {
    const tb = open.rounds.filter((r) => r.number.startsWith('tiebreak')).sort((a, b) => b.sequence - a.sequence)[0];
    return tb?.number ?? null;
  }
  return null;
}
