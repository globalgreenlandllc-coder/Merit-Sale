// Picks the Prisma schema variant from DATABASE_URL: file: → SQLite (local), anything else → PostgreSQL.
// Writes prisma/schema.prisma (git-ignored). Run before generate/push/seed; wired into the npm scripts.
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
if (!process.env.DATABASE_URL) {
  const envPath = join(here, '..', '.env');
  if (existsSync(envPath)) for (const line of readFileSync(envPath, 'utf8').split('\n')) { const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]*)"?/); if (m) process.env.DATABASE_URL = m[1]; }
}
const url = process.env.DATABASE_URL ?? '';
const variant = url.startsWith('file:') ? 'sqlite' : 'postgresql';
copyFileSync(join(here, 'variants', `${variant}.prisma`), join(here, 'schema.prisma'));
console.log(`prisma: using ${variant} schema${url ? '' : ' (DATABASE_URL not set; defaulting to PostgreSQL)'}`);
