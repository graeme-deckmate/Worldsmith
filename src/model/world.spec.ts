import { describe, it, expect } from 'vitest';
import { emptyWorld, parseWorld, migrate, SCHEMA_VERSION } from './world.ts';
import { validateWorld } from './validate.ts';
import { SAMPLE_WORLD } from './sample.ts';

describe('World model', () => {
  it('builds a valid empty world', () => {
    const w = emptyWorld('test_world', 'Test World');
    expect(w.meta.id).toBe('test_world');
    expect(w.meta.schemaVersion).toBe(SCHEMA_VERSION);
    expect(w.elements).toEqual([]);
  });

  it('round-trips a world through JSON + parseWorld', () => {
    const json = JSON.stringify(SAMPLE_WORLD);
    const res = parseWorld(JSON.parse(json));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.world).toEqual(SAMPLE_WORLD);
  });

  it('rejects malformed worlds with a helpful error', () => {
    const res = parseWorld({ meta: { id: 'x' } });
    expect(res.ok).toBe(false);
  });

  it('rejects bad ids and duplicate ids', () => {
    const bad = parseWorld({
      ...SAMPLE_WORLD,
      elements: [...SAMPLE_WORLD.elements, SAMPLE_WORLD.elements[0]],
    });
    expect(bad.ok).toBe(false);
  });

  it('migrate stamps the current schema version', () => {
    const out = migrate({ meta: { id: 'a', name: 'A', schemaVersion: 0 } }) as {
      meta: { schemaVersion: number };
    };
    expect(out.meta.schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe('sample world', () => {
  it('passes cross-reference validation with zero errors', () => {
    const issues = validateWorld(SAMPLE_WORLD);
    const errors = issues.filter((i) => i.level === 'error');
    expect(errors).toEqual([]);
  });

  it('has the expected wired maps and a boss-gated keep', () => {
    expect(SAMPLE_WORLD.maps.map((m) => m.id).sort()).toEqual(['keep', 'meadow_map', 'town']);
    const gate = SAMPLE_WORLD.gates[0];
    expect(gate?.to).toBe('keep');
    expect(gate?.when).toEqual({ type: 'bossDefeated', boss: 'emberlord' });
  });
});
