import { env } from '@/lib/env';
import { markChargeback, settleRegistration } from '@/modules/registrations/service';

/** Stripe webhook: settlement confirms the registration; a dispute disqualifies (Rules 12.5). */
export async function POST(req: Request) {
  if (!env.stripeSecretKey || !env.stripeWebhookSecret) return new Response('Stripe not configured', { status: 503 });
  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(env.stripeSecretKey);
  const sig = req.headers.get('stripe-signature') ?? '';
  const raw = await req.text();
  let event: import('stripe').Stripe.Event;
  try { event = stripe.webhooks.constructEvent(raw, sig, env.stripeWebhookSecret); } catch (e) { return new Response(`Signature error: ${e instanceof Error ? e.message : 'invalid'}`, { status: 400 }); }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const registrationId = session.metadata?.registrationId;
    if (registrationId && session.payment_status === 'paid') {
      await settleRegistration(registrationId, { processorRef: String(session.payment_intent ?? session.id), custodianRef: env.stripeCustodianAccountId || null, provider: 'stripe', amountCents: session.amount_total ?? 0 });
    }
  }
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object;
    const pi = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id;
    if (pi) await markChargeback(pi);
  }
  return Response.json({ received: true });
}
