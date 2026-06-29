import type { World, WorldMap } from '../model/index.ts';
import { SOLID_TERRAIN } from '../model/index.ts';

/** Pure overworld helpers for the player: terrain, exits, entities, zones, gates. */

export function tileAt(map: WorldMap, x: number, y: number): string {
  return (map.tiles[y] ?? '')[x] ?? 'x';
}
export function isSolidTile(map: WorldMap, x: number, y: number): boolean {
  return SOLID_TERRAIN.has(tileAt(map, x, y));
}
export function inBounds(map: WorldMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function exitAt(map: WorldMap, x: number, y: number) {
  return map.exits.find((e) => e.x === x && e.y === y) ?? null;
}

export type OverworldEntity =
  | { kind: 'boss'; id: string; x: number; y: number }
  | { kind: 'npc' | 'sign' | 'lore'; dialogue: string; x: number; y: number }
  | { kind: 'waystone' | 'spring' | 'shrine' | 'chest' | 'portal' | 'other'; x: number; y: number };

/** The interactable entity on a tile, if any (priority: boss, talk, then misc). */
export function entityAt(map: WorldMap, x: number, y: number): OverworldEntity | null {
  const boss = map.bosses.find((b) => b.x === x && b.y === y);
  if (boss) return { kind: 'boss', id: boss.id, x, y };
  const npc = map.npcs.find((n) => n.x === x && n.y === y);
  if (npc) return { kind: 'npc', dialogue: npc.dialogue, x, y };
  const sign = map.signs.find((s) => s.x === x && s.y === y);
  if (sign) return { kind: 'sign', dialogue: sign.dialogue, x, y };
  const lore = map.lore.find((l) => l.x === x && l.y === y);
  if (lore) return { kind: 'lore', dialogue: lore.dialogue, x, y };
  for (const [kind, arr] of [
    ['waystone', map.waystones], ['spring', map.springs], ['shrine', map.shrines], ['chest', map.chests], ['portal', map.portals],
  ] as const) {
    const e = arr.find((a) => a.x === x && a.y === y);
    if (e) return { kind, x, y };
  }
  return null;
}

export function zoneAt(map: WorldMap, x: number, y: number) {
  return (
    map.zones.find((z) =>
      x >= Math.min(z.rect.x1, z.rect.x2) && x <= Math.max(z.rect.x1, z.rect.x2) &&
      y >= Math.min(z.rect.y1, z.rect.y2) && y <= Math.max(z.rect.y1, z.rect.y2),
    ) ?? null
  );
}

/** The gate (if any) guarding entry to a given map. */
export function gateForMap(world: World, mapId: string) {
  return world.gates.find((g) => g.to === mapId) ?? null;
}
