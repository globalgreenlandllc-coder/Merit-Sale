import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { initializeDatabase, tablesExist } from '@/lib/seed/init';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const redact = (s: string) => s.replace(/:\/\/([^:@/]+):([^@]+)@/g, '://$1:•••@');
const page = (title: string, body: string) => new Response(`<!doctype html><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:15px/1.6 ui-sans-serif,system-ui;max-width:42rem;margin:4rem auto;padding:0 1.5rem;color:#0f1613;background:#faf8f2"><h1 style="font:600 24px/1.2 Georgia,serif">${title}</h1>${body}<p style="margin-top:2rem;font:12px ui-monospace,monospace;color:#5c6762">Earn the Keys · setup</p></body>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
const code = (s: string) => `<code style="font:13px ui-monospace,monospace;background:#e8e1d1;padding:2px 5px;border-radius:3px;word-break:break-all">${esc(s)}</code>`;

/** Setup page: shows whether the connected database is initialised and offers to initialise an empty one. */
export async function GET() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) return page('Database not configured', `<p>Set ${code('DATABASE_URL')} (and ${code('DATABASE_URL_UNPOOLED')}) on this deployment, then redeploy.</p>`);
  if (url.startsWith('file:')) return page('Local SQLite', `<p>Local development uses SQLite; run ${code('npm run db:reset')} instead.</p>`);
  const ready = await tablesExist(db).catch(() => false);
  const envKey = process.env.ADMINISTRATOR_SEAL_KEY ?? '';
  if (ready) {
    const [opens, users] = await Promise.all([db.meritOpen.count(), db.user.count()]);
    return page('Database is initialised', `<p>${opens} Merit Opens · ${users} users. Nothing to do.</p><p><a href="/">Open the site →</a> · <a href="/api/health">Health report</a></p>`);
  }
  const keyField = envKey.length === 64
    ? `<p>Seal key: set on this deployment.</p>`
    : `<p><label>Administrator seal key <span style="color:#5c6762">(64 hex characters; a fresh one is suggested, or paste the one you were given)</span><br><input name="sealKey" value="${randomBytes(32).toString('hex')}" required pattern="[0-9a-fA-F]{64}" style="font:13px ui-monospace,monospace;width:100%;padding:8px;border:1px solid #b9b2a3;border-radius:3px;margin-top:4px"></label></p><p style="color:#7f5711">This deployment has no ${code('ADMINISTRATOR_SEAL_KEY')}. The answer keys will be sealed with the key above; add the same value to Vercel as ${code('ADMINISTRATOR_SEAL_KEY')} afterwards, or the Administrator will not be able to unseal them.</p>`;
  return page('Empty database', `<p>The connected PostgreSQL database has no tables. Initialising creates every table and loads the demo record (three Merit Opens, personas, sealed packages). This only ever runs on an empty database.</p><form method="post">${keyField}<button style="font:600 15px ui-sans-serif,system-ui;background:#0f1613;color:#faf8f2;border:0;padding:12px 20px;border-radius:3px;cursor:pointer">Initialise database</button></form>`);
}

export async function POST(req: Request) {
  const started = Date.now();
  try {
    const form = await req.formData().catch(() => null);
    const envKey = process.env.ADMINISTRATOR_SEAL_KEY ?? '';
    const sealKey = envKey.length === 64 ? envKey : String(form?.get('sealKey') ?? '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(sealKey)) return page('Seal key required', `<p style="color:#a4522c">Enter a 64-character hexadecimal seal key. <a href="/api/setup">Back</a></p>`);
    const r = await initializeDatabase(db, sealKey);
    const reminder = envKey.length === 64 ? '' : `<p style="color:#7f5711"><strong>Now add this to Vercel</strong> → Settings → Environment Variables, then redeploy:<br>${code(`ADMINISTRATOR_SEAL_KEY=${sealKey}`)}</p>`;
    return page('Initialised', `<p>${r.statements} statements · ${Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(' · ')} · ${Math.round((Date.now() - started) / 1000)}s</p>${reminder}<p><a href="/">Open the site →</a> · <a href="/sign-in">Sign in as a persona</a> · <a href="/api/health">Health</a></p>`);
  } catch (e) {
    return page('Initialisation failed', `<p style="color:#a4522c">${esc(redact(e instanceof Error ? e.message : String(e)))}</p><p><a href="/api/setup">Back</a></p>`);
  }
}
