import { z } from 'zod';
import { zId, zLabel, zHexColor } from './primitives.ts';

/**
 * Combatants and encounters: enemies (+ moves/riders), bosses (+ the 5-arm
 * BossSpecial), elite affixes, and encounter zones/formations. Mirrors
 * data/{enemies,elites,formations}.ts. The BossSpecial `kind`s and MoveRider
 * `type`s are a FIXED archetype set the runtime interprets; new data is free.
 */

export const zMoveRider = z.discriminatedUnion('type', [
  z.object({ type: z.literal('playerStatus'), status: zId, chance: z.number() }).strict(),
  z.object({ type: z.literal('mpDrain'), amount: z.number() }).strict(),
  z.object({ type: z.literal('selfShield'), amount: z.number() }).strict(),
]);
export type MoveRider = z.infer<typeof zMoveRider>;

export const zEnemyMove = z
  .object({
    name: zLabel,
    mult: z.number(),
    rider: zMoveRider.optional(),
    weight: z.number().optional(),
  })
  .strict();
export type EnemyMove = z.infer<typeof zEnemyMove>;

export const zEnemy = z
  .object({
    id: zId,
    name: zLabel,
    h0: z.number(),
    hpl: z.number(),
    a0: z.number(),
    al: z.number(),
    xpBase: z.number(),
    xpPerLv: z.number(),
    weak: z.array(zId).default([]),
    resist: z.array(zId).default([]),
    moves: z.array(zEnemyMove).min(1),
    /** sprite id (in world.sprites); falls back to a default if missing. */
    sprite: zId.optional(),
  })
  .strict();
export type Enemy = z.infer<typeof zEnemy>;

const barKey = zId;
export const zBossSpecial = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('bars'),
      barHp: z.number(),
      barKeys: z.array(barKey).min(1),
      offKeyMult: z.number(),
      summonSpecies: zId,
      summonLv: z.number().int(),
      unwriteEvery: z.number().int(),
      unwriteMult: z.number(),
      unwriteName: zLabel,
    })
    .strict(),
  z
    .object({
      kind: z.literal('submerge'),
      every: z.number().int(),
      voltMult: z.number(),
      breachName: zLabel,
      breachMult: z.number(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('summonAndVeil'),
      summonAtHpFrac: z.number(),
      summonSpecies: zId,
      summonCount: z.number().int(),
      summonLv: z.number().int(),
      veilName: zLabel,
      veilEvery: z.number().int(),
      veilShield: z.number(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('enrage'),
      belowHpFrac: z.number(),
      dmgMult: z.number(),
      weightedMove: zLabel,
      enragedWeightMult: z.number(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('attune'),
      attunedMult: z.number(),
      otherMult: z.number(),
      shiftEveryPhase1: z.number().int(),
      shiftEveryPhase2: z.number().int(),
      phase2AtHpFrac: z.number(),
      phase3AtHpFrac: z.number(),
      summonSpecies: zId,
      summonCount: z.number().int(),
      summonLv: z.number().int(),
      doomName: zLabel,
      doomMult: z.number(),
    })
    .strict(),
]);
export type BossSpecial = z.infer<typeof zBossSpecial>;

export const zBoss = z
  .object({
    id: zId,
    name: zLabel,
    lv: z.number().int(),
    hp: z.number(),
    a0: z.number(),
    al: z.number(),
    xp: z.number(),
    weak: z.array(zId).default([]),
    resist: z.array(zId).default([]),
    moves: z.array(zEnemyMove).min(1),
    intro: z.string().max(200).default(''),
    sigilToast: z.string().max(120).default(''),
    special: zBossSpecial,
    sprite: zId.optional(),
  })
  .strict();
export type Boss = z.infer<typeof zBoss>;

export const zEliteAffix = z.object({ id: zId, prefix: zLabel }).strict();
export type EliteAffix = z.infer<typeof zEliteAffix>;

export const zFormation = z
  .object({ members: z.array(zId).min(1), weight: z.number() })
  .strict();
export type Formation = z.infer<typeof zFormation>;

export const zZone = z
  .object({
    id: zId,
    levelMin: z.number().int(),
    levelMax: z.number().int(),
    formations: z.array(zFormation).min(1),
    eliteChance: z.number().optional(),
    /** battle backdrop colours. */
    backdrop: z
      .object({ sky: z.tuple([zHexColor, zHexColor]), hill: zHexColor, ground: zHexColor })
      .strict()
      .optional(),
  })
  .strict();
export type Zone = z.infer<typeof zZone>;
