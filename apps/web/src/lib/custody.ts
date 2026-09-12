import 'server-only';
import { z } from 'zod';
import { hashObject } from '@etk/rules-config';
import type { Vendor } from '@prisma/client';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { safeJson } from '@/lib/format';

/**
 * Custody of registration fees (Rules 3.4, 12.1). Fees settle from the payment processor to
 * the Custodian; the platform never holds a balance and never shows an account number.
 * The custodian's public profile lives on its Vendor row (non-secret); release
 * instructions are hashed entries in the append-only audit log.
 */
export const ACCOUNT_TYPES = { trust: 'Bank trust account', fbo: 'FBO (for benefit of) account', escrow: 'Licensed escrow company' } as const;
export type AccountType = keyof typeof ACCOUNT_TYPES;

export const CustodyConfigSchema = z.object({
  institution: z.string().max(160).default(''),
  accountType: z.enum(['trust', 'fbo', 'escrow']).optional(),
  agreementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).transform((v) => v || undefined),
  agreementHash: z.string().regex(/^[0-9a-f]{64}$/i).optional().or(z.literal('')).transform((v) => v || undefined),
  settlement: z.enum(['destination', 'merchant_of_record']).default('destination'),
  releaseEvents: z.array(z.string().min(1).max(200)).default([]),
  reconciliationEmail: z.string().email().optional().or(z.literal('')).transform((v) => v || undefined),
});
export type CustodyConfig = z.infer<typeof CustodyConfigSchema>;

export const DEFAULT_RELEASE_EVENTS = [
  'Closing of the Property: the Cash Component is released to the title company for the certified winner (Rules 6.2).',
  'Closing of the Property: the registration fee balance is released to the Sponsor once the deed is recorded (Exhibit G).',
  'Cancellation (Rules 12.4): every registration fee is refunded in full, including processing fees, to the original payment method.',
  'A verified ineligible registration: that fee is refunded from custody on the Administrator’s instruction.',
];

export function parseCustodyConfig(vendor: Vendor | null | undefined): CustodyConfig {
  const parsed = CustodyConfigSchema.safeParse(safeJson<unknown>(vendor?.configJson, {}));
  return parsed.success ? parsed.data : CustodyConfigSchema.parse({});
}

export interface CustodyProfile { vendor: Vendor | null; config: CustodyConfig; complete: boolean; missing: string[] }

/** The custodian as the public may see it. `complete` means counsel can point at it. */
export async function custodyProfile(): Promise<CustodyProfile> {
  const vendor = await db.vendor.findFirst({ where: { kind: 'custodian', active: true }, orderBy: { updatedAt: 'desc' } });
  const config = parseCustodyConfig(vendor);
  const missing: string[] = [];
  if (!vendor || vendor.name.startsWith('[')) missing.push('custodian name');
  if (!config.accountType) missing.push('account type');
  if (!config.agreementDate) missing.push('custody agreement date');
  if (!vendor?.publicSummaryUrl) missing.push('public summary link');
  return { vendor, config, complete: missing.length === 0, missing };
}

export interface SettlementCheck { provider: string; configured: boolean; ok: boolean; destination: string | null; detail: string }

/** Confirms the processor is set to settle to the custodian's connected account, not the platform. */
export async function checkSettlement(): Promise<SettlementCheck> {
  if (env.paymentsProvider !== 'stripe' || !env.stripeSecretKey) return { provider: env.paymentsProvider, configured: false, ok: false, destination: null, detail: 'Mock processor: payments are simulated and nothing settles anywhere.' };
  if (!env.stripeCustodianAccountId) return { provider: 'stripe', configured: false, ok: false, destination: null, detail: 'STRIPE_CUSTODIAN_ACCOUNT_ID is not set; checkout is refused until it is.' };
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(env.stripeSecretKey);
    const acct = await stripe.accounts.retrieve(env.stripeCustodianAccountId);
    const ok = !!acct.charges_enabled && !!acct.payouts_enabled;
    const name = acct.business_profile?.name ?? acct.settings?.dashboard?.display_name ?? acct.id;
    return { provider: 'stripe', configured: true, ok, destination: mask(acct.id), detail: ok ? `Settlement destination ${name}: charges and payouts enabled.` : `${name}: charges ${acct.charges_enabled ? 'enabled' : 'disabled'}, payouts ${acct.payouts_enabled ? 'enabled' : 'disabled'}; onboarding incomplete.` };
  } catch (e) {
    return { provider: 'stripe', configured: true, ok: false, destination: mask(env.stripeCustodianAccountId), detail: `Could not read the custodian account: ${e instanceof Error ? e.message : String(e)}` };
  }
}
const mask = (id: string) => (id.length > 8 ? `${id.slice(0, 5)}…${id.slice(-4)}` : id);

export interface CustodyLedgerRow { openId: string; slug: string; name: string; status: string; settledCount: number; settledCents: number; feeCents: number; refundedCount: number; refundedCents: number; chargebackCount: number; heldCents: number }

