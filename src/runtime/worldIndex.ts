import type {
  Boss,
  Dialogue,
  Element,
  Enemy,
  EnemyStatus,
  Form,
  Rune,
  World,
  WorldMap,
  Zone,
} from '../model/index.ts';

/**
 * Builds keyed lookups from a World's ordered arrays so the runtime can resolve
 * ids in O(1) (mirrors how the game imports Record tables, but per-World).
 */
export interface WorldIndex {
  world: World;
  elements: Map<string, Element>;
  forms: Map<string, Form>;
  runes: Map<string, Rune>;
  enemyStatuses: Map<string, EnemyStatus>;
  enemies: Map<string, Enemy>;
  bosses: Map<string, Boss>;
  zones: Map<string, Zone>;
  maps: Map<string, WorldMap>;
  dialogue: Map<string, Dialogue>;
}

const byId = <T extends { id: string }>(arr: readonly T[]): Map<string, T> =>
  new Map(arr.map((d) => [d.id, d]));

export function indexWorld(world: World): WorldIndex {
  return {
    world,
    elements: byId(world.elements),
    forms: byId(world.forms),
    runes: byId(world.runes),
    enemyStatuses: byId(world.enemyStatuses),
    enemies: byId(world.enemies),
    bosses: byId(world.bosses),
    zones: byId(world.zones),
    maps: byId(world.maps),
    dialogue: byId(world.dialogue),
  };
}
