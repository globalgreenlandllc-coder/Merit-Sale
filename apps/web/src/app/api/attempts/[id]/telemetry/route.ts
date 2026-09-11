import { appendFocusEvents } from '@/modules/rounds/service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { sessionToken?: string; events?: { type: string; at: number }[] } = {};
  try { body = await req.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  if (!body.sessionToken || !Array.isArray(body.events)) return Response.json({ ok: false }, { status: 400 });
  const ok = await appendFocusEvents(id, body.sessionToken, body.events.slice(0, 100));
  return Response.json({ ok }, { status: ok ? 200 : 403 });
}
