import { z } from 'zod';
import { zId, zHexColor } from './primitives.ts';

/**
 * Pixel-art model, mirroring the game's `BattleSprite` = a char grid + a
 * palette (char -> hex). The char `.` (and any char missing from the palette)
 * renders transparent. Rows must be uniform width. This is what the pixel
 * colour editor (E1) reads and writes.
 */

/** A palette maps a single character to a hex colour. */
export const zPalette = z.record(z.string().length(1), zHexColor);
export type Palette = z.infer<typeof zPalette>;

export const zSprite = z
  .object({
    id: zId,
    /** Grid rows; every row must be the same length. `.` = transparent. */
    grid: z.array(z.string()).min(1).max(64),
    pal: zPalette,
  })
  .strict()
  .superRefine((s, ctx) => {
    const w = s.grid[0]?.length ?? 0;
    if (w === 0) {
      ctx.addIssue({ code: 'custom', message: 'sprite has empty rows', path: ['grid'] });
      return;
    }
    s.grid.forEach((row, i) => {
      if (row.length !== w) {
        ctx.addIssue({
          code: 'custom',
          message: `row ${String(i)} width ${String(row.length)} != ${String(w)}`,
          path: ['grid', i],
        });
      }
    });
  });
export type Sprite = z.infer<typeof zSprite>;

/** A named palette swap (player cosmetic / villager recolour). */
export const zNamedPalette = z
  .object({
    id: zId,
    label: z.string().min(1).max(64),
    pal: zPalette,
  })
  .strict();
export type NamedPalette = z.infer<typeof zNamedPalette>;
