import { describe, it, expect } from 'vitest';
import { SAMPLES } from './samples.ts';
import { validateWorld } from './validate.ts';
import { parseWorld } from './world.ts';

describe('sample worlds', () => {
  for (const s of SAMPLES) {
    it(`${s.id} validates with no errors`, () => {
      const errors = validateWorld(s.world).filter((i) => i.level === 'error');
      expect(errors, JSON.stringify(errors)).toEqual([]);
    });
    it(`${s.id} round-trips through JSON`, () => {
      const res = parseWorld(JSON.parse(JSON.stringify(s.world)));
      expect(res.ok).toBe(true);
    });
  }
});
