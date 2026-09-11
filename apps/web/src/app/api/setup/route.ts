import { db } from '@/lib/db';
import { initializeDatabase, tablesExist } from '@/lib/seed/init';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const page = (title: string, body: string) => new Response(`<!doctype html><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:15px/1.6 ui-sans-serif,system-ui;max-width:42rem;margin:4rem auto;padding:0 1.5rem;color:#0f1613;background:#faf8f2"><h1 style="font:600 24px/1.2 Georgia,serif">${title}</h1>${body}<p style="margin-top:2rem;font:12px ui-monospace,monospace;color:#5c6762">Earn the Keys · setup</p></body>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

/** Setup page: shows whether the connected database is initialised and offers to initialise an empty one. */
export async function GET() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) return page('Database not configured', '<p>Set <code>DATABASE_URL</code> (and <code>DATABASE_URL_UNPOOLED</code>) on this deployment, then redeploy.</p>');
  if (url.startsWith('file:')) return page('Local SQLite', '<p>Local development uses SQLite; run <code>npm run db:reset</code> instead.</p>');
  const ready = await tablesExist(db).catch(() => false);
  const sealOk = (process.env.ADMINISTRATOR_SEAL_KEY ?? '').length === 64;
  if (ready) {
    const [opens, users] = await Promise.all([db.meritOpen.count(), db.user.count()]);
    return page('Database is initialised', `<p>${opens} Merit Opens · ${users} users. Nothing to do.</p><p><a href="/">Open the site →</a> · <a href="/api/health">Health report</a></p>`);
  }
  return page('Empty database', `<p>The connected PostgreSQL database has no tables. Initialising creates every table and loads the demo record (three Merit Opens, personas, sealed packages). This only ever runs on an empty database.</p>${sealOk ? '' : '<p style="color:#7f5711"><strong>ADMINISTRATOR_SEAL_KEY</strong> is not set on this deployment. Add it (64 hex characters) and redeploy first, or the seeded packages could never be unsealed.</p>'}<form method="post"><button ${sealOk ? '' : 'disabled'} style="font:600 15px ui-sans-serif,system-ui;background:#0f1613;color:#faf8f2;border:0;padding:12px 20px;border-radius:3px;cursor:pointer">Initialise database</button></form>`);
}

export async function POST() {
  const started = Date.now();
  try {
    const r = await initializeDatabase(db, process.env.ADMINISTRATOR_SEAL_KEY ?? '');
    return page('Initialised', `<p>${r.statements} statements · ${Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(' · ')} · ${Math.round((Date.now() - started) / 1000)}s</p><p><a href="/">Open the site →</a> · <a href="/sign-in">Sign in as a persona</a></p>`);
  } catch (e) {
    return page('Initialisation failed', `<p style="color:#a4522c">${(e instanceof Error ? e.message : String(e)).replace(/:\/\/([^:@/]+):([^@]+)@/g, '://$1:•••@').replace(/</g, '&lt;')}</p>`);
  }
}
