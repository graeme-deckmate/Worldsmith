import { useEffect, useRef } from 'react';
import type { WorldMap } from '../../model/index.ts';
import { drawMap } from '../../render/tiles.ts';
import { PLACEABLES } from './placeables.ts';

interface Rect { x1: number; y1: number; x2: number; y2: number }

/**
 * Renders a map's terrain, zones, exits, placed entities and spawn, and reports
 * cell pointer events (down/drag/up) so the parent can apply the active tool.
 */
export function MapCanvas({
  map,
  scale,
  highlight,
  preview,
  onCellDown,
  onCellDrag,
  onCellUp,
}: {
  map: WorldMap;
  scale: number;
  highlight?: { x: number; y: number } | null;
  preview?: Rect | null;
  onCellDown: (x: number, y: number) => void;
  onCellDrag: (x: number, y: number) => void;
  onCellUp: (x: number, y: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const down = useRef(false);
  const W = map.width * scale;
  const H = map.height * scale;

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    drawMap(ctx, map.tiles, scale);

    // zones
    ctx.font = `${String(Math.max(8, scale * 0.5))}px ui-monospace, monospace`;
    for (const z of map.zones) {
      const x = Math.min(z.rect.x1, z.rect.x2) * scale;
      const y = Math.min(z.rect.y1, z.rect.y2) * scale;
      const w = (Math.abs(z.rect.x2 - z.rect.x1) + 1) * scale;
      const h = (Math.abs(z.rect.y2 - z.rect.y1) + 1) * scale;
      ctx.fillStyle = 'rgba(124,92,255,0.18)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(167,139,250,0.7)';
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.fillStyle = 'rgba(220,210,255,0.9)';
      ctx.fillText(z.name, x + 2, y + 11);
    }

    // exits
    for (const e of map.exits) {
      ctx.fillStyle = 'rgba(90,209,255,0.85)';
      ctx.fillRect(e.x * scale, e.y * scale, scale, scale);
      ctx.fillStyle = '#06121f';
      ctx.fillText('→', e.x * scale + scale * 0.2, e.y * scale + scale * 0.72);
    }

    // entities
    for (const p of PLACEABLES) {
      for (const ent of map[p.arrayKey]) {
        const cx = ent.x * scale;
        const cy = ent.y * scale;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(cx + scale / 2, cy + scale / 2, scale * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0c0c14';
        ctx.fillText(p.glyph, cx + scale * 0.28, cy + scale * 0.72);
      }
    }

    // spawn
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(map.spawn.x * scale + 1, map.spawn.y * scale + 1, scale - 2, scale - 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('@', map.spawn.x * scale + scale * 0.28, map.spawn.y * scale + scale * 0.72);

    // preview rect (zone drag)
    if (preview) {
      const x = Math.min(preview.x1, preview.x2) * scale;
      const y = Math.min(preview.y1, preview.y2) * scale;
      const w = (Math.abs(preview.x2 - preview.x1) + 1) * scale;
      const h = (Math.abs(preview.y2 - preview.y1) + 1) * scale;
      ctx.strokeStyle = '#ffd84a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    }

    // selection highlight
    if (highlight) {
      ctx.strokeStyle = '#ff5dd0';
      ctx.lineWidth = 2;
      ctx.strokeRect(highlight.x * scale + 1, highlight.y * scale + 1, scale - 2, scale - 2);
    }
  }, [map, scale, highlight, preview]);

  const cell = (e: React.PointerEvent): { x: number; y: number } | null => {
    const c = ref.current;
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * map.width);
    const y = Math.floor(((e.clientY - r.top) / r.height) * map.height);
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
    return { x, y };
  };

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      className="touch-none cursor-crosshair rounded border border-zinc-700"
      style={{ imageRendering: 'pixelated', maxWidth: '100%' }}
      onPointerDown={(e) => {
        const c = cell(e);
        if (!c) return;
        down.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        onCellDown(c.x, c.y);
      }}
      onPointerMove={(e) => {
        if (!down.current) return;
        const c = cell(e);
        if (c) onCellDrag(c.x, c.y);
      }}
      onPointerUp={(e) => {
        const c = cell(e);
        down.current = false;
        if (c) onCellUp(c.x, c.y);
      }}
    />
  );
}
