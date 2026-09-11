/**
 * Development helper: print a signed session cookie for a seeded persona so the app
 * can be driven by curl or a headless browser. Local auth provider only.
 *   npx tsx scripts/dev-session.mts ada@example.test
 *   npx tsx scripts/dev-session.mts --all      # JSON of every persona + demo ids
 */
import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';
const db = new PrismaClient();
const secret = process.env.SESSION_SECRET ?? 'dev-only-change-me-before-any-deploy';
const enc = (u: { id: string; role: string; email: string; legalName: string | null }) => { const payload = Buffer.from(JSON.stringify({ userId: u.id, role: u.role, email: u.email, name: u.legalName, issuedAt: Date.now() })).toString('base64url'); return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`; };
const arg = process.argv[2];
if (arg && arg !== '--all') {
  const u = await db.user.findUniqueOrThrow({ where: { email: arg } });
  console.log(enc(u));
} else {
  const out: Record<string, string> = {};
  for (const email of ['ada@example.test', 'dima@earnthekeys.test', 'administrator@meridian-verification.test', 'counsel@auditor.test']) { const u = await db.user.findUniqueOrThrow({ where: { email } }); out[u.role] = enc(u); }
  const pa = await db.meritOpen.findUniqueOrThrow({ where: { slug: 'practice-autumn' }, include: { rounds: true } });
  out.paOpenId = pa.id; out.paR1 = pa.rounds.find((r) => r.number === 'r1')!.id; out.paR2 = pa.rounds.find((r) => r.number === 'r2')!.id;
  const ch = await db.meritOpen.findUniqueOrThrow({ where: { slug: 'cedar-hollow' }, include: { forms: true } });
  out.chOpenId = ch.id; out.chForm = ch.forms[0]!.id;
  const hc = await db.meritOpen.findUniqueOrThrow({ where: { slug: 'hollow-creek' } }); out.hcOpenId = hc.id;
  console.log(JSON.stringify(out));
}
await db.$disconnect();
