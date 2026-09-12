import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { runSeed } from './demo';

/** True when the core table exists in the connected database. */
export async function tablesExist(db: PrismaClient): Promise<boolean> {
  try { await db.$queryRawUnsafe('SELECT 1 FROM "MeritOpen" LIMIT 1'); return true; } catch { return false; }
}

function statementsOf(file: string): string[] {
  const sql = readFileSync(join(process.cwd(), 'prisma', 'sql', file), 'utf8');
  return sql.split(/;\s*\n/).map((s) => s.replace(/^\s*--.*$/gm, '').trim()).filter((s) => s.length > 0);
}
const ddlStatements = () => statementsOf('init.postgresql.sql');
/** Column additions and other idempotent follow-ups for databases created before a schema change. */
const updateStatements = () => statementsOf('updates.postgresql.sql');

/**
 * Initialise an EMPTY PostgreSQL database: create every table from the checked-in DDL,
 * then load the demo seed. Refuses to run when tables already exist, so it can never
 * destroy data. Requires ADMINISTRATOR_SEAL_KEY so the seeded packages can be unsealed later.
 */
export async function initializeDatabase(db: PrismaClient, sealKey: string): Promise<{ statements: number; counts: Record<string, number> }> {
  if (await tablesExist(db)) throw new Error('Tables already exist; initialisation only runs on an empty database.');
  if (sealKey.length !== 64) throw new Error('ADMINISTRATOR_SEAL_KEY (64 hex characters) must be set before initialising.');
  const statements = ddlStatements();
  for (const s of statements) await db.$executeRawUnsafe(s);
  const counts = await runSeed(db, sealKey);
  return { statements: statements.length, counts };
}

const DUPLICATE_CODES = new Set(['42P07', '42710', '42P06', '42701', '23505']);

/**
 * Apply the checked-in DDL to an existing database, creating only what is missing.
 * Statements whose objects already exist are skipped (duplicate-object errors are ignored),
 * so this never alters or drops anything that is already there.
 */
export async function ensureSchema(db: PrismaClient): Promise<{ applied: number; skipped: number; failed: string[] }> {
  let applied = 0, skipped = 0; const failed: string[] = [];
  for (const st of [...ddlStatements(), ...updateStatements()]) {
    try { await db.$executeRawUnsafe(st); applied++; }
    catch (e) {
      const code = (e as { meta?: { code?: string } })?.meta?.code ?? (e as { code?: string })?.code ?? '';
      const msg = e instanceof Error ? e.message : String(e);
      if (DUPLICATE_CODES.has(String(code)) || /already exists/i.test(msg)) skipped++; else failed.push(`${st.slice(0, 60)}… → ${msg.split('\n')[0]}`);
    }
  }
  return { applied, skipped, failed };
}
