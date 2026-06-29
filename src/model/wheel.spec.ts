import { describe, it, expect } from 'vitest';
import { zReaction, zSurge, zTwinPair } from './spellcraft.ts';
import { parseWorld } from './world.ts';
import { validateWorld } from './validate.ts';
import { SAMPLE_WORLD } from './sample.ts';

describe('wheel effect schemas', () => {
  it('accepts an authored reaction effect', () => {
    const r = zReaction.parse({
      id: 'shatter', setup: 'chilled', trigger: 'volt', line: 'SHATTER',
      effect: { hitBonus: 0.6, applyStatus: { status: 'shocked', turns: 2 } },
    });
    expect(r.effect?.hitBonus).toBe(0.6);
  });
  it('accepts surge + twin-rider effects', () => {
    expect(zSurge.parse({ roll: 3, severity: 'mild', id: 'bite', effect: { damage: 2 } }).effect?.damage).toBe(2);
    expect(zTwinPair.parse({ a: 'ember', b: 'volt', prefix: 'Storm', rider: 'storm', effect: { arcFrac: 0.5 } }).effect?.arcFrac).toBe(0.5);
  });
});

describe('wheel validation + round-trip', () => {
  it('round-trips a world carrying wheel effects', () => {
    const w = {
      ...SAMPLE_WORLD,
      wheel: {
        ...SAMPLE_WORLD.wheel,
        reactions: [{ id: 'melt', setup: 'chilled', trigger: 'ember', line: 'melt', effect: { hitBonus: 0.4 } }],
      },
    };
    const res = parseWorld(JSON.parse(JSON.stringify(w)));
    expect(res.ok).toBe(true);
  });
  it('flags a reaction whose setup status does not exist', () => {
    const w = {
      ...SAMPLE_WORLD,
      wheel: { ...SAMPLE_WORLD.wheel, reactions: [{ id: 'bad', setup: 'nope', trigger: 'ember', line: '' }] },
    };
    const errors = validateWorld(w).filter((i) => i.level === 'error' && i.where.startsWith('wheel.reaction'));
    expect(errors.length).toBeGreaterThan(0);
  });
});
