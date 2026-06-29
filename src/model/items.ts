import { z } from 'zod';
import { zId, zLabel, zStatMods } from './primitives.ts';

/**
 * Items and character options: gear bases, gear affixes, equip slots, rarities,
 * classes, difficulties, charms. Mirrors core/items.ts + data/{gear,affixes,
 * classes,difficulty,discovery}.ts.
 */

export const zRarity = z
  .object({
    id: zId,
    label: zLabel,
    affixCount: z.number().int().min(0),
    valueMult: z.number(),
  })
  .strict();
export type Rarity = z.infer<typeof zRarity>;

export const zEquipSlot = z.object({ id: zId, label: zLabel }).strict();
export type EquipSlot = z.infer<typeof zEquipSlot>;

export const zGearBase = z
  .object({
    id: zId,
    slot: zId,
    label: zLabel,
    value: z.number(),
    mods: zStatMods,
  })
  .strict();
export type GearBase = z.infer<typeof zGearBase>;

export const zGearAffix = z
  .object({
    id: zId,
    label: zLabel,
    place: z.enum(['prefix', 'suffix']),
    minRarity: zId,
    mods: zStatMods,
  })
  .strict();
export type GearAffix = z.infer<typeof zGearAffix>;

export const zClass = z
  .object({
    id: zId,
    label: zLabel,
    blurb: z.string().max(200).default(''),
    passive: zStatMods,
  })
  .strict();
export type CharClass = z.infer<typeof zClass>;

export const zDifficulty = z
  .object({
    id: zId,
    label: zLabel,
    hpMult: z.number(),
    atkMult: z.number(),
    econMult: z.number(),
  })
  .strict();
export type Difficulty = z.infer<typeof zDifficulty>;

export const zCharm = z
  .object({ id: zId, label: zLabel, blurb: z.string().max(200).default('') })
  .strict();
export type Charm = z.infer<typeof zCharm>;
