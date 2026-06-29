import { z } from 'zod';

/**
 * Shared low-level schemas reused across every content collection.
 *
 * Worldsmith stores a World as plain JSON with OPEN string ids (unlike the
 * source game's closed unions), so the foundational types here are an id slug,
 * a hex colour, and the `StatMods` contract the combat layer reads.
 */

/** Content id: lowercase, starts with a letter; allows `_` and `.` (zone ids). */
export const zId = z
  .string()
  .min(1)
  .max(48)
  .regex(/^[a-z][a-z0-9_.]*$/, 'ids are lowercase, start with a letter, and use a-z 0-9 _ .');
export type Id = z.infer<typeof zId>;

/** `#rgb` or `#rrggbb` hex colour. */
export const zHexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'colour must be #rgb or #rrggbb');
export type HexColor = z.infer<typeof zHexColor>;

/** A short display label. */
export const zLabel = z.string().min(1).max(64);

/** The single stat contract the battle/loadout layer reads (mirrors items.ts StatMods). */
export const zStatMods = z
  .object({
    maxhp: z.number().optional(),
    maxmp: z.number().optional(),
    powerMult: z.number().optional(),
    costMult: z.number().optional(),
    critChance: z.number().optional(),
    critMult: z.number().optional(),
    procBonus: z.number().optional(),
    defense: z.number().optional(),
    regenStep: z.number().optional(),
    /** Per-element flat resist; keys are element ids in the same world. */
    resist: z.record(zId, z.number()).optional(),
  })
  .strict();
export type StatMods = z.infer<typeof zStatMods>;

/** Helper: an array of defs that each carry a unique `id`. */
export function uniqueById<T extends z.ZodTypeAny>(item: T) {
  return z.array(item).superRefine((arr, ctx) => {
    const seen = new Set<string>();
    arr.forEach((entry, i) => {
      const id = (entry as { id?: unknown }).id;
      if (typeof id !== 'string') return;
      if (seen.has(id)) {
        ctx.addIssue({ code: 'custom', message: `duplicate id "${id}"`, path: [i, 'id'] });
      }
      seen.add(id);
    });
  });
}
