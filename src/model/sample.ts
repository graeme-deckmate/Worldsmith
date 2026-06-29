import { zWorld, type World } from './world.ts';

/**
 * A small but complete sample world ("Emberfell") — two elements, a few enemies,
 * a boss, three wired maps with an exit chain and a boss-gated area. It exercises
 * every cross-reference the validator checks and gives the editor real content to
 * open with. (A full Sigilbound import lands in E7.)
 */
const raw = {
  meta: {
    id: 'emberfell',
    name: 'Emberfell (sample)',
    author: 'Worldsmith',
    description: 'A tiny two-element starter world: cross a meadow, fell the Emberlord, open the keep.',
  },
  start: { map: 'town', level: 1, starters: ['ember', 'rime'], backfillLevels: [2, 4] },

  elements: [
    { id: 'ember', label: 'Ember', color: '#ff6b35', status: 'burning', proc: 0.3 },
    { id: 'rime', label: 'Rime', color: '#5ad1ff', status: 'chilled', proc: 0.3 },
  ],
  enemyStatuses: [
    { id: 'burning', label: 'Burning', duration: 3, dot: { base: 2, perLv: 1 } },
    { id: 'chilled', label: 'Chilled', duration: 3, dealtMult: 0.8 },
  ],
  playerStatuses: [{ id: 'scorched', label: 'Scorched', dotPctMaxHp: 0.04 }],
  forms: [
    { id: 'bolt', label: 'Bolt', pw: 1, mp: 1, targeting: 'single', archetype: 'projectile' },
    { id: 'veil', label: 'Veil', pw: 0.5, mp: 1.2, targeting: 'self', archetype: 'veil' },
  ],
  runes: [
    { id: 'none', label: 'None', mp: 1 },
    { id: 'fury', label: 'Fury', mp: 1.2, suffix: ' of fury', pw: 1.3 },
  ],
  wheel: {
    order: ['ember', 'rime'],
    reactions: [{ id: 'melt', setup: 'chilled', trigger: 'ember', line: 'The frost flashes to steam!' }],
  },

  enemies: [
    {
      id: 'slime',
      name: 'Cinder Slime',
      h0: 14,
      hpl: 4,
      a0: 4,
      al: 1,
      xpBase: 4,
      xpPerLv: 2,
      weak: ['rime'],
      resist: ['ember'],
      moves: [{ name: 'bonk', mult: 1 }],
      sprite: 'slime',
    },
    {
      id: 'imp',
      name: 'Emberimp',
      h0: 18,
      hpl: 5,
      a0: 5,
      al: 1.1,
      xpBase: 6,
      xpPerLv: 2,
      weak: ['rime'],
      resist: ['ember'],
      moves: [{ name: 'claw', mult: 1 }, { name: 'spark', mult: 0.9, rider: { type: 'playerStatus', status: 'scorched', chance: 0.3 } }],
      sprite: 'slime',
    },
  ],
  bosses: [
    {
      id: 'emberlord',
      name: 'The Emberlord',
      lv: 4,
      hp: 120,
      a0: 7,
      al: 1.3,
      xp: 40,
      weak: ['rime'],
      resist: ['ember'],
      moves: [{ name: 'cleave', mult: 1 }, { name: 'flare', mult: 1.2 }],
      intro: 'The Emberlord rises from the coals.',
      sigilToast: 'The keep is yours.',
      special: { kind: 'enrage', belowHpFrac: 0.35, dmgMult: 1.4, weightedMove: 'flare', enragedWeightMult: 2 },
      sprite: 'slime',
    },
  ],
  zones: [
    {
      id: 'meadow',
      levelMin: 1,
      levelMax: 3,
      formations: [{ members: ['slime', 'imp'], weight: 3 }, { members: ['slime'], weight: 1 }],
      backdrop: { sky: ['#2a1a0a', '#6e3a18'], hill: '#1a0e04', ground: '#7e4a24' },
    },
  ],

  rarities: [
    { id: 'common', label: 'Common', affixCount: 0, valueMult: 1 },
    { id: 'fine', label: 'Fine', affixCount: 1, valueMult: 1.8 },
  ],
  equipSlots: [
    { id: 'implement', label: 'Implement' },
    { id: 'vestment', label: 'Vestment' },
  ],
  gearBases: [{ id: 'spark_rod', slot: 'implement', label: 'Spark Rod', value: 20, mods: { powerMult: 0.05 } }],
  gearAffixes: [{ id: 'keen', label: 'Keen', place: 'prefix', minRarity: 'fine', mods: { critChance: 0.05 } }],
  classes: [{ id: 'adept', label: 'Adept', blurb: 'Balanced caster.', passive: {} }],
  difficulties: [{ id: 'standard', label: 'Standard', hpMult: 1, atkMult: 1, econMult: 1 }],

  maps: [
    {
      id: 'town',
      width: 12,
      height: 8,
      music: 'town',
      theme: 'vale',
      spawn: { x: 2, y: 3, facing: 'down' },
      tiles: [
        '############',
        '#..........#',
        '#..........#',
        '#.........-#',
        '#..........#',
        '#..........#',
        '#..........#',
        '############',
      ],
      npcs: [{ id: 'elder', x: 5, y: 3, dialogue: 'welcome' }],
      exits: [{ x: 10, y: 3, to: 'meadow_map', tx: 1, ty: 3 }],
    },
    {
      id: 'meadow_map',
      width: 12,
      height: 8,
      music: 'field',
      theme: 'ember',
      spawn: { x: 1, y: 3, facing: 'right' },
      tiles: [
        '############',
        '#..........#',
        '#..,,,,,...#',
        '#..,,,,,..-#',
        '#..,,,,,...#',
        '#..........#',
        '#..........#',
        '############',
      ],
      zones: [{ name: 'meadow', rect: { x1: 3, y1: 2, x2: 7, y2: 4 }, table: 'meadow' }],
      signs: [{ x: 2, y: 1, dialogue: 'field_sign' }],
      bosses: [{ id: 'emberlord', x: 9, y: 5 }],
      exits: [
        { x: 0, y: 3, to: 'town', tx: 9, ty: 3 },
        { x: 10, y: 3, to: 'keep', tx: 1, ty: 3 },
      ],
    },
    {
      id: 'keep',
      width: 12,
      height: 8,
      music: 'field',
      theme: 'cave',
      spawn: { x: 1, y: 3, facing: 'right' },
      tiles: [
        '############',
        '#..........#',
        '#..........#',
        '-..........#',
        '#..........#',
        '#..........#',
        '#..........#',
        '############',
      ],
      lore: [{ x: 6, y: 3, dialogue: 'keep_lore' }],
      exits: [{ x: 0, y: 3, to: 'meadow_map', tx: 9, ty: 3 }],
    },
  ],
  dialogue: [
    { id: 'welcome', speaker: 'ELDER', pages: ['Welcome to Emberfell. The meadow east is yours to cross.'] },
    { id: 'field_sign', speaker: 'SIGN', pages: ['MEADOW. Mind the slimes.'] },
    { id: 'keep_lore', speaker: 'LORE', pages: ['The keep remembers the Emberlord.'] },
    { id: 'keep_sealed', speaker: 'KEEP GATE', pages: ['The keep will not open until the Emberlord falls.'] },
  ],

  unlocks: [
    { kind: 'element', id: 'ember', trigger: { type: 'starter' } },
    { kind: 'element', id: 'rime', trigger: { type: 'level', lv: 2 } },
    { kind: 'form', id: 'bolt', trigger: { type: 'start' } },
    { kind: 'form', id: 'veil', trigger: { type: 'level', lv: 3 } },
    { kind: 'rune', id: 'fury', trigger: { type: 'flag', flag: 'shrine_fury', hint: 'A shrine in the meadow.' } },
  ],
  gates: [
    {
      id: 'keep_gate',
      to: 'keep',
      when: { type: 'bossDefeated', boss: 'emberlord' },
      barred: 'keep_sealed',
    },
  ],
  sigilBosses: ['emberlord'],

  sprites: [
    {
      id: 'slime',
      grid: ['.aaaa.', 'a.aa.a', 'aaaaaa', 'a.aa.a', '.aaaa.'],
      pal: { a: '#5fd6a0' },
    },
  ],
};

export const SAMPLE_WORLD: World = zWorld.parse(raw);
