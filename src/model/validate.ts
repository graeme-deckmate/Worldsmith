import type { World } from './world.ts';
import type { Condition } from './rules.ts';

/** A surfaced validation problem. `error` blocks export; `warn` is advisory. */
export interface Issue {
  level: 'error' | 'warn';
  where: string;
  message: string;
}

const idSet = (arr: readonly { id: string }[]): Set<string> => new Set(arr.map((d) => d.id));

/** Collect every boss/flag id referenced by a condition tree (for validation). */
function conditionRefs(c: Condition, bosses: string[], maps: string[]): void {
  switch (c.type) {
    case 'bossDefeated':
      bosses.push(c.boss);
      break;
    case 'mapVisited':
      maps.push(c.map);
      break;
    case 'all':
    case 'any':
      c.of.forEach((k) => conditionRefs(k, bosses, maps));
      break;
    case 'not':
      conditionRefs(c.cond, bosses, maps);
      break;
    default:
      break;
  }
}

/**
 * Cross-reference integrity over a World: every id a def points at must exist.
 * Returns a flat list of issues; the editor surfaces them and blocks export on
 * any `error`. Extended further in E5.
 */
export function validateWorld(w: World): Issue[] {
  const issues: Issue[] = [];
  const elements = idSet(w.elements);
  const enemyStatuses = idSet(w.enemyStatuses);
  const enemies = idSet(w.enemies);
  const bosses = idSet(w.bosses);
  const zones = idSet(w.zones);
  const maps = idSet(w.maps);
  const dialogue = idSet(w.dialogue);
  const sprites = idSet(w.sprites);

  const ref = (cond: boolean, level: Issue['level'], where: string, message: string): void => {
    if (!cond) issues.push({ level, where, message });
  };

  for (const e of w.elements) {
    ref(enemyStatuses.has(e.status), 'error', `elements.${e.id}`, `status "${e.status}" not found`);
  }
  for (const en of w.enemies) {
    for (const el of [...en.weak, ...en.resist])
      ref(elements.has(el), 'error', `enemies.${en.id}`, `element "${el}" not found`);
    if (en.sprite) ref(sprites.has(en.sprite), 'warn', `enemies.${en.id}`, `sprite "${en.sprite}" not found`);
  }
  for (const b of w.bosses) {
    for (const el of [...b.weak, ...b.resist])
      ref(elements.has(el), 'error', `bosses.${b.id}`, `element "${el}" not found`);
    if (b.sprite) ref(sprites.has(b.sprite), 'warn', `bosses.${b.id}`, `sprite "${b.sprite}" not found`);
  }
  for (const z of w.zones) {
    for (const f of z.formations)
      for (const m of f.members)
        ref(enemies.has(m), 'error', `zones.${z.id}`, `enemy "${m}" not found`);
  }
  for (const m of w.maps) {
    for (const x of m.exits) ref(maps.has(x.to), 'error', `maps.${m.id}`, `exit target "${x.to}" not found`);
    for (const bm of m.bosses) ref(bosses.has(bm.id), 'error', `maps.${m.id}`, `boss "${bm.id}" not found`);
    for (const zr of m.zones) ref(zones.has(zr.table), 'error', `maps.${m.id}`, `zone "${zr.table}" not found`);
    for (const n of m.npcs) ref(dialogue.has(n.dialogue), 'error', `maps.${m.id}`, `dialogue "${n.dialogue}" not found`);
    for (const s of m.signs) ref(dialogue.has(s.dialogue), 'error', `maps.${m.id}`, `dialogue "${s.dialogue}" not found`);
    for (const l of m.lore) ref(dialogue.has(l.dialogue), 'error', `maps.${m.id}`, `dialogue "${l.dialogue}" not found`);
  }
  for (const g of w.gates) {
    ref(maps.has(g.to), 'error', `gates.${g.id}`, `gate target map "${g.to}" not found`);
    ref(dialogue.has(g.barred), 'warn', `gates.${g.id}`, `barred dialogue "${g.barred}" not found`);
    const refBosses: string[] = [];
    const refMaps: string[] = [];
    conditionRefs(g.when, refBosses, refMaps);
    for (const rb of refBosses) ref(bosses.has(rb), 'error', `gates.${g.id}`, `condition boss "${rb}" not found`);
    for (const rm of refMaps) ref(maps.has(rm), 'error', `gates.${g.id}`, `condition map "${rm}" not found`);
  }
  if (w.maps.length > 0) {
    ref(maps.has(w.start.map), 'error', 'start', `start map "${w.start.map}" not found`);
  }

  // wheel cross-references
  for (const el of w.wheel.order)
    ref(elements.has(el), 'warn', 'wheel.order', `element "${el}" not found`);
  for (const r of w.wheel.reactions) {
    ref(enemyStatuses.has(r.setup), 'error', `wheel.reaction.${r.id}`, `setup status "${r.setup}" not found`);
    ref(elements.has(r.trigger), 'error', `wheel.reaction.${r.id}`, `trigger element "${r.trigger}" not found`);
    if (r.effect?.instantDot)
      ref(enemyStatuses.has(r.effect.instantDot.status), 'error', `wheel.reaction.${r.id}`, `effect status "${r.effect.instantDot.status}" not found`);
    if (r.effect?.applyStatus)
      ref(enemyStatuses.has(r.effect.applyStatus.status), 'error', `wheel.reaction.${r.id}`, `effect status "${r.effect.applyStatus.status}" not found`);
  }
  for (const su of w.wheel.surges) {
    if (su.effect?.randomEnemyStatus)
      ref(enemyStatuses.has(su.effect.randomEnemyStatus.status), 'error', `wheel.surge.${su.id}`, `effect status "${su.effect.randomEnemyStatus.status}" not found`);
  }
  for (const tp of w.wheel.twinPairs) {
    ref(elements.has(tp.a), 'error', `wheel.twin.${tp.a}_${tp.b}`, `element "${tp.a}" not found`);
    ref(elements.has(tp.b), 'error', `wheel.twin.${tp.a}_${tp.b}`, `element "${tp.b}" not found`);
    if (tp.effect?.spreadStatusOnKill)
      ref(enemyStatuses.has(tp.effect.spreadStatusOnKill), 'error', `wheel.twin.${tp.a}_${tp.b}`, `spread status "${tp.effect.spreadStatusOnKill}" not found`);
  }
  return issues;
}
