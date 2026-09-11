export * from './hash';
export * from './schema';
import { canonicalJson, sha256Hex } from './hash';
import { RulesetConfigSchema, type RulesetConfig } from './schema';

/** The rules hash published at lock: SHA-256 over the canonical JSON of the parsed config plus the rules text. */
export function hashRuleset(config: RulesetConfig, officialRulesText: string): string {
  const parsed = RulesetConfigSchema.parse(config);
  return sha256Hex(canonicalJson({ config: parsed, officialRulesText }));
}
