import 'server-only';
import { cache } from 'react';
import type { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { usingBlob } from '@/lib/uploads';
import { staffListsConfigured } from '@/lib/auth/staff';
import { emailProviderName } from '@/lib/providers/email';
import { backfillDemoPhotos, stripDemoPhotos } from '@/lib/seed/photos';

/**
 * Site mode. `demo`: a walk-through deployment — sample listings with credited sample
 * photography, one-click personas for every realm, direct sign-in without codes, mock
 * payments. `live`: the real thing — sample records hidden, personas off, one-time email
 * codes, and registration refused until a real payment processor is configured.
 *
 * Resolution: SITE_MODE in the environment (locks the switch) → the stored setting → a
 * computed default: `demo` in development, and in production `demo` while the database
 * holds only sample listings, `live` once a real listing exists.
 */
export type SiteMode = 'demo' | 'live';
export const SITE_MODE_KEY = 'site.mode';

export const isSiteMode = (v: unknown): v is SiteMode => v === 'demo' || v === 'live';

export function envSiteMode(): SiteMode | null {
  const m = process.env.SITE_MODE;
  return isSiteMode(m) ? m : null;
}
/** Default when nothing is stored. A production database with nothing but the sample record is a demonstration until someone says otherwise. */
export async function defaultSiteMode(client: PrismaClient = db): Promise<SiteMode> {
  if (process.env.NODE_ENV !== 'production') return 'demo';
  try {
    const real = await client.meritOpen.count({ where: { demo: false } });
    return real > 0 ? 'live' : 'demo';
  } catch {
    return 'demo'; // schema not yet updated: the database predates real listings
  }
}

export async function storeSiteMode(mode: SiteMode, client: PrismaClient = db) {
  await client.siteSetting.upsert({ where: { key: SITE_MODE_KEY }, create: { key: SITE_MODE_KEY, valueJson: JSON.stringify(mode) }, update: { valueJson: JSON.stringify(mode) } });
}

async function storedSiteMode(client: PrismaClient = db): Promise<SiteMode | null> {
  try {
    const row = await client.siteSetting.findUnique({ where: { key: SITE_MODE_KEY } });
    const v = row ? JSON.parse(row.valueJson) : null;
    return isSiteMode(v) ? v : null;
  } catch {
    return null; // table missing on an old database: fall through to the default
  }
}

export interface SiteModeState { mode: SiteMode; source: 'env' | 'setting' | 'default'; locked: boolean }

/** Current mode and where it came from. Cached per request. */
export const siteModeState = cache(async (): Promise<SiteModeState> => {
  const fromEnv = envSiteMode();
  if (fromEnv) return { mode: fromEnv, source: 'env', locked: true };
  const stored = await storedSiteMode();
  if (stored) return { mode: stored, source: 'setting', locked: false };
  return { mode: await defaultSiteMode(), source: 'default', locked: false };
});

export const siteMode = async (): Promise<SiteMode> => (await siteModeState()).mode;
export const isDemo = async (): Promise<boolean> => (await siteMode()) === 'demo';

/**
 * The setup page may switch modes only while nobody could do it from the console: no
 * staff address listed and no SITE_MODE pin. Once an admin is listed, the switch lives
 * in the console alone.
 */
export const bootstrapSwitchOpen = (): boolean => !envSiteMode() && !staffListsConfigured();

export interface ReadinessItem { key: string; label: string; ok: boolean; required: boolean; detail: string; fix?: string; /** short phrase for the blocked line */ blocker?: string }

/** What live mode needs from the deployment. `required` items block the switch; the rest are shown as warnings. */
export function liveReadiness(): ReadinessItem[] {
  const provider = env.paymentsProvider;
  const stripeReady = provider === 'stripe' && !!env.stripeSecretKey && !!env.stripeCustodianAccountId;
  return [
    { key: 'staff', label: 'A platform admin address is listed', ok: staffListsConfigured(), required: true, blocker: 'no platform admin address is listed', detail: staffListsConfigured() ? 'Staff roles are granted from the environment lists at sign-in.' : 'With no address listed, nobody can reach the console in live mode.', fix: 'PLATFORM_ADMIN_EMAILS=you@example.com' },
    { key: 'session', label: 'Session secret set', ok: !!process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'dev-only-change-me-before-any-deploy', required: false, detail: 'Signs the session cookie. The development default lets anyone mint a session.', fix: 'SESSION_SECRET=<long random string>' },
    { key: 'seal', label: 'Administrator seal key set', ok: env.sealKey.length === 64, required: false, detail: 'Needed to unseal answer keys after each round closes.', fix: 'ADMINISTRATOR_SEAL_KEY=<64 hex>' },
    { key: 'email', label: 'Email delivery configured', ok: emailProviderName() !== 'log', required: false, detail: emailProviderName() !== 'log' ? `Sign-in codes and notices go out through ${emailProviderName()}.` : 'Sign-in codes are written to the server log; nobody outside the team can sign in.', fix: 'RESEND_API_KEY=… and EMAIL_FROM=…' },
    { key: 'payments', label: 'Real payment processor', ok: stripeReady, required: false, detail: stripeReady ? 'Fees settle to the custodian account.' : `Provider is ${provider}${provider === 'stripe' ? ' but the key or custodian account is missing' : ''}. Live mode refuses registration payments until this is set.`, fix: 'PAYMENTS_PROVIDER=stripe, STRIPE_SECRET_KEY, STRIPE_CUSTODIAN_ACCOUNT_ID' },
    { key: 'idv', label: 'Identity verification vendor', ok: env.idvProvider !== 'mock', required: false, detail: env.idvProvider !== 'mock' ? `Provider: ${env.idvProvider}.` : 'The mock vendor verifies everyone. Live registrations need a real vendor.', fix: 'IDV_PROVIDER=…' },
    { key: 'blob', label: 'Photograph storage', ok: usingBlob(), required: false, detail: usingBlob() ? 'Uploads go to Vercel Blob.' : 'Uploads fall back to the local disk, which does not persist on Vercel; linked photographs still work.', fix: 'BLOB_READ_WRITE_TOKEN (Vercel → Storage → Blob)' },
    { key: 'url', label: 'Public site URL', ok: !!process.env.NEXT_PUBLIC_SITE_URL, required: false, detail: 'Used in emails and receipts.', fix: 'NEXT_PUBLIC_SITE_URL=https://…' },
  ];
}

export interface SwitchResult { ok: boolean; mode: SiteMode; reason?: string; photos?: number }

/**
 * Switches the stored mode. Demo loads the sample photographs onto sample properties that
 * have none; live removes every sample photograph. Refuses to leave the deployment with no
 * possible admin unless `force` (the bootstrap setup page, which stays reachable).
 */
export async function switchSiteMode(mode: SiteMode, opts: { force?: boolean } = {}): Promise<SwitchResult> {
  if (envSiteMode()) return { ok: false, mode: envSiteMode()!, reason: 'SITE_MODE is set in the environment; change it there and redeploy.' };
  if (mode === 'live' && !opts.force && !staffListsConfigured()) return { ok: false, mode: 'demo', reason: 'List at least one platform admin address (PLATFORM_ADMIN_EMAILS) before going live, or nobody will be able to sign in to the console.' };
  await storeSiteMode(mode);
  const photos = mode === 'demo' ? await backfillDemoPhotos(db) : await stripDemoPhotos(db);
  return { ok: true, mode, photos };
}
