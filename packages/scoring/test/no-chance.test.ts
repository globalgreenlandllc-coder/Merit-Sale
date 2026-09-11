import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

describe('no chance anywhere (Rules 4, 5; Design 6.1)', () => {
  it('the scoring package never calls a random source', () => {
    for (const f of readdirSync(src)) {
      const text = readFileSync(join(src, f), 'utf8');
      expect(text, f).not.toMatch(/Math\.random|crypto\.getRandomValues|randomBytes|randomInt|shuffle/);
    }
  });
});
