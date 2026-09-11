/* eslint-disable no-console */
// CLI wrapper: loads .env, then runs the demo seed from src/lib/seed/demo.ts against DATABASE_URL.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { runSeed } from '../src/lib/seed/demo';

for (const p of [resolve(process.cwd(), '.env'), resolve(process.cwd(), 'apps/web/.env')]) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = m[2] ?? '';
  }
}
const db = new PrismaClient();
runSeed(db, process.env.ADMINISTRATOR_SEAL_KEY ?? '').catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
