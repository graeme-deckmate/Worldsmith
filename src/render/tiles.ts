import type { WorldMap } from '../model/index.ts';
import { SOLID_TERRAIN } from '../model/index.ts';

/** Flat colour per terrain char, for the map editor canvas + player floor. */
export const TERRAIN_COLORS: Record<string, string> = {
  '.': '#3f7a3a', // grass
  ',': '#2f6e30', // tall grass (encounters)
  '*': '#6a9b4a', // flowers
  '-': '#8a6a3f', // path
  '~': '#2a5a8a', // water
  '=': '#6b5a3f', // bridge
  '#': '#21401a', // tree
  o: '#5a5a64', // rock
  '^': '#3a3a44', // cliff
  x: '#0a0a10', // void
};

export function tileColor(ch: string): string {
  return TERRAIN_COLORS[ch] ?? '#12121a';
}

/** Draw a terrain grid; each cell `scale` px. */
export function drawMap(ctx: CanvasRenderingContext2D, tiles: readonly string[], scale: number): void {
  for (let y = 0; y < tiles.length; y++) {
    const row = tiles[y] ?? '';
    for (let x = 0; x < row.length; x++) {
      ctx.fillStyle = tileColor(row[x] ?? '.');
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

export function walkable(ch: string): boolean {
  return !SOLID_TERRAIN.has(ch);
}

/** Tiles reachable on foot from spawn (BFS). Doors/egates/gates are passable. */
export function reachableTiles(map: WorldMap): Set<string> {
  const seen = new Set<string>();
  const passable = new Set<string>();
  // entity tiles that act as passable gates for reachability
  for (const d of map.doors) passable.add(`${String(d.x)},${String(d.y)}`);
  for (const e of map.egates) passable.add(`${String(e.x)},${String(e.y)}`);
  for (const g of map.gates) passable.add(`${String(g.x)},${String(g.y)}`);

  const at = (x: number, y: number): string => (map.tiles[y] ?? '')[x] ?? 'x';
  const ok = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < map.width && y < map.height &&
    (walkable(at(x, y)) || passable.has(`${String(x)},${String(y)}`));

  const start = map.spawn;
  if (!ok(start.x, start.y)) return seen;
  const queue: [number, number][] = [[start.x, start.y]];
  seen.add(`${String(start.x)},${String(start.y)}`);
  while (queue.length) {
    const [x, y] = queue.shift() as [number, number];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${String(nx)},${String(ny)}`;
      if (!seen.has(key) && ok(nx, ny)) {
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  return seen;
}
