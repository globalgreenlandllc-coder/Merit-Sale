import 'server-only';
import { canonicalJson, hashObject, sha256Hex } from '@etk/rules-config';
import { db } from '@/lib/db';

export interface AuditInput {
  actorId?: string | null;
  actorRole: string;
  action: string;
  objectType: string;
  objectId: string;
  before?: unknown;
  after?: unknown;
  detail?: unknown;
  ip?: string | null;
}

/**
 * Append-only audit log with a hash chain (spec §7). Each entry's hash covers its
 * content and the previous entry's hash, so any edit or deletion breaks the chain.
 */
export async function audit(input: AuditInput) {
  const last = await db.auditEvent.findFirst({ orderBy: { seq: 'desc' }, select: { entryHash: true } });
  const timestamp = new Date();
  const beforeHash = input.before === undefined ? null : hashObject(input.before);
  const afterHash = input.after === undefined ? null : hashObject(input.after);
  const detailJson = input.detail === undefined ? null : canonicalJson(input.detail);
  const body = {
    prevHash: last?.entryHash ?? null,
    actorId: input.actorId ?? null,
    actorRole: input.actorRole,
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId,
    beforeHash,
    afterHash,
    detailJson,
    timestamp: timestamp.toISOString(),
  };
  const entryHash = sha256Hex(canonicalJson(body));
  return db.auditEvent.create({
    data: { ...body, timestamp, entryHash, ip: input.ip ?? null },
  });
}

export async function verifyAuditChain(): Promise<{ ok: boolean; checked: number; brokenAtSeq: number | null }> {
  const rows = await db.auditEvent.findMany({ orderBy: { seq: 'asc' } });
  let prev: string | null = null;
  for (const r of rows) {
    const body = {
      prevHash: r.prevHash, actorId: r.actorId, actorRole: r.actorRole, action: r.action, objectType: r.objectType,
      objectId: r.objectId, beforeHash: r.beforeHash, afterHash: r.afterHash, detailJson: r.detailJson, timestamp: r.timestamp.toISOString(),
    };
    if (r.prevHash !== prev || sha256Hex(canonicalJson(body)) !== r.entryHash) return { ok: false, checked: rows.length, brokenAtSeq: r.seq };
    prev = r.entryHash;
  }
  return { ok: true, checked: rows.length, brokenAtSeq: null };
}
