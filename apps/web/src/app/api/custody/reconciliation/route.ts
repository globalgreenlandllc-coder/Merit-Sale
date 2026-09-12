import { assertRole, Forbidden } from '@/lib/auth/guards';
import { audit } from '@/lib/audit';
import { reconciliation, reconciliationCsv } from '@/lib/custody';

export const dynamic = 'force-dynamic';

/** Reconciliation export for the custodian, auditor, or Administrator: payments by reference, never by name. */
export async function GET(req: Request) {
  let s;
  try { s = await assertRole(['auditor', 'administrator', 'admin']); } catch (e) { if (e instanceof Forbidden) return new Response(e.message, { status: 403 }); throw e; }
  const url = new URL(req.url);
  const openId = url.searchParams.get('open') || undefined;
  const from = url.searchParams.get('from'); const to = url.searchParams.get('to');
  const rows = await reconciliation({ openId, from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'custody.reconciliation.export', objectType: 'Payment', objectId: openId ?? 'all', detail: { rows: rows.length, from, to } });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(reconciliationCsv(rows), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="custody-reconciliation-${stamp}.csv"`, 'cache-control': 'no-store' } });
}
