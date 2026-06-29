import { describe, it, expect } from 'vitest';
import { SAMPLE_WORLD } from '../../model/sample.ts';
import { reachableTiles, walkable } from '../../render/tiles.ts';
import { validateMap } from './mapValidate.ts';

describe('map validation', () => {
  it('walkable() matches the terrain legend', () => {
    expect(walkable('.')).toBe(true);
    expect(walkable(',')).toBe(true);
    expect(walkable('#')).toBe(false);
    expect(walkable('o')).toBe(false);
  });

  it('floods reachable tiles from spawn', () => {
    const town = SAMPLE_WORLD.maps.find((m) => m.id === 'town');
    expect(town).toBeDefined();
    if (town) {
      const reached = reachableTiles(town);
      expect(reached.has(`${String(town.spawn.x)},${String(town.spawn.y)}`)).toBe(true);
      expect(reached.size).toBeGreaterThan(20);
    }
  });

  it('the sample maps validate with no errors', () => {
    for (const m of SAMPLE_WORLD.maps) {
      const errors = validateMap(m, SAMPLE_WORLD).filter((i) => i.level === 'error');
      expect(errors, `${m.id}: ${JSON.stringify(errors)}`).toEqual([]);
    }
  });
});
