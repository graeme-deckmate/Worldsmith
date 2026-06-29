import { z } from 'zod';
import { zId, zLabel, uniqueById } from './primitives.ts';
import { zSprite, zNamedPalette } from './sprites.ts';
import {
  zElement,
  zForm,
  zRune,
  zEnemyStatus,
  zPlayerStatus,
  zWheel,
} from './spellcraft.ts';
import { zEnemy, zBoss, zEliteAffix, zZone } from './combat.ts';
import { zRarity, zEquipSlot, zGearBase, zGearAffix, zClass, zDifficulty, zCharm } from './items.ts';
import { zMap, zDungeon, zDungeonObjective } from './maps.ts';
import { zUnlock, zGate, zSigilBosses } from './rules.ts';

/**
 * The World document — one JSON object holding all authored content. Collections
 * are ordered arrays of `{ id, ... }` defs (editor-friendly); the runtime adapter
 * builds keyed lookups from them. Versioned + migratable.
 */

export const SCHEMA_VERSION = 1;

export const zDialogue = z
  .object({ id: zId, speaker: z.string().max(40), pages: z.array(z.string()).min(1) })
  .strict();
export type Dialogue = z.infer<typeof zDialogue>;

export const zMusicTrack = z
  .object({
    id: zId,
    label: zLabel,
    bpm: z.number().int().optional(),
    bass: z.array(z.number().int()).optional(),
    lead: z.array(z.number().int()).optional(),
  })
  .strict();
export type MusicTrack = z.infer<typeof zMusicTrack>;

export const zMeta = z
  .object({
    id: zId,
    name: z.string().min(1).max(80),
    author: z.string().max(80).default(''),
    description: z.string().max(400).default(''),
    schemaVersion: z.number().int().default(SCHEMA_VERSION),
    createdAt: z.number().int().default(0),
    updatedAt: z.number().int().default(0),
  })
  .strict();
export type WorldMeta = z.infer<typeof zMeta>;

export const zStart = z
  .object({
    map: zId,
    level: z.number().int().default(1),
    starters: z.array(zId).default([]),
    backfillLevels: z.array(z.number().int()).default([]),
  })
  .strict();

export const zWorld = z
  .object({
    meta: zMeta,
    start: zStart,
    // spellcraft
    elements: uniqueById(zElement).default([]),
    forms: uniqueById(zForm).default([]),
    runes: uniqueById(zRune).default([]),
    enemyStatuses: uniqueById(zEnemyStatus).default([]),
    playerStatuses: uniqueById(zPlayerStatus).default([]),
    wheel: zWheel.default({ order: [], reactions: [], surges: [], twinPairs: [], tuning: {} }),
    // combat
    enemies: uniqueById(zEnemy).default([]),
    bosses: uniqueById(zBoss).default([]),
    eliteAffixes: uniqueById(zEliteAffix).default([]),
    zones: uniqueById(zZone).default([]),
    // items / character
    rarities: uniqueById(zRarity).default([]),
    equipSlots: uniqueById(zEquipSlot).default([]),
    gearBases: uniqueById(zGearBase).default([]),
    gearAffixes: uniqueById(zGearAffix).default([]),
    classes: uniqueById(zClass).default([]),
    difficulties: uniqueById(zDifficulty).default([]),
    charms: uniqueById(zCharm).default([]),
    // world / maps
    maps: uniqueById(zMap).default([]),
    dungeons: uniqueById(zDungeon).default([]),
    dungeonObjectives: uniqueById(zDungeonObjective).default([]),
    dialogue: uniqueById(zDialogue).default([]),
    music: uniqueById(zMusicTrack).default([]),
    // rules
    unlocks: z.array(zUnlock).default([]),
    gates: uniqueById(zGate).default([]),
    sigilBosses: zSigilBosses,
    // art
    sprites: uniqueById(zSprite).default([]),
    palettes: uniqueById(zNamedPalette).default([]),
    // numeric tuning (progression / combat / essence), kept flexible
    tuning: z.record(z.string(), z.record(z.string(), z.number())).default({}),
  })
  .strict();

export type World = z.infer<typeof zWorld>;

/** Result of parsing untrusted JSON into a World. */
export type ParseResult =
  | { ok: true; world: World }
  | { ok: false; error: string };

/** Parse + migrate untrusted data into a validated World. */
export function parseWorld(raw: unknown): ParseResult {
  const migrated = migrate(raw);
  const res = zWorld.safeParse(migrated);
  if (res.success) return { ok: true, world: res.data };
  const first = res.error.issues[0];
  const where = first?.path.join('.') ?? '';
  return { ok: false, error: `${where ? where + ': ' : ''}${first?.message ?? 'invalid world'}` };
}

/** Forward-migrate an older document shape. Currently a passthrough at v1. */
export function migrate(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  const obj = raw as Record<string, unknown>;
  const meta = (obj.meta ?? {}) as Record<string, unknown>;
  const version = typeof meta.schemaVersion === 'number' ? meta.schemaVersion : 0;
  // (no breaking migrations yet) — just stamp the current schema version.
  if (version < SCHEMA_VERSION) {
    return { ...obj, meta: { ...meta, schemaVersion: SCHEMA_VERSION } };
  }
  return obj;
}

/** A blank, valid World with the given id/name. */
export function emptyWorld(id: string, name: string, now = 0): World {
  return zWorld.parse({
    meta: { id, name, schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now },
    start: { map: 'start' },
  });
}