/** Aggregate custody position per Merit Open: what settled, what left, what is held. Public-safe (no people). */
export async function custodyLedger(): Promise<CustodyLedgerRow[]> {
  const opens = await db.meritOpen.findMany({ where: { status: { not: 'draft' }, isPractice: false }, select: { id: true, slug: true, name: true, status: true }, orderBy: { createdAt: 'desc' } });
  const rows: CustodyLedgerRow[] = [];
  for (const o of opens) {
    const payments = await db.payment.findMany({ where: { registration: { meritOpenId: o.id }, status: { in: ['settled', 'refunded', 'chargeback'] } }, select: { status: true, amountCents: true, feeCents: true, refunds: { where: { status: 'completed' }, select: { amountCents: true } } } });
    const settled = payments.filter((p) => p.status !== 'chargeback');
    const refunded = payments.filter((p) => p.status === 'refunded');
    const settledCents = settled.reduce((a, p) => a + p.amountCents, 0);
    const refundedCents = refunded.reduce((a, p) => a + p.refunds.reduce((b, r) => b + r.amountCents, 0), 0);
    rows.push({ openId: o.id, slug: o.slug, name: o.name, status: o.status, settledCount: settled.length, settledCents, feeCents: settled.reduce((a, p) => a + p.feeCents, 0), refundedCount: refunded.length, refundedCents, chargebackCount: payments.filter((p) => p.status === 'chargeback').length, heldCents: settledCents - refundedCents });
  }
  return rows;
}

export interface ReconciliationRow { paymentId: string; registrationId: string; meritOpen: string; provider: string; processorRef: string | null; custodianRef: string | null; amountCents: number; feeCents: number; currency: string; status: string; settledAt: Date | null; refundedAt: Date | null; refunds: { amountCents: number; status: string; processorRef: string | null; attemptedAt: Date | null }[] }

/** Every payment the custodian should be able to match against its statement. Identified by references, never by names. */
export async function reconciliation(opts: { openId?: string; from?: Date; to?: Date } = {}): Promise<ReconciliationRow[]> {
  const payments = await db.payment.findMany({
    where: { ...(opts.openId ? { registration: { meritOpenId: opts.openId } } : {}), ...(opts.from || opts.to ? { createdAt: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } } : {}) },
    include: { registration: { select: { meritOpen: { select: { slug: true } } } }, refunds: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  return payments.map((p) => ({ paymentId: p.id, registrationId: p.registrationId, meritOpen: p.registration.meritOpen.slug, provider: p.provider, processorRef: p.processorRef, custodianRef: p.custodianSettlementRef, amountCents: p.amountCents, feeCents: p.feeCents, currency: p.currency, status: p.status, settledAt: p.settledAt, refundedAt: p.refundedAt, refunds: p.refunds.map((r) => ({ amountCents: r.amountCents, status: r.status, processorRef: r.processorRef, attemptedAt: r.attemptedAt })) }));
}

export function reconciliationCsv(rows: ReconciliationRow[]): string {
  const esc = (v: unknown) => { const s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ['payment_id', 'registration_id', 'merit_open', 'provider', 'processor_ref', 'custodian_ref', 'amount', 'processing_fee', 'currency', 'status', 'settled_at', 'refunded_at', 'refund_amount', 'refund_status', 'refund_ref'];
  const lines = rows.map((r) => { const rf = r.refunds.find((x) => x.status === 'completed') ?? r.refunds[0]; return [r.paymentId, r.registrationId, r.meritOpen, r.provider, r.processorRef, r.custodianRef, (r.amountCents / 100).toFixed(2), (r.feeCents / 100).toFixed(2), r.currency, r.status, r.settledAt, r.refundedAt, rf ? (rf.amountCents / 100).toFixed(2) : '', rf?.status ?? '', rf?.processorRef ?? ''].map(esc).join(','); });
  return [head.join(','), ...lines].join('\n') + '\n';
}

export type ReleaseEvent = 'closing_instruction' | 'closing_recorded' | 'cancellation_refunds' | 'ineligible_refund';
export interface ReleaseInstruction { event: ReleaseEvent; meritOpen: string; meritOpenId: string; amountCents: number | null; payee: string; reference: string | null; note: string; issuedAt: string; issuedByRole: string }

/**
 * Writes a release instruction to the audit log. The custodian acts on the hashed entry
 * (or the export of it), never on an email from a person; the entry is public on /custody.
 */
export async function recordReleaseInstruction(input: Omit<ReleaseInstruction, 'issuedAt'> & { actorId: string | null }): Promise<{ hash: string; seq: number }> {
  const doc: ReleaseInstruction = { event: input.event, meritOpen: input.meritOpen, meritOpenId: input.meritOpenId, amountCents: input.amountCents, payee: input.payee, reference: input.reference, note: input.note, issuedAt: new Date().toISOString(), issuedByRole: input.issuedByRole };
  const hash = hashObject(doc);
  const row = await audit({ actorId: input.actorId, actorRole: input.issuedByRole, action: 'custody.release_instruction', objectType: 'MeritOpen', objectId: input.meritOpenId, detail: { ...doc, hash } });
  return { hash, seq: row.seq };
}

export interface ReleaseRecord extends ReleaseInstruction { hash: string; seq: number; entryHash: string; timestamp: Date }

export async function releaseInstructions(meritOpenId?: string): Promise<ReleaseRecord[]> {
  const rows = await db.auditEvent.findMany({ where: { action: 'custody.release_instruction', ...(meritOpenId ? { objectId: meritOpenId } : {}) }, orderBy: { seq: 'desc' }, take: 200 });
  return rows.flatMap((r) => { const d = safeJson<(ReleaseInstruction & { hash: string }) | null>(r.detailJson, null); return d ? [{ ...d, seq: r.seq, entryHash: r.entryHash, timestamp: r.timestamp }] : []; });
}

export const RELEASE_LABEL: Record<ReleaseEvent, string> = { closing_instruction: 'Release at closing', closing_recorded: 'Closing recorded', cancellation_refunds: 'Cancellation refunds', ineligible_refund: 'Ineligible registration refund' };
