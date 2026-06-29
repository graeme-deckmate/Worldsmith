import type { Issue, World, WorldMap } from '../../model/index.ts';
import { reachableTiles, walkable } from '../../render/tiles.ts';

/**
 * Live, in-browser map validation — ported from Sigilbound's pure `maplib`
 * rules and adapted to the World map model. Checks bounds, walkability, exit
 * bidirectionality (against the World's other maps), stacking, and a reachability
 * flood-fill from spawn. Feeds the map editor's inline problems list.
 */

interface Placed {
  kind: string;
  x: number;
  y: number;
}

function placedEntities(m: WorldMap): Placed[] {
  const out: Placed[] = [];
  const add = (kind: string, arr: readonly { x: number; y: number }[]): void => {
    for (const e of arr) out.push({ kind, x: e.x, y: e.y });
  };
  add('npc', m.npcs);
  add('sign', m.signs);
  add('lore', m.lore);
  add('spring', m.springs);
  add('shrine', m.shrines);
  add('boss', m.bosses);
  add('gate', m.gates);
  add('trigger', m.triggers);
  add('trial', m.trials);
  add('egate', m.egates);
  add('portal', m.portals);
  add('lever', m.levers);
  add('door', m.doors);
  add('chest', m.chests);
  add('objective', m.objectives);
  add('miniboss', m.minibosses);
  add('waystone', m.waystones);
  add('plate', m.plates);
  add('ambush', m.ambushes);
  return out;
}

const tileAt = (m: WorldMap, x: number, y: number): string => (m.tiles[y] ?? '')[x] ?? 'x';
const inBounds = (m: WorldMap, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < m.width && y < m.height;

/** Validate one map in the context of the whole world. */
export function validateMap(map: WorldMap, world: World): Issue[] {
  const issues: Issue[] = [];
  const where = `maps.${map.id}`;
  const reached = reachableTiles(map);
  const isReached = (x: number, y: number): boolean => reached.has(`${String(x)},${String(y)}`);
  const adjacentReached = (x: number, y: number): boolean =>
    isReached(x + 1, y) || isReached(x - 1, y) || isReached(x, y + 1) || isReached(x, y - 1) || isReached(x, y);

  if (!walkable(tileAt(map, map.spawn.x, map.spawn.y))) {
    issues.push({ level: 'error', where, message: `spawn (${String(map.spawn.x)},${String(map.spawn.y)}) is on a solid tile` });
  }

  // exits
  const mapsById = new Map(world.maps.map((m) => [m.id, m]));
  for (const x of map.exits) {
    if (!inBounds(map, x.x, x.y)) {
      issues.push({ level: 'error', where, message: `exit at (${String(x.x)},${String(x.y)}) out of bounds` });
      continue;
    }
    const target = mapsById.get(x.to);
    if (!target) {
      issues.push({ level: 'error', where, message: `exit targets missing map "${x.to}"` });
    } else {
      const back = target.exits.some((e) => e.to === map.id);
      if (!back) issues.push({ level: 'warn', where, message: `exit to "${x.to}" has no return exit` });
      if (!walkable(tileAt(target, x.tx, x.ty)))
        issues.push({ level: 'warn', where, message: `exit lands on a solid tile in "${x.to}"` });
    }
    if (!isReached(x.x, x.y))
      issues.push({ level: 'warn', where, message: `exit at (${String(x.x)},${String(x.y)}) is not reachable from spawn` });
  }

  // entities: bounds, not on solid, not stacked, reachable
  const occupied = new Map<string, string>();
  for (const e of placedEntities(map)) {
    const key = `${String(e.x)},${String(e.y)}`;
    if (!inBounds(map, e.x, e.y)) {
      issues.push({ level: 'error', where, message: `${e.kind} at (${key}) out of bounds` });
      continue;
    }
    const solid = !walkable(tileAt(map, e.x, e.y));
    const passableKind = e.kind === 'gate' || e.kind === 'egate' || e.kind === 'door';
    if (solid && !passableKind)
      issues.push({ level: 'warn', where, message: `${e.kind} at (${key}) sits on a solid tile` });
    const prev = occupied.get(key);
    if (prev) issues.push({ level: 'warn', where, message: `${e.kind} stacks on ${prev} at (${key})` });
    else occupied.set(key, e.kind);
    if (!adjacentReached(e.x, e.y))
      issues.push({ level: 'warn', where, message: `${e.kind} at (${key}) is unreachable from spawn` });
  }

  // zones contain reachable tall grass
  for (const z of map.zones) {
    const r = z.rect;
    let hasGrass = false;
    for (let y = Math.min(r.y1, r.y2); y <= Math.max(r.y1, r.y2); y++) {
      for (let x = Math.min(r.x1, r.x2); x <= Math.max(r.x1, r.x2); x++) {
        if (tileAt(map, x, y) === ',' && isReached(x, y)) hasGrass = true;
      }
    }
    if (!hasGrass)
      issues.push({ level: 'warn', where, message: `zone "${z.name}" has no reachable tall grass (,)` });
  }

  return issues;
}
