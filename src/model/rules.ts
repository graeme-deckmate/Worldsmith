import { z } from 'zod';
import { zId } from './primitives.ts';

/**
 * Area-unlock rules — the feature the owner explicitly asked for. Two parts:
 *
 * 1. An UNLOCK SCHEDULE: which elements/forms/runes become available, and when
 *    (game start, a player level, clearing a shrine, choosing a starter, or a
 *    story flag). Mirrors data/unlocks.ts `UNLOCKS`.
 *
 * 2. A serializable CONDITION DSL for AREA GATES, generalizing the game's
 *    hardcoded `SOFT_GATES` predicate functions into authorable data. A gate
 *    bars entry to a map until its condition evaluates true; the runtime and
 *    the editor's rule builder both interpret the same tree.
 */

export const zUnlockTrigger = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start') }).strict(),
  z.object({ type: z.literal('level'), lv: z.number().int() }).strict(),
  z.object({ type: z.literal('shrine'), shrine: zId, region: z.string() }).strict(),
  z.object({ type: z.literal('starter') }).strict(),
  z.object({ type: z.literal('flag'), flag: z.string(), hint: z.string().default('') }).strict(),
]);
export type UnlockTrigger = z.infer<typeof zUnlockTrigger>;

export const zUnlock = z
  .object({
    kind: z.enum(['element', 'form', 'rune']),
    id: zId,
    trigger: zUnlockTrigger,
  })
  .strict();
export type Unlock = z.infer<typeof zUnlock>;

/**
 * A boolean condition over run state. Leaves test concrete progress; `all`/
 * `any`/`not` compose them. Kept as a recursive Zod schema so the editor can
 * build/edit the tree and the runtime can evaluate it.
 */
export type Condition =
  | { type: 'bossDefeated'; boss: string }
  | { type: 'flagSet'; flag: string }
  | { type: 'sigilCount'; atLeast: number }
  | { type: 'level'; atLeast: number }
  | { type: 'itemHeld'; item: string }
  | { type: 'mapVisited'; map: string }
  | { type: 'all'; of: Condition[] }
  | { type: 'any'; of: Condition[] }
  | { type: 'not'; cond: Condition };

export const zCondition: z.ZodType<Condition> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('bossDefeated'), boss: zId }).strict(),
    z.object({ type: z.literal('flagSet'), flag: z.string().min(1) }).strict(),
    z.object({ type: z.literal('sigilCount'), atLeast: z.number().int().min(0) }).strict(),
    z.object({ type: z.literal('level'), atLeast: z.number().int().min(1) }).strict(),
    z.object({ type: z.literal('itemHeld'), item: zId }).strict(),
    z.object({ type: z.literal('mapVisited'), map: zId }).strict(),
    z.object({ type: z.literal('all'), of: z.array(zCondition) }).strict(),
    z.object({ type: z.literal('any'), of: z.array(zCondition) }).strict(),
    z.object({ type: z.literal('not'), cond: zCondition }).strict(),
  ]),
);

/** An area gate: bar entry to `to` until `when` holds; show `barred` dialogue. */
export const zGate = z
  .object({
    id: zId,
    to: zId,
    when: zCondition,
    barred: zId,
  })
  .strict();
export type AreaGate = z.infer<typeof zGate>;

/** Bosses whose defeat counts toward `sigilCount` conditions. */
export const zSigilBosses = z.array(zId).default([]);
