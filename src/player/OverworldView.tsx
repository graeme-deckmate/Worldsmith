import { useEffect, useRef } from 'react';
import type { WorldMap } from '../model/index.ts';
import { drawMap } from '../render/tiles.ts';

/** Renders the active map and the player for the playtest overworld. */
export function OverworldView({
  map,
  px,
  py,
  scale,
  defeatedBosses,
}: {
  map: WorldMap;
  px: number;
  py: number;
  scale: number;
  defeatedBosses: Set<string>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    drawMap(ctx, map.tiles, scale);
    ctx.font = `${String(Math.max(8, scale * 0.6))}px ui-monospace, monospace`;

    const dot = (x: number, y: number, color: string, glyph: string): void => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x * scale + scale / 2, y * scale + scale / 2, scale * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0c0c14';
      ctx.fillText(glyph, x * scale + scale * 0.28, y * scale + scale * 0.72);
    };

    for (const e of map.exits) dot(e.x, e.y, '#5ad1ff', '→');
    for (const a of map.waystones) dot(a.x, a.y, '#5ad1ff', 'W');
    for (const a of map.springs) dot(a.x, a.y, '#5ad1ff', '≈');
    for (const a of map.shrines) dot(a.x, a.y, '#c08aff', '▲');
    for (const a of map.signs) dot(a.x, a.y, '#cda35a', 'S');
    for (const a of map.lore) dot(a.x, a.y, '#9ad1ff', 'L');
    for (const a of map.npcs) dot(a.x, a.y, '#ffd84a', 'N');
    for (const b of map.bosses) if (!defeatedBosses.has(b.id)) dot(b.x, b.y, '#ff5d5d', 'B');

    // player
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px * scale + scale / 2, py * scale + scale / 2, scale * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0c0c14';
    ctx.fillText('@', px * scale + scale * 0.28, py * scale + scale * 0.72);
  }, [map, px, py, scale, defeatedBosses]);

  return (
    <canvas
      ref={ref}
      width={map.width * scale}
      height={map.height * scale}
      className="rounded border border-zinc-700"
      style={{ imageRendering: 'pixelated', maxWidth: '100%' }}
    />
  );
}
