import type { World } from '../model/index.ts';

/** An entry shown in a collection list: an id and an optional display label. */
export interface NavItem {
  id: string;
  label: string;
}

/** A navigable content section, grouped into the sidebar. */
export interface Section {
  key: string;
  label: string;
  group: 'Spellcraft' | 'Combat' | 'Items' | 'World' | 'Rules' | 'Art';
  items: (w: World) => NavItem[];
}

const named = (arr: readonly { id: string; label?: string; name?: string }[]): NavItem[] =>
  arr.map((d) => ({ id: d.id, label: d.label ?? d.name ?? d.id }));

export const SECTIONS: Section[] = [
  { key: 'elements', label: 'Elements', group: 'Spellcraft', items: (w) => named(w.elements) },
  { key: 'forms', label: 'Forms', group: 'Spellcraft', items: (w) => named(w.forms) },
  { key: 'runes', label: 'Runes', group: 'Spellcraft', items: (w) => named(w.runes) },
  { key: 'enemyStatuses', label: 'Enemy statuses', group: 'Spellcraft', items: (w) => named(w.enemyStatuses) },
  { key: 'playerStatuses', label: 'Player statuses', group: 'Spellcraft', items: (w) => named(w.playerStatuses) },
  {
    key: 'wheel',
    label: 'Wheel',
    group: 'Spellcraft',
    items: (w) => [
      ...w.wheel.reactions.map((r) => ({ id: r.id, label: `reaction ${r.id}` })),
      ...w.wheel.surges.map((s) => ({ id: s.id, label: `surge ${s.id}` })),
      ...w.wheel.twinPairs.map((t) => ({ id: `${t.a}_${t.b}`, label: `twin ${t.prefix}` })),
    ],
  },

  { key: 'enemies', label: 'Enemies', group: 'Combat', items: (w) => named(w.enemies) },
  { key: 'bosses', label: 'Bosses', group: 'Combat', items: (w) => named(w.bosses) },
  { key: 'zones', label: 'Zones', group: 'Combat', items: (w) => named(w.zones) },
  { key: 'eliteAffixes', label: 'Elite affixes', group: 'Combat', items: (w) => named(w.eliteAffixes) },

  { key: 'gearBases', label: 'Gear bases', group: 'Items', items: (w) => named(w.gearBases) },
  { key: 'gearAffixes', label: 'Gear affixes', group: 'Items', items: (w) => named(w.gearAffixes) },
  { key: 'rarities', label: 'Rarities', group: 'Items', items: (w) => named(w.rarities) },
  { key: 'equipSlots', label: 'Equip slots', group: 'Items', items: (w) => named(w.equipSlots) },
  { key: 'classes', label: 'Classes', group: 'Items', items: (w) => named(w.classes) },
  { key: 'difficulties', label: 'Difficulties', group: 'Items', items: (w) => named(w.difficulties) },
  { key: 'charms', label: 'Charms', group: 'Items', items: (w) => named(w.charms) },

  { key: 'maps', label: 'Maps', group: 'World', items: (w) => named(w.maps) },
  { key: 'dungeons', label: 'Dungeons', group: 'World', items: (w) => named(w.dungeons) },
  { key: 'dialogue', label: 'Dialogue', group: 'World', items: (w) => w.dialogue.map((d) => ({ id: d.id, label: d.speaker })) },
  { key: 'music', label: 'Music', group: 'World', items: (w) => named(w.music) },

  { key: 'unlocks', label: 'Unlock schedule', group: 'Rules', items: (w) => w.unlocks.map((u, i) => ({ id: String(i), label: `${u.kind}:${u.id}` })) },
  { key: 'gates', label: 'Area gates', group: 'Rules', items: (w) => named(w.gates) },

  { key: 'sprites', label: 'Sprites', group: 'Art', items: (w) => named(w.sprites) },
  { key: 'palettes', label: 'Palettes', group: 'Art', items: (w) => named(w.palettes) },
];

export const GROUPS = ['Spellcraft', 'Combat', 'Items', 'World', 'Rules', 'Art'] as const;
