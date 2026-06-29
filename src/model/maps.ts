import { z } from 'zod';
import { zId, zLabel } from './primitives.ts';

/**
 * The world/map model: a terrain grid plus typed entity arrays, exits and
 * portals. Mirrors core/mapdefs.ts `CompiledMap`. The editor (E4) authors these
 * directly as JSON and validates them in-browser with the ported maplib rules.
 */

/** Terrain legend (same chars as the game): walkable = . , * - = ; solid = # o ^ ~ x */
export const TERRAIN_CHARS = ['#', 'o', '^', '~', '=', '.', ',', '*', '-', 'x'] as const;
export const SOLID_TERRAIN = new Set(['#', 'o', '^', '~', 'x']);
export const WALKABLE = (ch: string): boolean => !SOLID_TERRAIN.has(ch);

export const MAP_THEMES = ['vale', 'cave', 'ash', 'hollow', 'ember', 'frost', 'storm', 'mire'] as const;
export const zTheme = z.enum(MAP_THEMES);

const xy = { x: z.number().int().min(0), y: z.number().int().min(0) };
const zDir = z.enum(['up', 'down', 'left', 'right']);

const zSpawn = z.object({ ...xy, facing: zDir }).strict();
const zRect = z
  .object({ x1: z.number().int(), y1: z.number().int(), x2: z.number().int(), y2: z.number().int() })
  .strict();

const zZoneRef = z.object({ name: zLabel, rect: zRect, table: zId }).strict();
const zExit = z.object({ ...xy, to: zId, tx: z.number().int(), ty: z.number().int() }).strict();
const zNpc = z.object({ id: zId, ...xy, dialogue: zId }).strict();
const zSign = z.object({ ...xy, dialogue: zId }).strict();
const zLore = z.object({ ...xy, dialogue: zId }).strict();
const zSpring = z.object({ ...xy }).strict();
const zShrine = z.object({ rune: zId, ...xy }).strict();
const zBossMarker = z.object({ id: zId, ...xy }).strict();
const zGate = z.object({ id: zId, ...xy }).strict();
const zTrigger = z.object({ id: zId, ...xy }).strict();
const zTrial = z.object({ key: zId, ...xy }).strict();
const zEgate = z.object({ id: zId, ...xy }).strict();
const zPortal = z
  .object({ dungeon: zId, ...xy, to: zId, tx: z.number().int(), ty: z.number().int() })
  .strict();
const zLever = z.object({ id: zId, ...xy }).strict();
const zDoor = z.object({ id: zId, ...xy, needs: z.string().min(1) }).strict();
const zChest = z.object({ id: zId, ...xy, reward: z.string().min(1) }).strict();
const zObjective = z.object({ id: zId, ...xy, battle: zId }).strict();
const zMiniboss = z.object({ id: zId, ...xy, species: zId, lv: z.number().int() }).strict();
const zWaystone = z.object({ id: zId, ...xy }).strict();
const zPlate = z.object({ id: zId, ...xy }).strict();
const zAmbush = z
  .object({ id: zId, ...xy, table: zId, lv: z.number().int(), repeat: z.boolean() })
  .strict();

export const zMap = z
  .object({
    id: zId,
    width: z.number().int().min(3).max(120),
    height: z.number().int().min(3).max(120),
    music: z.string().default(''),
    theme: zTheme.default('vale'),
    tiles: z.array(z.string()).min(1),
    spawn: zSpawn,
    zones: z.array(zZoneRef).default([]),
    exits: z.array(zExit).default([]),
    npcs: z.array(zNpc).default([]),
    signs: z.array(zSign).default([]),
    lore: z.array(zLore).default([]),
    springs: z.array(zSpring).default([]),
    shrines: z.array(zShrine).default([]),
    bosses: z.array(zBossMarker).default([]),
    gates: z.array(zGate).default([]),
    triggers: z.array(zTrigger).default([]),
    trials: z.array(zTrial).default([]),
    egates: z.array(zEgate).default([]),
    portals: z.array(zPortal).default([]),
    levers: z.array(zLever).default([]),
    doors: z.array(zDoor).default([]),
    chests: z.array(zChest).default([]),
    objectives: z.array(zObjective).default([]),
    minibosses: z.array(zMiniboss).default([]),
    waystones: z.array(zWaystone).default([]),
    plates: z.array(zPlate).default([]),
    ambushes: z.array(zAmbush).default([]),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (m.tiles.length !== m.height) {
      ctx.addIssue({ code: 'custom', message: `tiles has ${String(m.tiles.length)} rows, height ${String(m.height)}`, path: ['tiles'] });
    }
    m.tiles.forEach((row, i) => {
      if (row.length !== m.width) {
        ctx.addIssue({ code: 'custom', message: `row ${String(i)} width ${String(row.length)} != ${String(m.width)}`, path: ['tiles', i] });
      }
    });
  });
export type WorldMap = z.infer<typeof zMap>;

export const zDungeon = z
  .object({
    id: zId,
    name: zLabel,
    suggestedLv: z.number().int(),
    gold: z.number().int(),
    reward: z.object({ kind: z.string(), amount: z.number().optional(), ref: zId.optional() }).strict(),
    gearReward: z.object({ base: zId, rarity: zId }).strict().optional(),
  })
  .strict();
export type Dungeon = z.infer<typeof zDungeon>;

export const zDungeonObjective = z
  .object({ id: zId, members: z.array(zId).min(1), lv: z.number().int() })
  .strict();
export type DungeonObjective = z.infer<typeof zDungeonObjective>;
