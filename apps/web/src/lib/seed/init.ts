import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { runSeed } from './demo';

/** True when the core table exists in the connected database. */
export async function tablesExist(db: PrismaClient): Promise<boolean> {
  try { await db.$queryRawUnsafe('SELECT 1 FROM "MeritOpen" LIMIT 1'); return true; } catch { return false; }
}

function ddlStatements(): string[] {
  const sql = readFileSync(join(process.cwd(), 'prisma', 'sql', 'init.postgresql.sql'), 'utf8');
  return sql.split(/;\s*\n/).map((s) => s.replace(/^\s*--.*$/gm, '').trim()).filter((s) => s.length > 0);
}

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
