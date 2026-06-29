import { zWorld, type World } from './world.ts';
import { SAMPLE_WORLD } from './sample.ts';
import { HOLLOW_REACHES } from './reaches.ts';

/**
 * Built-in starter worlds. Emberfell (sample.ts) plus Froststep — a second
 * compact world showing a summon-and-veil boss and a boss-gated vault — so the
 * sample picker has variety. Both pass validation + map reachability (samples.spec).
 */

const froststepRaw = {
  meta: { id: 'froststep', name: 'Froststep (sample)', author: 'Worldsmith', description: 'Two elements, a warden who summons, and a vault sealed until it falls.' },
  start: { map: 'camp', level: 2, starters: ['rime', 'volt'], backfillLevels: [3] },
  elements: [
    { id: 'rime', label: 'Rime', color: '#5ad1ff', status: 'chilled', proc: 0.3 },
    { id: 'volt', label: 'Volt', color: '#ffd84a', status: 'shocked', proc: 0.3 },
  ],
  enemyStatuses: [
    { id: 'chilled', label: 'Chilled', duration: 3, dealtMult: 0.8 },
    { id: 'shocked', label: 'Shocked', duration: 2, takenMult: 1.2 },
  ],
  playerStatuses: [{ id: 'frostbitten', label: 'Frostbitten', dotPctMaxHp: 0.03 }],
  forms: [
    { id: 'bolt', label: 'Bolt', pw: 1, mp: 1, targeting: 'single', archetype: 'projectile' },
    { id: 'lance', label: 'Lance', pw: 1.3, mp: 1.4, targeting: 'single', archetype: 'projectile' },
  ],
  runes: [
    { id: 'none', label: 'None', mp: 1 },
    { id: 'keen', label: 'Keen', mp: 1.1, suffix: ' keen', crit: { chance: 0.3, mult: 1.8 } },
  ],
  wheel: { order: ['rime', 'volt'], reactions: [{ id: 'shatter', setup: 'chilled', trigger: 'volt', line: 'The ice shatters!' }] },
  enemies: [
    { id: 'frostling', name: 'Frostling', h0: 16, hpl: 4, a0: 4, al: 1, xpBase: 5, xpPerLv: 2, weak: ['volt'], resist: ['rime'], moves: [{ name: 'nip', mult: 1 }], sprite: 'mite' },
    { id: 'sparkmite', name: 'Sparkmite', h0: 14, hpl: 4, a0: 5, al: 1.1, xpBase: 6, xpPerLv: 2, weak: ['rime'], resist: ['volt'], moves: [{ name: 'zap', mult: 1, rider: { type: 'mpDrain', amount: 3 } }], sprite: 'mite' },
  ],
  bosses: [
    {
      id: 'frostwarden', name: 'The Frostwarden', lv: 5, hp: 160, a0: 7, al: 1.3, xp: 60,
      weak: ['volt'], resist: ['rime'], moves: [{ name: 'glacial slam', mult: 1 }, { name: 'whiteout', mult: 1.2 }],
      intro: 'The Frostwarden exhales a killing cold.', sigilToast: 'The vault is open.',
      special: { kind: 'summonAndVeil', summonAtHpFrac: 0.6, summonSpecies: 'frostling', summonCount: 2, summonLv: 4, veilName: 'Rime Veil', veilEvery: 4, veilShield: 26 },
      sprite: 'mite',
    },
  ],
  zones: [{ id: 'glacier_field', levelMin: 2, levelMax: 4, formations: [{ members: ['frostling', 'sparkmite'], weight: 3 }, { members: ['frostling'], weight: 1 }], backdrop: { sky: ['#0c2440', '#2a5a8a'], hill: '#0a1c33', ground: '#3a6e9b' } }],
  rarities: [{ id: 'common', label: 'Common', affixCount: 0, valueMult: 1 }],
  equipSlots: [{ id: 'implement', label: 'Implement' }],
  gearBases: [{ id: 'frost_rod', slot: 'implement', label: 'Frost Rod', value: 24, mods: { powerMult: 0.06 } }],
  gearAffixes: [],
  classes: [{ id: 'adept', label: 'Adept', blurb: 'Balanced caster.', passive: {} }],
  difficulties: [{ id: 'standard', label: 'Standard', hpMult: 1, atkMult: 1, econMult: 1 }],
  maps: [
    {
      id: 'camp', width: 12, height: 8, music: 'town', theme: 'frost', spawn: { x: 2, y: 3, facing: 'down' },
      tiles: ['############', '#..........#', '#..........#', '#.........-#', '#..........#', '#..........#', '#..........#', '############'],
      npcs: [{ id: 'guide', x: 5, y: 3, dialogue: 'welcome2' }],
      exits: [{ x: 10, y: 3, to: 'glacier', tx: 1, ty: 3 }],
    },
    {
      id: 'glacier', width: 12, height: 8, music: 'field', theme: 'frost', spawn: { x: 1, y: 3, facing: 'right' },
      tiles: ['############', '#..........#', '#..,,,,,...#', '#..,,,,,..-#', '#..,,,,,...#', '#..........#', '#..........#', '############'],
      zones: [{ name: 'field', rect: { x1: 3, y1: 2, x2: 7, y2: 4 }, table: 'glacier_field' }],
      signs: [{ x: 2, y: 1, dialogue: 'glacier_sign' }],
      bosses: [{ id: 'frostwarden', x: 9, y: 5 }],
      exits: [{ x: 0, y: 3, to: 'camp', tx: 9, ty: 3 }, { x: 10, y: 3, to: 'vault', tx: 1, ty: 3 }],
    },
    {
      id: 'vault', width: 12, height: 8, music: 'field', theme: 'cave', spawn: { x: 1, y: 3, facing: 'right' },
      tiles: ['############', '#..........#', '#..........#', '-..........#', '#..........#', '#..........#', '#..........#', '############'],
      lore: [{ x: 6, y: 3, dialogue: 'vault_lore' }],
      exits: [{ x: 0, y: 3, to: 'glacier', tx: 9, ty: 3 }],
    },
  ],
  dialogue: [
    { id: 'welcome2', speaker: 'GUIDE', pages: ['The glacier east hides a vault. The Frostwarden holds its key.'] },
    { id: 'glacier_sign', speaker: 'SIGN', pages: ['GLACIER. Strike the chilled with volt to shatter them.'] },
    { id: 'vault_lore', speaker: 'LORE', pages: ['The vault hums with old static.'] },
    { id: 'vault_sealed', speaker: 'VAULT', pages: ['Sealed until the Frostwarden falls.'] },
  ],
  unlocks: [
    { kind: 'element', id: 'rime', trigger: { type: 'starter' } },
    { kind: 'element', id: 'volt', trigger: { type: 'level', lv: 3 } },
    { kind: 'form', id: 'bolt', trigger: { type: 'start' } },
    { kind: 'form', id: 'lance', trigger: { type: 'level', lv: 4 } },
  ],
  gates: [{ id: 'vault_gate', to: 'vault', when: { type: 'bossDefeated', boss: 'frostwarden' }, barred: 'vault_sealed' }],
  sigilBosses: ['frostwarden'],
  sprites: [{ id: 'mite', grid: ['.aa.', 'aaaa', 'a..a', '.aa.'], pal: { a: '#7ec8ff' } }],
};

export const FROSTSTEP: World = zWorld.parse(froststepRaw);

export interface SampleEntry {
  id: string;
  name: string;
  description: string;
  world: World;
}

export const SAMPLES: SampleEntry[] = [
  { id: 'hollow_reaches', name: HOLLOW_REACHES.meta.name, description: HOLLOW_REACHES.meta.description, world: HOLLOW_REACHES },
  { id: 'emberfell', name: SAMPLE_WORLD.meta.name, description: SAMPLE_WORLD.meta.description, world: SAMPLE_WORLD },
  { id: 'froststep', name: FROSTSTEP.meta.name, description: FROSTSTEP.meta.description, world: FROSTSTEP },
];
