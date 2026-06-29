import { useWorld } from '../../store/worldStore.ts';
import type { StatMods } from '../../model/index.ts';

const SCALARS: { key: keyof StatMods; label: string }[] = [
  { key: 'maxhp', label: 'max HP' },
  { key: 'maxmp', label: 'max MP' },
  { key: 'powerMult', label: 'power ×' },
  { key: 'costMult', label: 'cost ×' },
  { key: 'critChance', label: 'crit %' },
  { key: 'critMult', label: 'crit ×' },
  { key: 'procBonus', label: 'proc +' },
  { key: 'defense', label: 'defense' },
  { key: 'regenStep', label: 'regen/step' },
];

/** Editor for the shared StatMods contract (gear bases, affixes, class passives). */
export function StatModsField({
  value,
  onChange,
}: {
  value: StatMods;
  onChange: (next: StatMods) => void;
}) {
  const elements = useWorld((s) => s.world?.elements ?? []);
  const field = 'w-20 rounded bg-zinc-800 px-2 py-1 text-sm outline-none focus:ring-1 ring-violet-500';

  const setScalar = (key: keyof StatMods, raw: string): void => {
    if (raw === '') {
      const next: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) if (k !== key) next[k] = v;
      onChange(next as StatMods);
      return;
    }
    onChange({ ...value, [key]: Number(raw) });
  };
  const setResist = (el: string, raw: string): void => {
    const resist: Record<string, number> = {};
    for (const [k, v] of Object.entries(value.resist ?? {})) if (k !== el) resist[k] = v;
    if (raw !== '') resist[el] = Number(raw);
    if (Object.keys(resist).length === 0) {
      const next: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) if (k !== 'resist') next[k] = v;
      onChange(next as StatMods);
    } else {
      onChange({ ...value, resist });
    }
  };

  return (
    <div className="rounded border border-zinc-800 p-3 bg-zinc-900/30">
      <div className="grid grid-cols-3 gap-2">
        {SCALARS.map((s) => (
          <label key={s.key} className="text-[11px] text-zinc-400 flex flex-col gap-0.5">
            {s.label}
            <input
              className={field}
              type="number"
              step="any"
              value={value[s.key] === undefined ? '' : String(value[s.key])}
              onChange={(e) => setScalar(s.key, e.target.value)}
            />
          </label>
        ))}
      </div>
      {elements.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] text-zinc-500 mb-1">resist (per element)</div>
          <div className="grid grid-cols-3 gap-2">
            {elements.map((el) => (
              <label key={el.id} className="text-[11px] text-zinc-400 flex items-center gap-1">
                <span className="w-12 truncate" style={{ color: el.color }}>{el.label}</span>
                <input
                  className={field}
                  type="number"
                  step="any"
                  value={value.resist?.[el.id] === undefined ? '' : String(value.resist[el.id])}
                  onChange={(e) => setResist(el.id, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
