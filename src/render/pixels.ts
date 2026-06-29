import type { Palette } from '../model/index.ts';

/**
 * Grid -> canvas rendering, shared by the pixel editor (E1) and the bundled
 * player (E6). A grid is rows of chars; each char looks up a hex in the palette.
 * `.` (and any char missing from the palette) renders transparent.
 */

export function gridWidth(grid: readonly string[]): number {
  return grid[0]?.length ?? 0;
}

/** Draw a grid+palette onto a 2D context, each cell `scale` px, top-left at (ox,oy). */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  grid: readonly string[],
  pal: Palette,
  scale: number,
  ox = 0,
  oy = 0,
): void {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y] ?? '';
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] ?? '.';
      const color = pal[ch];
      if (!color || ch === '.') continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}

/** Render a grid+palette to a data URL (for list thumbnails). */
export function spriteDataUrl(grid: readonly string[], pal: Palette, scale = 4): string {
  const w = gridWidth(grid);
  const h = grid.length;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w * scale);
  canvas.height = Math.max(1, h * scale);
  const ctx = canvas.getContext('2d');
  if (ctx) drawSprite(ctx, grid, pal, scale);
  return canvas.toDataURL();
}

/** Set a single cell in a grid, returning a new grid (immutable). */
export function setCell(grid: readonly string[], x: number, y: number, ch: string): string[] {
  if (y < 0 || y >= grid.length) return grid.slice();
  const row = grid[y] ?? '';
  if (x < 0 || x >= row.length) return grid.slice();
  const next = grid.slice();
  next[y] = row.slice(0, x) + ch + row.slice(x + 1);
  return next;
}

/** Resize a grid to w×h, padding with '.' and cropping as needed. */
export function resizeGrid(grid: readonly string[], w: number, h: number): string[] {
  const out: string[] = [];
  for (let y = 0; y < h; y++) {
    const row = grid[y] ?? '';
    out.push(row.slice(0, w).padEnd(w, '.'));
  }
  return out;
}

/** The next unused single-char palette key (a-z, A-Z, 0-9), or null if full. */
export function nextPaletteChar(pal: Palette): string | null {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (const c of chars) if (!(c in pal)) return c;
  return null;
}
