import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { canonicalJson, sha256Hex } from '@etk/rules-config';
import { FormPackageSchema, type FormPackage, type PublicItem } from './schema';

/**
 * Hash commitment (Rules 7.1). The bytes that are hashed are exactly the bytes
 * released later, so `sha256sum package.json` reproduces the published hash.
 */
export function buildPackage(pkg: FormPackage): { plaintext: string; hash: string } {
  const parsed = FormPackageSchema.parse(pkg);
  const plaintext = canonicalJson(parsed);
  return { plaintext, hash: sha256Hex(plaintext) };
}

export function verifyPackage(plaintext: string, expectedHash: string): boolean {
  return sha256Hex(plaintext) === expectedHash;
}

function keyBytes(keyHex: string): Buffer {
  const k = Buffer.from(keyHex.trim(), 'hex');
  if (k.length !== 32) throw new Error('ADMINISTRATOR_SEAL_KEY must be 32 bytes (64 hex chars)');
  return k;
}

/**
 * AES-256-GCM under the Administrator-held key. Output: base64(iv | tag | ciphertext).
 * The IV is random — this is encryption, not scoring; nothing here influences any outcome.
 */
export function sealPackage(plaintext: string, keyHex: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(keyHex), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

export function unsealPackage(sealed: string, keyHex: string): string {
  const buf = Buffer.from(sealed, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(keyHex), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

export function parsePackage(plaintext: string): FormPackage {
  return FormPackageSchema.parse(JSON.parse(plaintext));
}

/** Strip scoring specs before anything leaves the server toward a registrant. */
export function toPublicItems(pkg: FormPackage): PublicItem[] {
  return pkg.items
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(({ scoring: _scoring, ...rest }) => rest);
}
