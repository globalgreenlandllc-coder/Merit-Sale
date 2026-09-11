import { db } from '@/lib/db';
import { usingBlob } from '@/lib/uploads';
import { authMode, demoPersonasEnabled, staffListsConfigured } from '@/lib/auth/mode';
import { emailProviderName } from '@/lib/providers/email';

export const dynamic = 'force-dynamic';

const redact = (s: string) => s.replace(/:\/\/([^:@/]+):([^@]+)@/g, '://$1:•••@');

/** Operational health: configuration presence (never values) and a live database round-trip. */
export async function GET() {
  const url = process.env.DATABASE_URL ?? '';
  const config = {
    databaseUrl: url ? (url.startsWith('file:') ? 'sqlite' : 'postgresql') : 'missing',
    databaseUrlUnpooled: !!process.env.DATABASE_URL_UNPOOLED,
    sessionSecret: !!process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'dev-only-change-me-before-any-deploy',
    sealKey: (process.env.ADMINISTRATOR_SEAL_KEY ?? '').length === 64,
    blob: usingBlob(),
    payments: process.env.PAYMENTS_PROVIDER ?? 'mock',
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || null,
    node: process.version,
    auth: { mode: authMode(), emailDelivery: emailProviderName(), staffListed: staffListsConfigured(), demoPersonas: demoPersonasEnabled() },
  };
  try {
    const [opens, users] = await Promise.all([db.meritOpen.count(), db.user.count()]);
    return Response.json({ ok: true, config, database: { reachable: true, meritOpens: opens, users } }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    const message = e instanceof Error ? redact(e.message).split('\n').filter((l) => l.trim()).slice(0, 4).join(' ') : 'unknown';
    const setup = /does not exist/.test(message) ? 'Database is empty: open /api/setup to initialise it.' : undefined;
    return Response.json({ ok: false, config, database: { reachable: false, error: message }, setup }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
