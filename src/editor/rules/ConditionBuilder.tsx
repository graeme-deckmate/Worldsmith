import { useWorld } from '../../store/worldStore.ts';
import type { Condition, World } from '../../model/index.ts';

/**
 * Recursive editor for the area-gate condition DSL. Leaves test concrete run
 * state (boss defeated, flag set, sigil count, level, item held, map visited);
 * all/any/not compose them. The runtime evaluates the same tree (E6).
 */

const TYPES: Condition['type'][] = [
  'bossDefeated', 'flagSet', 'sigilCount', 'level', 'itemHeld', 'mapVisited', 'all', 'any', 'not',
];

function defaultOf(type: Condition['type'], w: World): Condition {
  switch (type) {
    case 'bossDefeated': return { type, boss: w.bosses[0]?.id ?? 'boss' };
    case 'flagSet': return { type, flag: 'flag' };
    case 'sigilCount': return { type, atLeast: 1 };
    case 'level': return { type, atLeast: 1 };
    case 'itemHeld': return { type, item: w.gearBases[0]?.id ?? 'item' };
    case 'mapVisited': return { type, map: w.maps[0]?.id ?? 'map' };
    case 'all': return { type, of: [] };
    case 'any': return { type, of: [] };
    case 'not': return { type, cond: { type: 'flagSet', flag: 'flag' } };
  }
}

const sel = 'rounded bg-zinc-800 px-2 py-1 text-xs outline-none focus:ring-1 ring-violet-500';

export function ConditionBuilder({
  value,
  onChange,
}: {
  value: Condition;
  onChange: (next: Condition) => void;
}) {
  const world = useWorld((s) => s.world);
  if (!world) return null;

  const typePicker = (
    <select className={sel} value={value.type} onChange={(e) => onChange(defaultOf(e.target.value as Condition['type'], world))}>
      {TYPES.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );

  const refSelect = (cur: string, ref: keyof World, set: (id: string) => void) => {
    const arr = world[ref];
    const items = Array.isArray(arr) ? (arr as { id: string; label?: string; name?: string }[]) : [];
    return (
      <select className={sel} value={cur} onChange={(e) => set(e.target.value)}>
        {items.map((d) => (
          <option key={d.id} value={d.id}>{d.label ?? d.name ?? d.id}</option>
        ))}
      </select>
    );
  };

  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
      <div className="flex items-center gap-2 flex-wrap">
        {typePicker}
        {value.type === 'bossDefeated' && refSelect(value.boss, 'bosses', (boss) => onChange({ type: 'bossDefeated', boss }))}
        {value.type === 'itemHeld' && refSelect(value.item, 'gearBases', (item) => onChange({ type: 'itemHeld', item }))}
        {value.type === 'mapVisited' && refSelect(value.map, 'maps', (map) => onChange({ type: 'mapVisited', map }))}
        {value.type === 'flagSet' && (
          <input className={sel} value={value.flag} onChange={(e) => onChange({ type: 'flagSet', flag: e.target.value })} placeholder="flag" />
        )}
        {value.type === 'sigilCount' && (
          <input className={`${sel} w-20`} type="number" value={value.atLeast} onChange={(e) => onChange({ type: 'sigilCount', atLeast: Number(e.target.value) })} />
        )}
        {value.type === 'level' && (
          <input className={`${sel} w-20`} type="number" value={value.atLeast} onChange={(e) => onChange({ type: 'level', atLeast: Number(e.target.value) })} />
        )}
      </div>

      {(value.type === 'all' || value.type === 'any') && (
        <div className="mt-2 pl-3 border-l border-zinc-700 space-y-2">
          {value.of.map((child, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1">
                <ConditionBuilder
                  value={child}
                  onChange={(next) => onChange({ type: value.type, of: value.of.map((c, j) => (j === i ? next : c)) })}
                />
              </div>
              <button className="text-zinc-500 hover:text-rose-400 text-xs mt-1" onClick={() => onChange({ type: value.type, of: value.of.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <button
            className="text-xs rounded bg-zinc-700 hover:bg-zinc-600 px-2 py-1"
            onClick={() => onChange({ type: value.type, of: [...value.of, defaultOf('flagSet', world)] })}
          >
            + sub-condition
          </button>
        </div>
      )}

      {value.type === 'not' && (
        <div className="mt-2 pl-3 border-l border-zinc-700">
          <ConditionBuilder value={value.cond} onChange={(cond) => onChange({ type: 'not', cond })} />
        </div>
      )}
    </div>
  );
}
