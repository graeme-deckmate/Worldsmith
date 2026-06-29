import type { World } from '../model/index.ts';

/**
 * Which element/form/rune ids are available to the player given level, flags and
 * the chosen starter — applying the World's unlock schedule. A part with no
 * schedule entry is available by default; otherwise any satisfied trigger unlocks it.
 */
export function availableIds(
  world: World,
  kind: 'element' | 'form' | 'rune',
  level: number,
  flags: Set<string>,
  starter: string | null,
): string[] {
  const all = kind === 'element' ? world.elements : kind === 'form' ? world.forms : world.runes;
  const out: string[] = [];
  for (const def of all) {
    const rules = world.unlocks.filter((u) => u.kind === kind && u.id === def.id);
    if (rules.length === 0) {
      out.push(def.id);
      continue;
    }
    const ok = rules.some((u) => {
      const t = u.trigger;
      switch (t.type) {
        case 'start': return true;
        case 'starter': return starter === def.id;
        case 'level': return level >= t.lv;
        case 'flag': return flags.has(t.flag);
        case 'shrine': return flags.has(`shrine_${t.shrine}`);
      }
    });
    if (ok) out.push(def.id);
  }
  return out;
}
