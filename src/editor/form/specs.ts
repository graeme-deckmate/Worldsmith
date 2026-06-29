import type { EntityReg } from './EntityListPanel.tsx';

/**
 * Declarative field specs + factories for the "stat" content collections (E2).
 * Each becomes a generic list+form editor via EntityListPanel. Deeply-nested
 * optional groups (status `dot`, rune `crit`) are intentionally omitted here and
 * editable via the raw inspector until a bespoke field lands.
 */

type Def = { id: string } & Record<string, unknown>;
const first = (arr: readonly { id: string }[], fallback: string): string => arr[0]?.id ?? fallback;

const REGS: EntityReg[] = [
  {
    key: 'elements',
    label: 'Elements',
    idPrefix: 'element',
    spec: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'color', label: 'Colour', kind: 'color' },
      { key: 'status', label: 'Inflicts status', kind: 'idref', ref: 'enemyStatuses' },
      { key: 'proc', label: 'Proc chance', kind: 'number', step: 0.05, help: '0–1' },
    ],
    factory: (id, w): Def => ({ id, label: id, color: '#a78bfa', status: first(w.enemyStatuses, 'status'), proc: 0.3 }),
  },
  {
    key: 'forms',
    label: 'Forms',
    idPrefix: 'form',
    spec: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'pw', label: 'Power ×', kind: 'number', step: 0.1 },
      { key: 'mp', label: 'MP cost ×', kind: 'number', step: 0.1 },
      { key: 'targeting', label: 'Targeting', kind: 'select', options: ['single', 'all', 'self'] },
      { key: 'archetype', label: 'Archetype', kind: 'select', options: ['projectile', 'veil', 'summon'] },
    ],
    factory: (id): Def => ({ id, label: id, pw: 1, mp: 1, targeting: 'single', archetype: 'projectile' }),
  },
  {
    key: 'runes',
    label: 'Runes',
    idPrefix: 'rune',
    spec: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'mp', label: 'MP cost ×', kind: 'number', step: 0.1 },
      { key: 'suffix', label: 'Name suffix', kind: 'text', help: 'e.g. " of fury"' },
      { key: 'blurb', label: 'Tooltip', kind: 'textarea' },
      { key: 'pw', label: 'Power ×', kind: 'number', step: 0.1, optional: true },
      { key: 'healFrac', label: 'Lifesteal frac', kind: 'number', step: 0.05, optional: true },
      { key: 'hits', label: 'Hits', kind: 'number', step: 1, optional: true },
      { key: 'pwEach', label: 'Power/hit', kind: 'number', step: 0.05, optional: true },
      { key: 'procBonus', label: 'Proc +', kind: 'number', step: 0.05, optional: true },
      { key: 'varianceMin', label: 'Variance min', kind: 'number', step: 0.05, optional: true },
      { key: 'potencyMax', label: 'Potency max', kind: 'number', step: 0.1, optional: true },
      { key: 'veilReapply', label: 'Veil reapply', kind: 'bool' },
      { key: 'surges', label: 'Always surge', kind: 'bool' },
      { key: 'keepsReactionSetup', label: 'Keeps reaction setup', kind: 'bool' },
      { key: 'resistAsNeutral', label: 'Resist as neutral', kind: 'bool' },
      { key: 'refundOnKill', label: 'Refund on kill', kind: 'bool' },
      { key: 'alwaysStable', label: 'Always stable', kind: 'bool' },
    ],
    factory: (id): Def => ({ id, label: id, mp: 1, suffix: '', blurb: '' }),
  },
  {
    key: 'enemyStatuses',
    label: 'Enemy statuses',
    idPrefix: 'status',
    spec: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'duration', label: 'Duration', kind: 'number', step: 1 },
      { key: 'dealtMult', label: 'Damage dealt ×', kind: 'number', step: 0.05, optional: true },
      { key: 'takenMult', label: 'Damage taken ×', kind: 'number', step: 0.05, optional: true },
      { key: 'immunityAfter', label: 'Immunity after', kind: 'number', step: 1, optional: true },
      { key: 'skipsTurn', label: 'Skips turn', kind: 'bool' },
    ],
    factory: (id): Def => ({ id, label: id, duration: 3 }),
  },
  {
    key: 'playerStatuses',
    label: 'Player statuses',
    idPrefix: 'pstatus',
    spec: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'dotPctMaxHp', label: 'DoT % max HP', kind: 'number', step: 0.01, optional: true },
      { key: 'spellPowerMult', label: 'Spell power ×', kind: 'number', step: 0.05, optional: true },
      { key: 'takenMult', label: 'Damage taken ×', kind: 'number', step: 0.05, optional: true },
    ],
    factory: (id): Def => ({ id, label: id }),
  },
  {
    key: 'classes',
    label: 'Classes',
    idPrefix: 'class',
    spec: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'blurb', label: 'Blurb', kind: 'textarea' },
      { key: 'passive', label: 'Passive stat mods', kind: 'mods' },
    ],
    factory: (id): Def => ({ id, label: id, blurb: '', passive: {} }),
  },
  {
    key: 'difficulties',
    label: 'Difficulties',
    idPrefix: 'difficulty',
    spec: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'hpMult', label: 'Enemy HP ×', kind: 'number', step: 0.1 },
      { key: 'atkMult', label: 'Enemy ATK ×', kind: 'number', step: 0.1 },
      { key: 'econMult', label: 'Economy ×', kind: 'number', step: 0.1 },
    ],
    factory: (id): Def => ({ id, label: id, hpMult: 1, atkMult: 1, econMult: 1 }),
  },
  {
    key: 'rarities',
    label: 'Rarities',
    idPrefix: 'rarity',
    spec: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'affixCount', label: 'Affix count', kind: 'number', step: 1 },
      { key: 'valueMult', label: 'Value ×', kind: 'number', step: 0.1 },
    ],
    factory: (id): Def => ({ id, label: id, affixCount: 0, valueMult: 1 }),
  },
  {
    key: 'equipSlots',
    label: 'Equip slots',
    idPrefix: 'slot',
    spec: [{ key: 'label', label: 'Label', kind: 'text' }],
    factory: (id): Def => ({ id, label: id }),
  },
  {
    key: 'gearBases',
    label: 'Gear bases',
    idPrefix: 'gear',
    spec: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'slot', label: 'Slot', kind: 'idref', ref: 'equipSlots' },
      { key: 'value', label: 'Base value', kind: 'number', step: 1 },
      { key: 'mods', label: 'Stat mods', kind: 'mods' },
    ],
    factory: (id, w): Def => ({ id, label: id, slot: first(w.equipSlots, 'slot'), value: 10, mods: {} }),
  },
  {
    key: 'gearAffixes',
    label: 'Gear affixes',
    idPrefix: 'affix',
    spec: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'place', label: 'Place', kind: 'select', options: ['prefix', 'suffix'] },
      { key: 'minRarity', label: 'Min rarity', kind: 'idref', ref: 'rarities' },
      { key: 'mods', label: 'Stat mods', kind: 'mods' },
    ],
    factory: (id, w): Def => ({ id, label: id, place: 'prefix', minRarity: first(w.rarities, 'common'), mods: {} }),
  },
  {
    key: 'charms',
    label: 'Charms',
    idPrefix: 'charm',
    spec: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'blurb', label: 'Blurb', kind: 'textarea' },
    ],
    factory: (id): Def => ({ id, label: id, blurb: '' }),
  },
];

export const ENTITY_REGS: Record<string, EntityReg> = Object.fromEntries(
  REGS.map((r) => [r.key as string, r]),
);
