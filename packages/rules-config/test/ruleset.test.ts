import { describe, expect, it } from 'vitest';
import { canTransition, canonicalJson, hashRuleset, parseRuleset, sha256Hex } from '../src';

const base = {
  version: '1.0', meritOpenSlug: 'demo', registrationFeeCents: 2500, cashComponentCents: 17500000,
  eligibleStates: ['WA'], registrationOpenAt: '2026-10-01T00:00:00Z', registrationCloseAt: '2026-11-01T00:00:00Z',
  rounds: [{ number: 'r1', durationSeconds: 60, integrityTier: 1, itemCount: 1 }],
  advanceN: 2000, advanceM: 100, tieOrderSubsets: { r2: [8, 9, 10], r3: [10, 11, 12] },
  retention: {}, technicalFailurePolicy: 'Exhibit E', accommodationPolicy: 'Section 8.7',
  cancellationReasonCodes: [], termsVersion: '1.0', privacyVersion: '1.0',
  parties: { sponsor: 'S', propertyOwner: 'P', administrator: 'A', custodian: 'C' },
};

describe('ruleset', () => {
  it('canonical JSON is key-order independent', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 1, c: 2 }] })).toBe(canonicalJson({ a: [{ c: 2, d: 1 }], b: 1 }));
  });
  it('hash is stable and changes with any value', () => {
    const cfg = parseRuleset(base);
    const h1 = hashRuleset(cfg, 'rules');
    expect(h1).toHaveLength(64);
    expect(hashRuleset(cfg, 'rules')).toBe(h1);
    expect(hashRuleset({ ...cfg, registrationFeeCents: 2501 }, 'rules')).not.toBe(h1);
    expect(hashRuleset(cfg, 'rules ')).not.toBe(h1);
  });
  it('sha256 of known vector', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('state machine forbids skipping and backwards moves', () => {
    expect(canTransition('registration', 'r1')).toBe(true);
    expect(canTransition('registration', 'r2')).toBe(false);
    expect(canTransition('r2', 'registration')).toBe(false);
    expect(canTransition('r2', 'cancelled')).toBe(true);
    expect(canTransition('complete', 'cancelled')).toBe(false);
  });
});
