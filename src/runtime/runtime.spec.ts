import { describe, it, expect } from 'vitest';
import { SAMPLE_WORLD } from '../model/sample.ts';
import { indexWorld } from './worldIndex.ts';
import { evalCondition, type RunState } from './conditions.ts';
import {
  battleXp, bumpMastery, castSpell, initBattle, initBossBattle, playerMaxHp, playerMaxMp,
  setTarget, spellCost, tierOf, type BattlePlayer,
} from './battle.ts';
import { mulberry32 } from './rng.ts';
import type { BossSpecial } from '../model/index.ts';

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
    level: 5, statuses: {}, mastery: {}, aspect: null,
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

  it('fires an authored reaction: consumes setup, applies effect', () => {
    const reactWorld = {
      ...SAMPLE_WORLD,
      wheel: {
        ...SAMPLE_WORLD.wheel,
        reactions: [{ id: 'melt', setup: 'chilled', trigger: 'ember', line: 'MELT', effect: { hitBonus: 0.5, applyStatus: { status: 'burning', turns: 3 } } }],
      },
    };
    const ridx = indexWorld(reactWorld);
    let st = initBattle(ridx, [{ def: slime!, lv: 3 }], fresh());
    st.enemies[0]!.statuses['chilled'] = 2;
    st = castSpell(ridx, st, { element: 'ember', form: 'bolt', rune: 'none' }, mulberry32(3));
    expect(st.enemies[0]!.statuses['chilled']).toBeUndefined(); // consumed
    expect('burning' in st.enemies[0]!.statuses).toBe(true); // applied
    expect(st.log.some((l) => l.includes('MELT'))).toBe(true);
  });

  it('rolls a wyrd surge when the rune always surges', () => {
    const surgeWorld = {
      ...SAMPLE_WORLD,
      runes: [...SAMPLE_WORLD.runes, { id: 'wyrd', label: 'Wyrd', blurb: '', mp: 1, suffix: '', surges: true }],
      wheel: {
        ...SAMPLE_WORLD.wheel,
        surges: Array.from({ length: 10 }, (_, i) => ({ roll: i + 1, severity: 'mild' as const, id: 'bite', line: 'BITE', effect: { damage: 3 } })),
      },
    };
    const sidx = indexWorld(surgeWorld);
    let st = initBattle(sidx, [{ def: slime!, lv: 8 }], fresh());
    // ember is resisted by the slime, so it survives the hit and the surge rolls.
    st = castSpell(sidx, st, { element: 'ember', form: 'bolt', rune: 'wyrd' }, mulberry32(2));
    expect(st.log.some((l) => l.includes('BITE'))).toBe(true);
  });

  it('twin casts cost more (twinMpMult)', () => {
    const single = spellCost(idx, { element: 'rime', form: 'bolt', rune: 'none' });
    const twin = spellCost(idx, { element: 'rime', element2: 'ember', form: 'bolt', rune: 'none' });
    expect(twin).toBeGreaterThan(single);
  });

  it('mastery grows from hits and tiers up', () => {
    expect(tierOf(idx, 0)).toBe(0);
    expect(tierOf(idx, 10)).toBe(1);
    expect(tierOf(idx, 25)).toBe(2);
    expect(tierOf(idx, 50)).toBe(3);
    const m = bumpMastery({}, ['rime', 'rime', 'ember'], 50);
    expect(m['rime']).toBe(1);
    expect(m['ember']).toBe(1);
  });

  it('aspect amplifies a matching-element cast', () => {
    const hp = (aspect: string | null): number => {
      let st = initBattle(idx, [{ def: slime!, lv: 12 }], { ...fresh(), aspect });
      st = castSpell(idx, st, { element: 'ember', form: 'bolt', rune: 'none' }, mulberry32(5));
      return st.enemies[0]!.hp;
    };
    expect(hp('ember')).toBeLessThan(hp(null)); // aspect → more damage → less HP left
  });
});

describe('boss specials', () => {
  const bossWorld = (special: BossSpecial) =>
    indexWorld({
      ...SAMPLE_WORLD,
      bosses: [{ id: 'tb', name: 'Test Boss', lv: 5, hp: 200, a0: 6, al: 1, xp: 50, weak: [], resist: [], moves: [{ name: 'smash', mult: 1 }], intro: '', sigilToast: '', special }],
    });
  const fresh = (i = indexWorld(SAMPLE_WORLD)) => ({
    hp: playerMaxHp(i, 6), maxhp: playerMaxHp(i, 6), mp: playerMaxMp(i, 6), maxmp: playerMaxMp(i, 6),
    level: 6, statuses: {}, mastery: {}, aspect: null,
  });

  it('summonAndVeil: summons adds + raises a veil shield', () => {
    const widx = bossWorld({ kind: 'summonAndVeil', summonAtHpFrac: 0.95, summonSpecies: 'slime', summonCount: 2, summonLv: 2, veilName: 'Veil', veilEvery: 1, veilShield: 20 });
    let st = initBossBattle(widx, widx.bosses.get('tb')!, fresh());
    expect(st.enemies).toHaveLength(1);
    st = castSpell(widx, st, { element: 'rime', form: 'bolt', rune: 'none' }, mulberry32(1));
    expect(st.enemies.length).toBe(3); // boss + 2 summons
    expect(st.enemies[0]!.shield).toBeGreaterThan(0);
  });

  it('bars: off-key casts are reduced', () => {
    const widx = bossWorld({ kind: 'bars', barHp: 60, barKeys: ['ember'], offKeyMult: 0.25, summonSpecies: 'slime', summonLv: 2, unwriteEvery: 99, unwriteMult: 2, unwriteName: 'Unwrite' });
    const boss = widx.bosses.get('tb')!;
    const dmg = (el: string): number => {
      let st = initBossBattle(widx, boss, fresh());
      const before = st.enemies[0]!.hp;
      st = castSpell(widx, st, { element: el, form: 'bolt', rune: 'none' }, mulberry32(3));
      return before - st.enemies[0]!.hp;
    };
    expect(dmg('ember')).toBeGreaterThan(dmg('rime'));
  });

  it('enrage: hits harder below the hp threshold', () => {
    const playerHp = (frac: number): number => {
      const widx = bossWorld({ kind: 'enrage', belowHpFrac: frac, dmgMult: 3, weightedMove: 'smash', enragedWeightMult: 5 });
      let st = initBossBattle(widx, widx.bosses.get('tb')!, fresh());
      st = castSpell(widx, st, { element: 'rime', form: 'bolt', rune: 'none' }, mulberry32(8));
      return st.player.hp;
    };
    expect(playerHp(0.99)).toBeLessThan(playerHp(0.01));
  });

  it('attune: the attuned element does more damage', () => {
    const widx = bossWorld({ kind: 'attune', attunedMult: 2, otherMult: 0.5, shiftEveryPhase1: 1, shiftEveryPhase2: 1, phase2AtHpFrac: 0.5, phase3AtHpFrac: 0.2, summonSpecies: 'slime', summonCount: 1, summonLv: 2, doomName: 'Doom', doomMult: 2 });
    const boss = widx.bosses.get('tb')!;
    const dmg = (el: string): number => {
      let st = initBossBattle(widx, boss, fresh());
      const before = st.enemies[0]!.hp;
      st = castSpell(widx, st, { element: el, form: 'bolt', rune: 'none' }, mulberry32(4));
      return before - st.enemies[0]!.hp;
    };
    expect(dmg('ember')).toBeGreaterThan(dmg('rime')); // attunedTo = first element (ember)
  });
});
