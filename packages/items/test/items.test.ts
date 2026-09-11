import { describe, expect, it } from 'vitest';
import { buildPackage, parsePackage, sealPackage, toPublicItems, unsealPackage, validateForm, validateItem, verifyPackage } from '../src';

const good = {
  id: 'i1', position: 1, inputType: 'integer' as const, maxPoints: 1,
  prompt: 'A sequence starts 3, 5 and each later term is the previous term plus twice the term before it. What is the sixth term?',
  scoring: { kind: 'numeric' as const, answer: 85, points: 1 },
};

describe('validateItem', () => {
  it('accepts a well-formed free-response item', () => {
    expect(validateItem(good)).toMatchObject({ ok: true, problems: [] });
  });
  it('rejects trivial defaults', () => {
    expect(validateItem({ ...good, scoring: { kind: 'numeric', answer: 0, points: 1 } }).ok).toBe(false);
  });
  it('rejects select-from-list prompts', () => {
    expect(validateItem({ ...good, prompt: 'Which of the following is the sixth term of the sequence described here?' }).problems.join()).toMatch(/select-from-list/);
  });
  it('rejects mismatched maxPoints and inputType', () => {
    expect(validateItem({ ...good, maxPoints: 2 }).ok).toBe(false);
    expect(validateItem({ ...good, inputType: 'ordering' }).ok).toBe(false);
  });
  it('form positions must be 1..n', () => {
    expect(validateForm([good, { ...good, id: 'i2', position: 3 }]).problems.join()).toMatch(/positions/);
  });
});

describe('sealed package', () => {
  const key = 'a'.repeat(64);
  const pkg = { meritOpenSlug: 'demo', round: 'r1', label: 'primary' as const, formId: 'f1', items: [good], authoredAt: '2026-09-10T00:00:00Z' };
  it('hash commits to exact released bytes and survives the seal round-trip', () => {
    const { plaintext, hash } = buildPackage(pkg);
    const sealed = sealPackage(plaintext, key);
    expect(sealed).not.toContain('85');
    const opened = unsealPackage(sealed, key);
    expect(opened).toBe(plaintext);
    expect(verifyPackage(opened, hash)).toBe(true);
    expect(verifyPackage(opened.replace('85', '86'), hash)).toBe(false);
    expect(parsePackage(opened).items[0]?.scoring).toMatchObject({ answer: 85 });
  });
  it('wrong key cannot open the package', () => {
    const { plaintext } = buildPackage(pkg);
    expect(() => unsealPackage(sealPackage(plaintext, key), 'b'.repeat(64))).toThrow();
  });
  it('public items never carry the key', () => {
    const pub = toPublicItems(pkg);
    expect(JSON.stringify(pub)).not.toMatch(/scoring|answer/);
  });
});
