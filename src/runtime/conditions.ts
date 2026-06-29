import type { Condition } from '../model/index.ts';

/** The run-state the area-gate condition DSL is evaluated against. */
export interface RunState {
  bossesDefeated: Set<string>;
  flags: Set<string>;
  itemsHeld: Set<string>;
  mapsVisited: Set<string>;
  level: number;
  /** bosses whose defeat counts toward sigilCount (world.sigilBosses) */
  sigilBosses: readonly string[];
}

export function sigilCount(rs: RunState): number {
  return rs.sigilBosses.filter((b) => rs.bossesDefeated.has(b)).length;
}

/** Evaluate an area-gate condition tree against run state. */
export function evalCondition(c: Condition, rs: RunState): boolean {
  switch (c.type) {
    case 'bossDefeated':
      return rs.bossesDefeated.has(c.boss);
    case 'flagSet':
      return rs.flags.has(c.flag);
    case 'sigilCount':
      return sigilCount(rs) >= c.atLeast;
    case 'level':
      return rs.level >= c.atLeast;
    case 'itemHeld':
      return rs.itemsHeld.has(c.item);
    case 'mapVisited':
      return rs.mapsVisited.has(c.map);
    case 'all':
      return c.of.every((k) => evalCondition(k, rs));
    case 'any':
      return c.of.some((k) => evalCondition(k, rs));
    case 'not':
      return !evalCondition(c.cond, rs);
  }
}
