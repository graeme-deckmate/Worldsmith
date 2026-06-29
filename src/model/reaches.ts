import { zWorld, type World } from './world.ts';

/**
 * "The Hollow Reaches" — a Sigilbound-homage world that exercises the full Wheel
 * (5 reactions with effects, a surge table, twin pairs with riders, mastery/aspect
 * tuning) and FIVE bosses, one per BossSpecial archetype, across a gated multi-
 * domain map graph (hub → 3 early domains + a side area → thorn marsh → gloom
 * finale). Authored to pass validateWorld + map reachability.
 */

const TOWN = ['############', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#', '############'];
const FIELD = ['############', '#..........#', '#..,,,,,...#', '#..,,,,,...#', '#..,,,,,...#', '#..........#', '#..........#', '############'];

const raw = {
  meta: { id: 'hollow_reaches', name: 'The Hollow Reaches', author: 'Worldsmith', description: 'Five elements, the full Wheel, and five bosses — one per mechanic — across gated domains.' },
  start: { map: 'hub', level: 3, starters: ['ember', 'rime', 'volt'], backfillLevels: [2, 5] },

  elements: [
    { id: 'ember', label: 'Ember', color: '#ff6b35', status: 'burning', proc: 0.3 },
    { id: 'rime', label: 'Rime', color: '#5ad1ff', status: 'chilled', proc: 0.3 },
    { id: 'volt', label: 'Volt', color: '#ffd84a', status: 'shocked', proc: 0.3 },
    { id: 'thorn', label: 'Thorn', color: '#7dde6a', status: 'envenomed', proc: 0.3 },
    { id: 'gloom', label: 'Gloom', color: '#b59bff', status: 'withered', proc: 0.3 },
  ],
  enemyStatuses: [
    { id: 'burning', label: 'Burning', duration: 3, dot: { base: 3, perLv: 1 } },
    { id: 'chilled', label: 'Chilled', duration: 3, dealtMult: 0.8 },
    { id: 'shocked', label: 'Shocked', duration: 2, takenMult: 1.2 },
    { id: 'envenomed', label: 'Envenomed', duration: 4, dot: { base: 4, perLv: 1.2 } },
    { id: 'withered', label: 'Withered', duration: 3, takenMult: 1.25 },
  ],
  playerStatuses: [
    { id: 'scorched', label: 'Scorched', dotPctMaxHp: 0.03 },
    { id: 'frozen', label: 'Frozen', spellPowerMult: 0.8 },
  ],
  forms: [
    { id: 'wisp', label: 'Wisp', pw: 0.8, mp: 0.8, targeting: 'single', archetype: 'projectile' },
    { id: 'bolt', label: 'Bolt', pw: 1, mp: 1, targeting: 'single', archetype: 'projectile' },
    { id: 'lance', label: 'Lance', pw: 1.3, mp: 1.4, targeting: 'single', archetype: 'projectile' },
    { id: 'veil', label: 'Veil', pw: 0.5, mp: 1.2, targeting: 'self', archetype: 'veil' },
  ],
  runes: [
    { id: 'none', label: 'None', mp: 1 },
    { id: 'fury', label: 'Fury', mp: 1.2, suffix: ' of fury', pw: 1.3 },
    { id: 'keen', label: 'Keen', mp: 1.1, suffix: ' keen', crit: { chance: 0.3, mult: 1.8 } },
    { id: 'wyrd', label: 'Wyrd', mp: 1.3, suffix: ' wyrd', surges: true },
    { id: 'stormcoil', label: 'Stormcoil', mp: 1.2, suffix: ' coil', keepsReactionSetup: true },
  ],
  wheel: {
    order: ['ember', 'rime', 'volt', 'thorn', 'gloom'],
    reactions: [
      { id: 'scald', setup: 'burning', trigger: 'rime', line: 'Scalding burst!', effect: { instantDot: { status: 'burning', mult: 2 } } },
      { id: 'shatter', setup: 'chilled', trigger: 'volt', line: 'The frost SHATTERS!', effect: { hitBonus: 0.6 } },
      { id: 'snare', setup: 'shocked', trigger: 'thorn', line: 'Snared!', effect: { applyStatus: { status: 'envenomed', turns: 4 } } },
      { id: 'blight', setup: 'envenomed', trigger: 'gloom', line: 'The venom BLOOMS!', effect: { instantDot: { status: 'envenomed', mult: 1, perRemainingTurn: true } } },
      { id: 'kindle', setup: 'withered', trigger: 'ember', line: 'It KINDLES!', effect: { hitBonus: 0.4, applyStatus: { status: 'burning', turns: 3 } } },
    ],
    surges: [
      { roll: 1, severity: 'mild', id: 'afterglow', line: 'A violet afterglow clings to you.' },
      { roll: 2, severity: 'mild', id: 'bite', line: 'The cast bites deeper.', effect: { damage: 4 } },
      { roll: 3, severity: 'mild', id: 'warmth', line: 'Stolen warmth seeps back.', effect: { healHp: 6 } },
      { roll: 4, severity: 'mild', id: 'gift', line: 'A quick gift: the ink returns.', effect: { restoreMp: 4 } },
      { roll: 5, severity: 'moderate', id: 'sure', line: 'The wyrd makes it certain.', effect: { forceElementStatus: true } },
      { roll: 6, severity: 'moderate', id: 'echo', line: 'The echo echoes.', effect: { recastFrac: 0.5 } },
      { roll: 7, severity: 'moderate', id: 'grasp', line: 'Shadows grasp a foe.', effect: { randomEnemyStatus: { status: 'withered', turns: 1 } } },
      { roll: 8, severity: 'severe', id: 'collect', line: 'The dark collects its fee.', effect: { selfHpFracFee: 0.08 } },
      { roll: 9, severity: 'severe', id: 'reversal', line: 'The spell turns in your hand!', effect: { selfElementStatus: true } },
      { roll: 10, severity: 'severe', id: 'doubletap', line: 'It strikes twice.', effect: { damage: 6, restoreMp: 2 } },
    ],
    twinPairs: [
      { a: 'ember', b: 'rime', prefix: 'Steam', rider: 'steam', effect: { enemyNextMoveMult: 0.7 } },
      { a: 'ember', b: 'volt', prefix: 'Storm', rider: 'storm', effect: { arcFrac: 0.5 } },
      { a: 'rime', b: 'volt', prefix: 'Static', rider: 'static', effect: { reactionHitBonus: 1.2 } },
      { a: 'volt', b: 'gloom', prefix: 'Night', rider: 'night', effect: { witherTakenMult: 1.4 } },
      { a: 'thorn', b: 'gloom', prefix: 'Rot', rider: 'rot', effect: { extraDotTick: true } },
      { a: 'rime', b: 'gloom', prefix: 'Depth', rider: 'depth', effect: { blockEnemyShieldTurns: 2 } },
    ],
    tuning: {
      masteryCap: 50, masteryT1: 10, masteryT2: 25, masteryT3: 50,
      masteryT1Power: 1.05, masteryT2Proc: 0.1, masteryT3Cost: -1,
      aspectPower: 1.1, aspectProc: 0.1, aspectDot: 1.1,
      twinMpMult: 1.6, twinMatchupCap: 1.3, twinProcFrac: 0.5, surgeChance: 0.18, steamMult: 0.7,
    },
  },

  enemies: [
    { id: 'cindermite', name: 'Cindermite', h0: 16, hpl: 4, a0: 5, al: 1, xpBase: 5, xpPerLv: 2, weak: ['rime'], resist: ['ember'], moves: [{ name: 'spark', mult: 1 }], sprite: 'mite' },
    { id: 'emberwhelp', name: 'Emberwhelp', h0: 22, hpl: 5, a0: 6, al: 1.1, xpBase: 7, xpPerLv: 2, weak: ['rime'], resist: ['ember'], moves: [{ name: 'bite', mult: 1 }, { name: 'singe', mult: 0.9, rider: { type: 'playerStatus', status: 'scorched', chance: 0.3 } }], sprite: 'mite' },
    { id: 'frostling', name: 'Frostling', h0: 18, hpl: 4, a0: 5, al: 1, xpBase: 6, xpPerLv: 2, weak: ['ember'], resist: ['rime'], moves: [{ name: 'nip', mult: 1 }], sprite: 'mite' },
    { id: 'rimespit', name: 'Rimespit', h0: 24, hpl: 5, a0: 6, al: 1.1, xpBase: 8, xpPerLv: 2, weak: ['ember'], resist: ['rime'], moves: [{ name: 'spit', mult: 1, rider: { type: 'playerStatus', status: 'frozen', chance: 0.25 } }], sprite: 'mite' },
    { id: 'voltbat', name: 'Voltbat', h0: 16, hpl: 4, a0: 6, al: 1.2, xpBase: 7, xpPerLv: 2, weak: ['rime'], resist: ['volt'], moves: [{ name: 'zap', mult: 1, rider: { type: 'mpDrain', amount: 3 } }], sprite: 'mite' },
    { id: 'sparkmite', name: 'Sparkmite', h0: 14, hpl: 3, a0: 5, al: 1.1, xpBase: 6, xpPerLv: 2, weak: ['thorn'], resist: ['volt'], moves: [{ name: 'arc', mult: 1 }], sprite: 'mite' },
    { id: 'thornling', name: 'Thornling', h0: 26, hpl: 5, a0: 6, al: 1, xpBase: 9, xpPerLv: 3, weak: ['ember'], resist: ['thorn'], moves: [{ name: 'rake', mult: 1 }, { name: 'lash', mult: 1.1 }], sprite: 'mite' },
    { id: 'shade', name: 'Hollowshade', h0: 28, hpl: 6, a0: 7, al: 1.2, xpBase: 11, xpPerLv: 3, weak: ['volt'], resist: ['gloom'], moves: [{ name: 'drain', mult: 1, rider: { type: 'playerStatus', status: 'scorched', chance: 0.2 } }], sprite: 'mite' },
  ],
  bosses: [
    { id: 'emberlord', name: 'The Emberlord', lv: 5, hp: 150, a0: 7, al: 1.3, xp: 60, weak: ['rime'], resist: ['ember'], moves: [{ name: 'cleave', mult: 1 }, { name: 'flare', mult: 1.2 }], intro: 'The Emberlord rises from the coals.', sigilToast: 'The Ember sigil is yours.', special: { kind: 'enrage', belowHpFrac: 0.4, dmgMult: 1.5, weightedMove: 'flare', enragedWeightMult: 2 }, sprite: 'mite' },
    { id: 'frostwarden', name: 'The Frostwarden', lv: 6, hp: 170, a0: 7, al: 1.3, xp: 70, weak: ['ember'], resist: ['rime'], moves: [{ name: 'slam', mult: 1 }, { name: 'whiteout', mult: 1.2 }], intro: 'The Frostwarden exhales a killing cold.', sigilToast: 'The Rime sigil is yours.', special: { kind: 'summonAndVeil', summonAtHpFrac: 0.6, summonSpecies: 'frostling', summonCount: 2, summonLv: 4, veilName: 'Rime Veil', veilEvery: 3, veilShield: 22 }, sprite: 'mite' },
    { id: 'galecaller', name: 'The Galecaller', lv: 7, hp: 180, a0: 8, al: 1.3, xp: 80, weak: ['rime'], resist: ['volt'], moves: [{ name: 'gust', mult: 1 }, { name: 'downdraft', mult: 1.2 }], intro: 'The Galecaller throws its arms wide.', sigilToast: 'The Volt sigil is yours.', special: { kind: 'submerge', every: 3, voltMult: 2, breachName: 'Gale Crash', breachMult: 1.6 }, sprite: 'mite' },
    { id: 'thornking', name: 'The Thornking', lv: 9, hp: 220, a0: 8, al: 1.4, xp: 110, weak: ['ember'], resist: ['thorn'], moves: [{ name: 'rend', mult: 1 }, { name: 'bramble', mult: 1.2 }], intro: 'The Thornking blooms with malice.', sigilToast: 'The Thorn sigil is yours.', special: { kind: 'attune', attunedMult: 1.7, otherMult: 0.7, shiftEveryPhase1: 1, shiftEveryPhase2: 1, phase2AtHpFrac: 0.5, phase3AtHpFrac: 0.25, summonSpecies: 'thornling', summonCount: 1, summonLv: 7, doomName: 'Thorn Doom', doomMult: 2 }, sprite: 'mite' },
    { id: 'gloamwarden', name: 'The Gloamwarden', lv: 11, hp: 180, a0: 9, al: 1.4, xp: 160, weak: [], resist: [], moves: [{ name: 'gloom rend', mult: 1.1 }, { name: 'unmaking', mult: 0.9, rider: { type: 'playerStatus', status: 'frozen', chance: 0.3 } }], intro: 'The Gloamwarden unfolds, older than the Reaches.', sigilToast: 'The Reaches are quiet at last.', special: { kind: 'bars', barHp: 60, barKeys: ['ember', 'rime', 'volt'], offKeyMult: 0.3, summonSpecies: 'shade', summonLv: 8, unwriteEvery: 4, unwriteMult: 2, unwriteName: 'Unwrite' }, sprite: 'mite' },
  ],
  zones: [
    { id: 'ember_zone', levelMin: 3, levelMax: 5, formations: [{ members: ['cindermite', 'emberwhelp'], weight: 3 }, { members: ['cindermite'], weight: 1 }], backdrop: { sky: ['#2a1a0a', '#6e3a18'], hill: '#1a0e04', ground: '#7e4a24' } },
    { id: 'rime_zone', levelMin: 3, levelMax: 5, formations: [{ members: ['frostling', 'rimespit'], weight: 3 }, { members: ['frostling'], weight: 1 }] },
    { id: 'volt_zone', levelMin: 4, levelMax: 6, formations: [{ members: ['voltbat', 'sparkmite'], weight: 3 }, { members: ['sparkmite'], weight: 1 }] },
    { id: 'thorn_zone', levelMin: 6, levelMax: 9, formations: [{ members: ['thornling', 'shade'], weight: 3 }, { members: ['thornling'], weight: 1 }] },
    { id: 'gloom_zone', levelMin: 8, levelMax: 11, formations: [{ members: ['shade', 'thornling'], weight: 2 }, { members: ['shade', 'shade'], weight: 1 }] },
    { id: 'forge_zone', levelMin: 4, levelMax: 6, formations: [{ members: ['cindermite', 'sparkmite'], weight: 2 }] },
  ],

  rarities: [{ id: 'common', label: 'Common', affixCount: 0, valueMult: 1 }, { id: 'fine', label: 'Fine', affixCount: 1, valueMult: 1.8 }],
  equipSlots: [{ id: 'implement', label: 'Implement' }],
  gearBases: [{ id: 'reach_rod', slot: 'implement', label: 'Reach Rod', value: 24, mods: { powerMult: 0.06 } }],
  gearAffixes: [],
  classes: [{ id: 'adept', label: 'Adept', blurb: 'Balanced caster.', passive: {} }],
  difficulties: [{ id: 'standard', label: 'Standard', hpMult: 1, atkMult: 1, econMult: 1 }],

  maps: [
    {
      id: 'hub', width: 12, height: 8, music: 'town', theme: 'vale', spawn: { x: 2, y: 4, facing: 'down' }, tiles: TOWN,
      npcs: [{ id: 'guide', x: 5, y: 2, dialogue: 'hub_guide' }],
      signs: [{ x: 2, y: 2, dialogue: 'hub_sign' }],
      exits: [
        { x: 9, y: 2, to: 'emberwild', tx: 2, ty: 1 },
        { x: 9, y: 4, to: 'rimehold', tx: 2, ty: 1 },
        { x: 9, y: 6, to: 'voltspire', tx: 2, ty: 1 },
      ],
    },
    {
      id: 'emberwild', width: 12, height: 8, music: 'field', theme: 'ember', spawn: { x: 2, y: 1, facing: 'down' }, tiles: FIELD,
      zones: [{ name: 'wild', rect: { x1: 3, y1: 2, x2: 7, y2: 4 }, table: 'ember_zone' }],
      signs: [{ x: 10, y: 1, dialogue: 'emberwild_sign' }],
      springs: [{ x: 8, y: 1 }],
      bosses: [{ id: 'emberlord', x: 9, y: 5 }],
      exits: [{ x: 1, y: 5, to: 'hub', tx: 9, ty: 2 }],
    },
    {
      id: 'rimehold', width: 12, height: 8, music: 'field', theme: 'frost', spawn: { x: 2, y: 1, facing: 'down' }, tiles: FIELD,
      zones: [{ name: 'hold', rect: { x1: 3, y1: 2, x2: 7, y2: 4 }, table: 'rime_zone' }],
      signs: [{ x: 10, y: 1, dialogue: 'rimehold_sign' }],
      springs: [{ x: 8, y: 1 }],
      bosses: [{ id: 'frostwarden', x: 9, y: 5 }],
      exits: [{ x: 1, y: 5, to: 'hub', tx: 9, ty: 4 }],
    },
    {
      id: 'voltspire', width: 12, height: 8, music: 'field', theme: 'storm', spawn: { x: 2, y: 1, facing: 'down' }, tiles: FIELD,
      zones: [{ name: 'spire', rect: { x1: 3, y1: 2, x2: 7, y2: 4 }, table: 'volt_zone' }],
      signs: [{ x: 5, y: 1, dialogue: 'volt_sign' }],
      bosses: [{ id: 'galecaller', x: 9, y: 5 }],
      exits: [
        { x: 1, y: 5, to: 'hub', tx: 9, ty: 6 },
        { x: 10, y: 1, to: 'forge', tx: 2, ty: 2 },
        { x: 10, y: 6, to: 'thornmarsh', tx: 1, ty: 1 },
      ],
    },
    {
      id: 'forge', width: 12, height: 8, music: 'field', theme: 'ash', spawn: { x: 2, y: 2, facing: 'down' }, tiles: FIELD,
      zones: [{ name: 'forge', rect: { x1: 3, y1: 2, x2: 7, y2: 4 }, table: 'forge_zone' }],
      signs: [{ x: 10, y: 1, dialogue: 'forge_sign' }],
      chests: [{ id: 'forge_cache', x: 8, y: 1, reward: 'essence:20' }],
      exits: [{ x: 1, y: 1, to: 'voltspire', tx: 10, ty: 1 }],
    },
    {
      id: 'thornmarsh', width: 12, height: 8, music: 'field', theme: 'mire', spawn: { x: 1, y: 1, facing: 'down' }, tiles: FIELD,
      zones: [{ name: 'marsh', rect: { x1: 3, y1: 2, x2: 7, y2: 4 }, table: 'thorn_zone' }],
      signs: [{ x: 10, y: 1, dialogue: 'thornmarsh_sign' }],
      bosses: [{ id: 'thornking', x: 9, y: 5 }],
      exits: [
        { x: 1, y: 5, to: 'voltspire', tx: 10, ty: 6 },
        { x: 10, y: 5, to: 'gloomvault', tx: 2, ty: 1 },
      ],
    },
    {
      id: 'gloomvault', width: 12, height: 8, music: 'sanctum', theme: 'hollow', spawn: { x: 2, y: 1, facing: 'down' }, tiles: FIELD,
      zones: [{ name: 'vault', rect: { x1: 3, y1: 2, x2: 7, y2: 4 }, table: 'gloom_zone' }],
      lore: [{ x: 10, y: 1, dialogue: 'gloom_lore' }],
      bosses: [{ id: 'gloamwarden', x: 9, y: 5 }],
      exits: [{ x: 1, y: 5, to: 'thornmarsh', tx: 10, ty: 5 }],
    },
  ],
  dialogue: [
    { id: 'hub_guide', speaker: 'WAYFARER', pages: ['The three near roads are open. The marsh waits behind them; the vault behind the marsh.', 'Rest at a spring to let an aspect rise. Pair two elements to cast a twin.'] },
    { id: 'hub_sign', speaker: 'SIGN', pages: ['THE HOLLOW REACHES. Five powers, one wheel.'] },
    { id: 'emberwild_sign', speaker: 'SIGN', pages: ['EMBERWILD. Bring cold. Chill them, then strike with volt to SHATTER.'] },
    { id: 'rimehold_sign', speaker: 'SIGN', pages: ['RIMEHOLD. The warden summons and veils. Break the veil.'] },
    { id: 'volt_sign', speaker: 'SIGN', pages: ['VOLTSPIRE. The Galecaller dives. Wait for the breach.'] },
    { id: 'forge_sign', speaker: 'SIGN', pages: ['THE FORGE. Something still smoulders here.'] },
    { id: 'thornmarsh_sign', speaker: 'SIGN', pages: ['THORNMARSH. The Thornking attunes. Match its element.'] },
    { id: 'gloom_lore', speaker: 'LORE', pages: ['The Gloamwarden holds three bars. Strike each on its own key.'] },
    { id: 'thornmarsh_sealed', speaker: 'MARSH GATE', pages: ['The marsh stays shut until the three near wardens fall.'] },
    { id: 'gloomvault_sealed', speaker: 'VAULT GATE', pages: ['The vault opens only when the Thornking falls.'] },
  ],

  unlocks: [
    { kind: 'element', id: 'ember', trigger: { type: 'starter' } },
    { kind: 'element', id: 'rime', trigger: { type: 'starter' } },
    { kind: 'element', id: 'volt', trigger: { type: 'starter' } },
    { kind: 'element', id: 'thorn', trigger: { type: 'level', lv: 5 } },
    { kind: 'element', id: 'gloom', trigger: { type: 'level', lv: 7 } },
    { kind: 'form', id: 'wisp', trigger: { type: 'start' } },
    { kind: 'form', id: 'bolt', trigger: { type: 'start' } },
    { kind: 'form', id: 'lance', trigger: { type: 'level', lv: 4 } },
    { kind: 'form', id: 'veil', trigger: { type: 'level', lv: 6 } },
    { kind: 'rune', id: 'none', trigger: { type: 'start' } },
    { kind: 'rune', id: 'fury', trigger: { type: 'level', lv: 3 } },
    { kind: 'rune', id: 'keen', trigger: { type: 'level', lv: 4 } },
    { kind: 'rune', id: 'wyrd', trigger: { type: 'level', lv: 6 } },
    { kind: 'rune', id: 'stormcoil', trigger: { type: 'flag', flag: 'rune_stormcoil', hint: 'Hidden in the forge.' } },
  ],
  gates: [
    { id: 'marsh_gate', to: 'thornmarsh', when: { type: 'all', of: [{ type: 'bossDefeated', boss: 'emberlord' }, { type: 'bossDefeated', boss: 'frostwarden' }, { type: 'bossDefeated', boss: 'galecaller' }] }, barred: 'thornmarsh_sealed' },
    { id: 'vault_gate', to: 'gloomvault', when: { type: 'bossDefeated', boss: 'thornking' }, barred: 'gloomvault_sealed' },
  ],
  sigilBosses: ['emberlord', 'frostwarden', 'galecaller', 'thornking', 'gloamwarden'],

  sprites: [{ id: 'mite', grid: ['.aa.', 'aaaa', 'a..a', '.aa.'], pal: { a: '#b59bff' } }],
};

export const HOLLOW_REACHES: World = zWorld.parse(raw);
