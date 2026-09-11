import 'server-only';
import { env } from '@/lib/env';

/** Identity verification adapter. We store the vendor reference and status only — never images (spec §11). */
export interface IdentityProvider {
  name: string;
  verify(args: { userId: string; level: 'light' | 'full'; legalName: string; dob: Date; state: string }): Promise<{ vendorRef: string; status: 'verified' | 'pending' | 'failed' }>;
}

class MockIdentityProvider implements IdentityProvider {
  name = 'mock';
  async verify(args: Parameters<IdentityProvider['verify']>[0]) {
    return { vendorRef: `mock_idv_${args.level}_${args.userId.slice(-6)}`, status: 'verified' as const };
  }
}

export function getIdentityProvider(): IdentityProvider {
  // Persona / Veriff / Jumio / Stripe Identity adapters slot in here keyed by IDV_PROVIDER.
  void env.idvProvider;
  return new MockIdentityProvider();
}

export interface SanctionsProvider {
  name: string;
  screen(args: { legalName: string; dob: Date | null; state: string | null }): Promise<{ status: 'clear' | 'hit'; ref: string }>;
}

class MockSanctionsProvider implements SanctionsProvider {
  name = 'mock';
  async screen() { return { status: 'clear' as const, ref: `mock_ofac_${Date.now().toString(36)}` }; }
}

export function getSanctionsProvider(): SanctionsProvider {
  void env.sanctionsProvider;
  return new MockSanctionsProvider();
}
