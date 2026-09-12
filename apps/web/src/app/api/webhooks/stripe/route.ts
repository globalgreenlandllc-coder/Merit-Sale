import { env } from '@/lib/env';
import { audit } from '@/lib/audit';
import { markChargeback, markProcessorRefund, settleRegistration } from '@/modules/registrations/service';

/** Stripe webhook: settlement confirms the registration; a dispute disqualifies (Rules 12.5). */
export async function POST(req: Request) {
  if (!env.stripeSecretKey || !env.stripeWebhookSecret) return new Response('Stripe not configured', { status: 503 });
  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(env.stripeSecretKey);
  const sig = req.headers.get('stripe-signature') ?? '';
  const raw = await req.text();
  let event: import('stripe').Stripe.Event;
  try { event = stripe.webhooks.constructEvent(raw, sig, env.stripeWebhookSecret); } catch (e) { return new Response(`Signature error: ${e instanceof Error ? e.message : 'invalid'}`, { status: 400 }); }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    const registrationId = session.metadata?.registrationId;
    if (registrationId && session.payment_status === 'paid') {
      await settleRegistration(registrationId, { processorRef: String(session.payment_intent ?? session.id), custodianRef: env.stripeCustodianAccountId || null, provider: 'stripe', amountCents: session.amount_total ?? 0 });
    }
  }
  if (event.type === 'charge.refunded') {
    // a refund issued at the processor (by the custodian or support) is mirrored so the ledger never disagrees with the statement
    const charge = event.data.object;
    const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (pi && charge.refunded) await markProcessorRefund(pi, charge.amount_refunded, charge.refunds?.data[0]?.id ?? null);
  }
  if (event.type === 'charge.dispute.closed') {
    const dispute = event.data.object;
    const pi = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id;
    await audit({ actorRole: 'system', action: 'payment.dispute.closed', objectType: 'Payment', objectId: pi ?? dispute.id, detail: { status: dispute.status, reason: dispute.reason, amount: dispute.amount } });
  }
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object;
    const pi = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id;
    if (pi) await markChargeback(pi);
  }
  return Response.json({ received: true });
}
