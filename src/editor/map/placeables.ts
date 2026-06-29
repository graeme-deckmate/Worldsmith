import type { World, WorldMap } from '../../model/index.ts';
import type { Field } from '../form/EntityForm.tsx';

/**
 * Descriptors for every placeable map entity: which map array it lives in, how to
 * draw it, a factory for a freshly-placed instance, and the inspector fields
 * (reusing the generic EntityForm). Position (x,y) is handled by placement.
 */

type EntityArrayKey = Exclude<
  {
    [K in keyof WorldMap]: WorldMap[K] extends readonly { x: number; y: number }[] ? K : never;
  }[keyof WorldMap],
  undefined
>;

export interface Placeable {
  kind: string;
  arrayKey: EntityArrayKey;
  glyph: string;
  color: string;
  make: (x: number, y: number, world: World, map: WorldMap) => Record<string, unknown>;
  /** inspector fields (excluding x/y) */
  spec: Field[];
}

const counter = (map: WorldMap, arrayKey: EntityArrayKey, prefix: string): string => {
  const arr = map[arrayKey];
  for (let i = 1; ; i++) {
    const id = `${prefix}_${String(i)}`;
    if (!arr.some((e) => (e as { id?: string }).id === id)) return id;
  }
};

export const PLACEABLES: Placeable[] = [
  {
    kind: 'npc', arrayKey: 'npcs', glyph: 'N', color: '#ffd84a',
    make: (x, y, w, m) => ({ id: counter(m, 'npcs', 'npc'), x, y, dialogue: w.dialogue[0]?.id ?? 'dialogue' }),
    spec: [{ key: 'id', label: 'id', kind: 'text' }, { key: 'dialogue', label: 'Dialogue', kind: 'idref', ref: 'dialogue' }],
  },
  {
    kind: 'sign', arrayKey: 'signs', glyph: 'S', color: '#cda35a',
    make: (x, y, w) => ({ x, y, dialogue: w.dialogue[0]?.id ?? 'dialogue' }),
    spec: [{ key: 'dialogue', label: 'Dialogue', kind: 'idref', ref: 'dialogue' }],
  },
  {
    kind: 'lore', arrayKey: 'lore', glyph: 'L', color: '#9ad1ff',
    make: (x, y, w) => ({ x, y, dialogue: w.dialogue[0]?.id ?? 'dialogue' }),
    spec: [{ key: 'dialogue', label: 'Dialogue', kind: 'idref', ref: 'dialogue' }],
  },
  {
    kind: 'spring', arrayKey: 'springs', glyph: '≈', color: '#5ad1ff',
    make: (x, y) => ({ x, y }),
    spec: [],
  },
  {
    kind: 'shrine', arrayKey: 'shrines', glyph: '▲', color: '#c08aff',
    make: (x, y) => ({ x, y, rune: 'fury' }),
    spec: [{ key: 'rune', label: 'Rune id', kind: 'text' }],
  },
  {
    kind: 'boss', arrayKey: 'bosses', glyph: 'B', color: '#ff5d5d',
    make: (x, y, w) => ({ id: w.bosses[0]?.id ?? 'boss', x, y }),
    spec: [{ key: 'id', label: 'Boss', kind: 'idref', ref: 'bosses' }],
  },
  {
    kind: 'gate', arrayKey: 'gates', glyph: '╪', color: '#ffae42',
    make: (x, y, _w, m) => ({ id: counter(m, 'gates', 'gate'), x, y }),
    spec: [{ key: 'id', label: 'id', kind: 'text' }],
  },
  {
    kind: 'trigger', arrayKey: 'triggers', glyph: 'T', color: '#ff8a5a',
    make: (x, y, _w, m) => ({ id: counter(m, 'triggers', 'trigger'), x, y }),
    spec: [{ key: 'id', label: 'id', kind: 'text' }],
  },
  {
    kind: 'trial', arrayKey: 'trials', glyph: '✶', color: '#ffd84a',
    make: (x, y) => ({ key: 'shatter', x, y }),
    spec: [{ key: 'key', label: 'Trial key', kind: 'text' }],
  },
  {
    kind: 'egate', arrayKey: 'egates', glyph: 'E', color: '#8affc0',
    make: (x, y, _w, m) => ({ id: counter(m, 'egates', 'egate'), x, y }),
    spec: [{ key: 'id', label: 'id', kind: 'text' }],
  },
  {
    kind: 'portal', arrayKey: 'portals', glyph: 'O', color: '#c08aff',
    make: (x, y, w) => ({ dungeon: w.dungeons[0]?.id ?? 'dungeon', x, y, to: w.maps[0]?.id ?? 'map', tx: 1, ty: 1 }),
    spec: [
      { key: 'dungeon', label: 'Dungeon', kind: 'idref', ref: 'dungeons' },
      { key: 'to', label: 'To map', kind: 'idref', ref: 'maps' },
      { key: 'tx', label: 'Target x', kind: 'number' },
      { key: 'ty', label: 'Target y', kind: 'number' },
    ],
  },
  {
    kind: 'lever', arrayKey: 'levers', glyph: '⌐', color: '#9ad1ff',
    make: (x, y, _w, m) => ({ id: counter(m, 'levers', 'lever'), x, y }),
    spec: [{ key: 'id', label: 'id', kind: 'text' }],
  },
  {
    kind: 'door', arrayKey: 'doors', glyph: 'D', color: '#cda35a',
    make: (x, y, _w, m) => ({ id: counter(m, 'doors', 'door'), x, y, needs: 'lever:lever_1' }),
    spec: [{ key: 'id', label: 'id', kind: 'text' }, { key: 'needs', label: 'Needs', kind: 'text', help: 'lever:/key:/plate:/seq:' }],
  },
  {
    kind: 'chest', arrayKey: 'chests', glyph: '▢', color: '#ffd84a',
    make: (x, y, _w, m) => ({ id: counter(m, 'chests', 'chest'), x, y, reward: 'essence:20' }),
    spec: [{ key: 'id', label: 'id', kind: 'text' }, { key: 'reward', label: 'Reward', kind: 'text' }],
  },
  {
    kind: 'objective', arrayKey: 'objectives', glyph: '◎', color: '#ff5d5d',
    make: (x, y, w, m) => ({ id: counter(m, 'objectives', 'objective'), x, y, battle: w.dungeonObjectives[0]?.id ?? 'objective' }),
    spec: [{ key: 'id', label: 'id', kind: 'text' }, { key: 'battle', label: 'Objective battle', kind: 'idref', ref: 'dungeonObjectives' }],
  },
  {
    kind: 'miniboss', arrayKey: 'minibosses', glyph: 'M', color: '#ff8a5a',
    make: (x, y, w, m) => ({ id: counter(m, 'minibosses', 'miniboss'), x, y, species: w.enemies[0]?.id ?? 'enemy', lv: 5 }),
    spec: [
      { key: 'id', label: 'id', kind: 'text' },
      { key: 'species', label: 'Species', kind: 'idref', ref: 'enemies' },
      { key: 'lv', label: 'Level', kind: 'number' },
    ],
  },
  {
    kind: 'waystone', arrayKey: 'waystones', glyph: 'W', color: '#5ad1ff',
    make: (x, y, _w, m) => ({ id: counter(m, 'waystones', 'waystone'), x, y }),
    spec: [{ key: 'id', label: 'id', kind: 'text' }],
  },
  {
    kind: 'plate', arrayKey: 'plates', glyph: 'P', color: '#9ad1ff',
    make: (x, y, _w, m) => ({ id: counter(m, 'plates', 'plate'), x, y }),
    spec: [{ key: 'id', label: 'id', kind: 'text' }],
  },
  {
    kind: 'ambush', arrayKey: 'ambushes', glyph: 'A', color: '#ff5d5d',
    make: (x, y, w, m) => ({ id: counter(m, 'ambushes', 'ambush'), x, y, table: w.zones[0]?.id ?? 'zone', lv: 5, repeat: false }),
    spec: [
      { key: 'id', label: 'id', kind: 'text' },
      { key: 'table', label: 'Zone table', kind: 'idref', ref: 'zones' },
      { key: 'lv', label: 'Level', kind: 'number' },
      { key: 'repeat', label: 'Repeats', kind: 'bool' },
    ],
  },
];

export const PLACEABLE_BY_KIND: Record<string, Placeable> = Object.fromEntries(
  PLACEABLES.map((p) => [p.kind, p]),
);
