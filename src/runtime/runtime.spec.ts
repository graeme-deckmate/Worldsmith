import { describe, it, expect } from 'vitest';
import { SAMPLE_WORLD } from '../model/sample.ts';
import { indexWorld } from './worldIndex.ts';
import { evalCondition, type RunState } from './conditions.ts';
import { castSpell, initBattle, playerMaxHp, playerMaxMp, type BattlePlayer } from './battle.ts';
import { mulberry32 } from './rng.ts';

const runState = (over: Partial<RunState> = {}): RunState => ({
  bossesDefeated: new Set(), flags: new Set(), itemsHeld: new Set(), mapsVisited: new Set(),
  level: 1, sigilBosses: SAMPLE_WORLD.sigilBosses, ...over,
});

describe('condition DSL', () => {
  it('evaluates leaves and composites', () => {
    expect(evalCondition({ type: 'bossDefeated', boss: 'emberlord' }, runState())).toBe(false);
    expect(evalCondition({ type: 'bossDefeated', boss: 'emberlord' }, runState({ bossesDefeated: new Set(['emberlord']) }))).toBe(true);
    expect(evalCondition({ type: 'level', atLeast: 3 }, runState({ level: 5 }))).toBe(true);
    expect(evalCondition({ type: 'all', of: [{ type: 'level', atLeast: 3 }, { type: 'flagSet', flag: 'x' }] }, runState({ level: 5 }))).toBe(false);
    expect(evalCondition({ type: 'any', of: [{ type: 'level', atLeast: 9 }, { type: 'flagSet', flag: 'x' }] }, runState({ flags: new Set(['x']) }))).toBe(true);
    expect(evalCondition({ type: 'not', cond: { type: 'flagSet', flag: 'x' } }, runState())).toBe(true);
  });

  it('counts sigils', () => {
    const rs = runState({ bossesDefeated: new Set(['emberlord']) });
    expect(evalCondition({ type: 'sigilCount', atLeast: 1 }, rs)).toBe(true);
    expect(evalCondition({ type: 'sigilCount', atLeast: 2 }, rs)).toBe(false);
  });
});

describe('battle engine', () => {
  const idx = indexWorld(SAMPLE_WORLD);
  const slime = SAMPLE_WORLD.enemies.find((e) => e.id === 'slime');

  const fresh = (): BattlePlayer => ({
    hp: playerMaxHp(idx, 5), maxhp: playerMaxHp(idx, 5), mp: playerMaxMp(idx, 5), maxmp: playerMaxMp(idx, 5),
    level: 5, statuses: {},
  });

  it('is deterministic for a fixed seed and resolves', () => {
    const run = (): string => {
      const rng = mulberry32(42);
      let st = initBattle(idx, slime!, 3, fresh());
      let guard = 0;
      while (!st.over && guard++ < 50) st = castSpell(idx, st, { element: 'rime', form: 'bolt', rune: 'none' }, rng);
      return `${st.over ?? 'none'}:${String(st.enemy.hp)}:${String(st.player.hp)}`;
    };
    expect(run()).toBe(run()); // same seed -> same outcome
    expect(run().startsWith('win')).toBe(true); // rime is super-effective vs the slime
  });
});
