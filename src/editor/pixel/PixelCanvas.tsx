import { useEffect, useRef } from 'react';
import type { Palette } from '../../model/index.ts';
import { drawSprite, gridWidth } from '../../render/pixels.ts';

/**
 * Interactive pixel grid. Renders a checkerboard (transparency), the sprite, and
 * optional grid lines, and reports the cell under pointer drags via onPaint.
 */
export function PixelCanvas({
  grid,
  pal,
  scale,
  showGrid = true,
  onPaint,
  onStrokeEnd,
}: {
  grid: readonly string[];
  pal: Palette;
  scale: number;
  showGrid?: boolean;
  onPaint?: (x: number, y: number) => void;
  onStrokeEnd?: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const painting = useRef(false);
  const w = gridWidth(grid);
  const h = grid.length;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // checkerboard for transparent cells
    const c = scale / 2;
    for (let y = 0; y < h * 2; y++) {
      for (let x = 0; x < w * 2; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#1b1b24' : '#23232f';
        ctx.fillRect(x * c, y * c, c, c);
      }
    }
    drawSprite(ctx, grid, pal, scale);
    if (showGrid && scale >= 6) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x++) {
        ctx.beginPath();
        ctx.moveTo(x * scale + 0.5, 0);
        ctx.lineTo(x * scale + 0.5, h * scale);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale + 0.5);
        ctx.lineTo(w * scale, y * scale + 0.5);
        ctx.stroke();
      }
    }
  }, [grid, pal, scale, w, h, showGrid]);

  const cellFromEvent = (e: React.PointerEvent): { x: number; y: number } | null => {
    const canvas = ref.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * w);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * h);
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    return { x, y };
  };

  return (
    <canvas
      ref={ref}
      width={Math.max(1, w * scale)}
      height={Math.max(1, h * scale)}
      className="pixelated touch-none cursor-crosshair rounded border border-zinc-800 bg-zinc-900"
      onPointerDown={(e) => {
        if (!onPaint) return;
        painting.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        const cell = cellFromEvent(e);
        if (cell) onPaint(cell.x, cell.y);
      }}
      onPointerMove={(e) => {
        if (!onPaint || !painting.current) return;
        const cell = cellFromEvent(e);
        if (cell) onPaint(cell.x, cell.y);
      }}
      onPointerUp={() => {
        if (painting.current) onStrokeEnd?.();
        painting.current = false;
      }}
      onPointerLeave={() => {
        if (painting.current) onStrokeEnd?.();
        painting.current = false;
      }}
    />
  );
}
