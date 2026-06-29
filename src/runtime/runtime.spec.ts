import { describe, it, expect } from 'vitest';
import { SAMPLE_WORLD } from '../model/sample.ts';
import { indexWorld } from './worldIndex.ts';
import { evalCondition, type RunState } from './conditions.ts';
import { battleXp, castSpell, initBattle, playerMaxHp, playerMaxMp, setTarget, type BattlePlayer } from './battle.ts';
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
      let st = initBattle(idx, [{ def: slime!, lv: 3 }], fresh());
      let guard = 0;
      while (!st.over && guard++ < 50) st = castSpell(idx, st, { element: 'rime', form: 'bolt', rune: 'none' }, rng);
      return `${st.over ?? 'none'}:${String(st.enemies[0]?.hp)}:${String(st.player.hp)}`;
    };
    expect(run()).toBe(run()); // same seed -> same outcome
    expect(run().startsWith('win')).toBe(true); // rime is super-effective vs the slime
  });

  it('handles multiple enemies and target switching', () => {
    const rng = mulberry32(7);
    let st = initBattle(idx, [{ def: slime!, lv: 2 }, { def: slime!, lv: 2 }], fresh());
    expect(st.enemies).toHaveLength(2);
    expect(battleXp(st)).toBe(st.enemies[0]!.xp + st.enemies[1]!.xp);
    st = setTarget(st, 1);
    expect(st.target).toBe(1);
    let guard = 0;
    while (!st.over && guard++ < 80) st = castSpell(idx, st, { element: 'rime', form: 'bolt', rune: 'fury' }, rng);
    expect(st.over).toBe('win'); // both must fall
    expect(st.enemies.every((e) => e.hp <= 0)).toBe(true);
  });
});
