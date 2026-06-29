import { z } from 'zod';
import { zId, zHexColor, zLabel } from './primitives.ts';

/**
 * Spellcraft content: elements, forms, runes, statuses, and the Wheel of
 * reactions/surges/twins. Mirrors Sigilbound's data/{elements,forms,runes,
 * statuses,wheel}.ts but with open ids so a World defines its own vocabulary.
 *
 * Effect FLAGS are data here (numbers/booleans). The behaviour they trigger is
 * interpreted by the runtime (E6) — the stated scope boundary.
 */

export const zElement = z
  .object({
    id: zId,
    label: zLabel,
    color: zHexColor,
    /** enemy status this element inflicts (a status id in this world). */
    status: zId,
    proc: z.number().min(0).max(1),
  })
  .strict();
export type Element = z.infer<typeof zElement>;

export const zTargeting = z.enum(['single', 'all', 'self']);

export const zForm = z
  .object({
    id: zId,
    label: zLabel,
    pw: z.number(),
    mp: z.number(),
    targeting: zTargeting,
    /** archetype behaviour: a plain projectile, a veil/shield, or a summon. */
    archetype: z.enum(['projectile', 'veil', 'summon']).default('projectile'),
  })
  .strict();
export type Form = z.infer<typeof zForm>;

/** The rich rune def: ~14 optional effect flags, all data. */
export const zRune = z
  .object({
    id: zId,
    label: zLabel,
    blurb: z.string().max(160).default(''),
    mp: z.number(),
    suffix: z.string().max(24).default(''),
    pw: z.number().optional(),
    healFrac: z.number().optional(),
    hits: z.number().int().optional(),
    pwEach: z.number().optional(),
    procBonus: z.number().optional(),
    crit: z.object({ chance: z.number(), mult: z.number() }).strict().optional(),
    veilReapply: z.boolean().optional(),
    surges: z.boolean().optional(),
    keepsReactionSetup: z.boolean().optional(),
    resistAsNeutral: z.boolean().optional(),
    varianceMin: z.number().optional(),
    refundOnKill: z.boolean().optional(),
    potencyMax: z.number().optional(),
    alwaysStable: z.boolean().optional(),
  })
  .strict();
export type Rune = z.infer<typeof zRune>;

export const zEnemyStatus = z
  .object({
    id: zId,
    label: zLabel,
    duration: z.number().int(),
    dot: z.object({ base: z.number(), perLv: z.number() }).strict().optional(),
    dealtMult: z.number().optional(),
    takenMult: z.number().optional(),
    skipsTurn: z.boolean().optional(),
    immunityAfter: z.number().int().optional(),
  })
  .strict();
export type EnemyStatus = z.infer<typeof zEnemyStatus>;

export const zPlayerStatus = z
  .object({
    id: zId,
    label: zLabel,
    dotPctMaxHp: z.number().optional(),
    spellPowerMult: z.number().optional(),
    takenMult: z.number().optional(),
  })
  .strict();
export type PlayerStatus = z.infer<typeof zPlayerStatus>;

/**
 * Author-defined effect a reaction applies when it fires. All optional: hitBonus
 * amplifies the triggering hit (×(1+x)); instantDot deals damage scaled off a
 * status's DoT tick (×mult, optionally × remaining turns); applyStatus inflicts a
 * status. Covers scald/shatter/snare/blight/kindle.
 */
export const zReactionEffect = z
  .object({
    hitBonus: z.number().optional(),
    instantDot: z
      .object({ status: zId, mult: z.number(), perRemainingTurn: z.boolean().optional() })
      .strict()
      .optional(),
    applyStatus: z.object({ status: zId, turns: z.number().int() }).strict().optional(),
  })
  .strict();
export type ReactionEffect = z.infer<typeof zReactionEffect>;

/** A reaction: a trigger element consumes a setup status for an effect. */
export const zReaction = z
  .object({
    id: zId,
    setup: zId, // enemy status consumed
    trigger: zId, // element that fires it
    line: z.string().max(120).default(''),
    effect: zReactionEffect.optional(),
  })
  .strict();
export type Reaction = z.infer<typeof zReaction>;

/** Author-defined surge effect (the d10 wyrd table). All fields optional. */
export const zSurgeEffect = z
  .object({
    damage: z.number().optional(),
    healHp: z.number().optional(),
    restoreMp: z.number().optional(),
    forceElementStatus: z.boolean().optional(),
    recastFrac: z.number().optional(),
    selfElementStatus: z.boolean().optional(),
    selfHpFracFee: z.number().optional(),
    mpDrain: z.number().optional(),
    randomEnemyStatus: z.object({ status: zId, turns: z.number().int() }).strict().optional(),
  })
  .strict();
export type SurgeEffect = z.infer<typeof zSurgeEffect>;

export const zSurge = z
  .object({
    roll: z.number().int().min(1),
    severity: z.enum(['mild', 'moderate', 'severe']),
    id: zId,
    line: z.string().max(120).default(''),
    effect: zSurgeEffect.optional(),
  })
  .strict();
export type Surge = z.infer<typeof zSurge>;

/** Author-defined twin-rider effect. All fields optional. */
export const zTwinRiderEffect = z
  .object({
    matchupCap: z.number().optional(),
    arcFrac: z.number().optional(),
    mpOnHit: z.number().optional(),
    ignoreShield: z.boolean().optional(),
    enemyNextMoveMult: z.number().optional(),
    spreadStatusOnKill: zId.optional(),
    extraDotTick: z.boolean().optional(),
    witherTakenMult: z.number().optional(),
    enemyActsLast: z.boolean().optional(),
    blockEnemyShieldTurns: z.number().int().optional(),
    reactionHitBonus: z.number().optional(),
  })
  .strict();
export type TwinRiderEffect = z.infer<typeof zTwinRiderEffect>;

export const zTwinPair = z
  .object({
    a: zId,
    b: zId,
    prefix: z.string().max(24),
    rider: zId,
    effect: zTwinRiderEffect.optional(),
  })
  .strict();
export type TwinPair = z.infer<typeof zTwinPair>;

/** Flat tuning for the wheel (mastery/aspect/twin/surge/reaction numbers). */
export const zWheelTuning = z.record(z.string(), z.number()).default({});

export const zWheel = z
  .object({
    order: z.array(zId).default([]),
    reactions: z.array(zReaction).default([]),
    surges: z.array(zSurge).default([]),
    twinPairs: z.array(zTwinPair).default([]),
    tuning: zWheelTuning,
  })
  .strict();
export type Wheel = z.infer<typeof zWheel>;
