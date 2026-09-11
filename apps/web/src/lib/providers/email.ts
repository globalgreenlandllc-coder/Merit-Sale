import 'server-only';

/**
 * Transactional email. Resend when RESEND_API_KEY is set (a REST call, no SDK); otherwise the
 * message is written to the server log and reported as not delivered, so a deployment without
 * a provider is loud rather than silent.
 */
export interface OutgoingEmail { to: string; subject: string; text: string; html?: string }

export function emailProviderName(): 'resend' | 'log' {
  return process.env.RESEND_API_KEY ? 'resend' : 'log';
}

export async function sendEmail(msg: OutgoingEmail): Promise<{ delivered: boolean; via: 'resend' | 'log'; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'Earn the Keys <onboarding@resend.dev>';
  if (!key) {
    console.log(`[email not delivered — no provider] to=${msg.to} subject=${JSON.stringify(msg.subject)}\n${msg.text}`);
    return { delivered: false, via: 'log' };
  }
  try {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }) });
    if (!r.ok) { const body = await r.text().catch(() => ''); console.error(`[email] resend ${r.status}: ${body.slice(0, 300)}`); return { delivered: false, via: 'resend', error: `Resend responded ${r.status}` }; }
    return { delivered: true, via: 'resend' };
  } catch (e) {
    console.error('[email] resend request failed', e);
    return { delivered: false, via: 'resend', error: e instanceof Error ? e.message : 'request failed' };
  }
}
