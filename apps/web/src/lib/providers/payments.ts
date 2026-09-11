import 'server-only';
import { env } from '@/lib/env';

export type CheckoutResult =
  | { kind: 'settled'; processorRef: string; custodianRef: string }
  | { kind: 'redirect'; url: string; processorRef: string };

export interface PaymentProvider {
  name: string;
  /** Settlement destination is the custodian, never the platform (Rules 12.1). */
  createCheckout(args: { registrationId: string; amountCents: number; currency: string; email: string; description: string; successUrl: string; cancelUrl: string }): Promise<CheckoutResult>;
  refund(args: { processorRef: string; amountCents: number; reason: string }): Promise<{ ok: boolean; ref?: string; error?: string }>;
}

class MockPaymentProvider implements PaymentProvider {
  name = 'mock';
  async createCheckout(args: Parameters<PaymentProvider['createCheckout']>[0]): Promise<CheckoutResult> {
    const stamp = Date.now().toString(36);
    return { kind: 'settled', processorRef: `mock_pi_${args.registrationId.slice(-6)}_${stamp}`, custodianRef: `mock_custody_${stamp}` };
  }
  async refund(args: Parameters<PaymentProvider['refund']>[0]) {
    return { ok: true, ref: `mock_re_${args.processorRef.slice(-8)}` };
  }
}

class StripePaymentProvider implements PaymentProvider {
  name = 'stripe';
  private async client() {
    const { default: Stripe } = await import('stripe');
    return new Stripe(env.stripeSecretKey);
  }
  async createCheckout(args: Parameters<PaymentProvider['createCheckout']>[0]): Promise<CheckoutResult> {
    const stripe = await this.client();
    if (!env.stripeCustodianAccountId) throw new Error('STRIPE_CUSTODIAN_ACCOUNT_ID is required: registration fees must settle to the custodian, not the platform.');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: args.email,
      line_items: [{ quantity: 1, price_data: { currency: args.currency, unit_amount: args.amountCents, product_data: { name: args.description } } }],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: { registrationId: args.registrationId },
      payment_intent_data: {
        metadata: { registrationId: args.registrationId },
        on_behalf_of: env.stripeCustodianAccountId,
        transfer_data: { destination: env.stripeCustodianAccountId },
      },
    });
    return { kind: 'redirect', url: session.url!, processorRef: session.id };
  }
  async refund(args: Parameters<PaymentProvider['refund']>[0]) {
    const stripe = await this.client();
    try {
      const r = await stripe.refunds.create({ payment_intent: args.processorRef, amount: args.amountCents, reverse_transfer: true, refund_application_fee: true });
      return { ok: true, ref: r.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

export function getPaymentProvider(): PaymentProvider {
  if (env.paymentsProvider === 'stripe' && env.stripeSecretKey) return new StripePaymentProvider();
  return new MockPaymentProvider();
}
