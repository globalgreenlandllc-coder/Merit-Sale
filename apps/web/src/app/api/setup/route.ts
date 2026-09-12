import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { ensureSchema, initializeDatabase, tablesExist } from '@/lib/seed/init';
import { backfillDemoPhotos } from '@/lib/seed/photos';
import { bootstrapSwitchOpen, isSiteMode, siteModeState, storeSiteMode, switchSiteMode } from '@/lib/site-mode';

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
    const [opens, users, mode] = await Promise.all([db.meritOpen.count(), db.user.count(), siteModeState()]);
    const other = mode.mode === 'demo' ? 'live' : 'demo';
    const modeBlock = mode.locked
      ? `<p>Site mode: <strong>${mode.mode}</strong>, pinned by ${code('SITE_MODE')} in the environment.</p>`
      : bootstrapSwitchOpen()
        ? `<form method="post"><input type="hidden" name="action" value="mode"><input type="hidden" name="mode" value="${other}"><p>Site mode: <strong>${mode.mode}</strong> (${mode.source === 'setting' ? 'stored setting' : 'default'}). ${mode.mode === 'demo' ? 'Sample listings, sample photographs, and one-click personas are public.' : 'Sample listings are hidden and sign-in needs an email code, but no staff address is listed, so nobody can reach the console.'} This switch is available here only until a platform admin address is listed (${code('PLATFORM_ADMIN_EMAILS')}); after that it lives in the console under Site mode.</p><button style="font:600 15px ui-sans-serif,system-ui;background:${other === 'demo' ? '#7f5711' : '#1f3b2e'};color:#faf8f2;border:0;padding:12px 20px;border-radius:3px;cursor:pointer">${other === 'demo' ? 'Enter demonstration mode' : 'Go live'}</button></form>`
        : `<p>Site mode: <strong>${mode.mode}</strong>. Switch it in the console: sign in as a listed platform admin → Site mode.</p>`;
    return page('Database is initialised', `<p>${opens} Merit Opens · ${users} users.</p>${modeBlock}<form method="post"><input type="hidden" name="action" value="update"><p>After a code update that adds tables or indexes, apply the schema changes here. Only missing objects are created; nothing is altered or dropped. In demonstration mode, sample properties without photography receive the sample photographs.</p><button style="font:600 15px ui-sans-serif,system-ui;background:#0f1613;color:#faf8f2;border:0;padding:12px 20px;border-radius:3px;cursor:pointer">Apply schema updates</button></form><p><a href="/">Open the site →</a> · <a href="/api/health">Health report</a></p>`);
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
    const action = String(form?.get('action') ?? '');
    if (action === 'mode') {
      const mode = String(form?.get('mode') ?? '');
      if (!isSiteMode(mode)) return page('Unknown mode', `<p><a href="/api/setup">Back</a></p>`);
      if (!bootstrapSwitchOpen()) return page('Switch from the console', `<p>A staff address is listed on this deployment, so the mode is changed from the console (Site mode), not here. <a href="/api/setup">Back</a></p>`);
      const r = await switchSiteMode(mode, { force: true });
      if (!r.ok) return page('Mode not changed', `<p style="color:#a4522c">${esc(r.reason ?? '')}</p><p><a href="/api/setup">Back</a></p>`);
      return page(`Site is now in ${mode} mode`, `<p>${mode === 'demo' ? `Sample photographs loaded onto ${r.photos ?? 0} propert${r.photos === 1 ? 'y' : 'ies'}; personas and direct sign-in are on.` : `Sample photographs removed from ${r.photos ?? 0} propert${r.photos === 1 ? 'y' : 'ies'}; sample listings are hidden and sign-in needs an email code.`}</p><p><a href="/">Open the site →</a> · <a href="/sign-in">Sign in</a> · <a href="/api/setup">Back</a></p>`);
    }
    if (action === 'update') {
      const r = await ensureSchema(db);
      const photos = (await siteModeState()).mode === 'demo' ? await backfillDemoPhotos(db).catch(() => 0) : 0;
      return page(r.failed.length ? 'Schema update finished with errors' : 'Schema is current', `<p>${r.applied} objects created · ${r.skipped} already existed${photos ? ` · sample photography loaded onto ${photos} propert${photos === 1 ? 'y' : 'ies'}` : ''}.</p>${r.failed.length ? `<pre style="white-space:pre-wrap;color:#a4522c;font:12px ui-monospace,monospace">${esc(r.failed.join('\n'))}</pre>` : ''}<p><a href="/api/setup">Back</a> · <a href="/api/health">Health</a></p>`);
    }
    const envKey = process.env.ADMINISTRATOR_SEAL_KEY ?? '';
    const sealKey = envKey.length === 64 ? envKey : String(form?.get('sealKey') ?? '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(sealKey)) return page('Seal key required', `<p style="color:#a4522c">Enter a 64-character hexadecimal seal key. <a href="/api/setup">Back</a></p>`);
    const r = await initializeDatabase(db, sealKey);
    await storeSiteMode('demo'); // the sample record was just loaded: this is a demonstration until an admin goes live
    const reminder = envKey.length === 64 ? '' : `<p style="color:#7f5711"><strong>Now add this to Vercel</strong> → Settings → Environment Variables, then redeploy:<br>${code(`ADMINISTRATOR_SEAL_KEY=${sealKey}`)}</p>`;
    return page('Initialised', `<p>${r.statements} statements · ${Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(' · ')} · ${Math.round((Date.now() - started) / 1000)}s</p>${reminder}<p><a href="/">Open the site →</a> · <a href="/sign-in">Sign in as a persona</a> · <a href="/api/health">Health</a></p>`);
  } catch (e) {
    return page('Initialisation failed', `<p style="color:#a4522c">${esc(redact(e instanceof Error ? e.message : String(e)))}</p><p><a href="/api/setup">Back</a></p>`);
  }
}
