import { useWorld } from '../../store/worldStore.ts';
import type { StatMods, World } from '../../model/index.ts';
import { StatModsField } from './StatModsField.tsx';

/** A single declarative form field. Specs (specs.ts) list these per content type. */
export interface Field {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'number' | 'color' | 'bool' | 'select' | 'idref' | 'idrefMulti' | 'mods';
  /** for select */
  options?: readonly string[];
  /** for idref / idrefMulti: which World collection supplies the ids */
  ref?: keyof World;
  step?: number;
  help?: string;
  /** number/text fields that may be left unset */
  optional?: boolean;
}

type Def = Record<string, unknown>;

const labelCls = 'text-xs text-zinc-400 flex flex-col gap-1';
const inputCls = 'rounded bg-zinc-800 px-2 py-1.5 text-sm outline-none focus:ring-1 ring-violet-500';

function refItems(world: World, ref: keyof World): { id: string; label: string }[] {
  const arr = world[ref];
  if (!Array.isArray(arr)) return [];
  const out: { id: string; label: string }[] = [];
  for (const d of arr as unknown[]) {
    if (typeof d === 'object' && d !== null && 'id' in d) {
      const o = d as { id: string; label?: string; name?: string };
      out.push({ id: o.id, label: o.label ?? o.name ?? o.id });
    }
  }
  return out;
}

/** Renders a def as a form from a Field[] spec, emitting {key: value} patches. */
export function EntityForm({
  def,
  spec,
  onPatch,
}: {
  def: Def;
  spec: readonly Field[];
  onPatch: (patch: Def) => void;
}) {
  const world = useWorld((s) => s.world);
  if (!world) return null;

  return (
    <div className="grid grid-cols-2 gap-3 max-w-3xl">
      {spec.map((f) => {
        const val = def[f.key];
        const wide = f.kind === 'textarea' || f.kind === 'mods' || f.kind === 'idrefMulti';
        return (
          <label key={f.key} className={`${labelCls} ${wide ? 'col-span-2' : ''}`}>
            <span>
              {f.label}
              {f.help && <span className="text-zinc-600 ml-1">— {f.help}</span>}
            </span>

            {f.kind === 'text' && (
              <input className={inputCls} value={String(val ?? '')} onChange={(e) => onPatch({ [f.key]: e.target.value })} />
            )}

            {f.kind === 'textarea' && (
              <textarea className={inputCls} rows={2} value={String(val ?? '')} onChange={(e) => onPatch({ [f.key]: e.target.value })} />
            )}

            {f.kind === 'number' && (
              <input
                className={inputCls}
                type="number"
                step={f.step ?? 'any'}
                value={val === undefined || val === null ? '' : String(val)}
                onChange={(e) =>
                  onPatch({ [f.key]: e.target.value === '' ? (f.optional ? undefined : 0) : Number(e.target.value) })
                }
              />
            )}

            {f.kind === 'color' && (
              <span className="flex items-center gap-2">
                <input type="color" value={String(val ?? '#ffffff')} onChange={(e) => onPatch({ [f.key]: e.target.value })} />
                <input className={`${inputCls} w-28`} value={String(val ?? '')} onChange={(e) => onPatch({ [f.key]: e.target.value })} />
              </span>
            )}

            {f.kind === 'bool' && (
              <span className="flex items-center gap-2 h-8">
                <input type="checkbox" checked={Boolean(val)} onChange={(e) => onPatch({ [f.key]: e.target.checked })} />
                <span className="text-zinc-500 text-xs">{val ? 'on' : 'off'}</span>
              </span>
            )}

            {f.kind === 'select' && (
              <select className={inputCls} value={String(val ?? '')} onChange={(e) => onPatch({ [f.key]: e.target.value })}>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            )}

            {f.kind === 'idref' && f.ref && (
              <select className={inputCls} value={String(val ?? '')} onChange={(e) => onPatch({ [f.key]: e.target.value })}>
                <option value="">— none —</option>
                {refItems(world, f.ref).map((it) => (
                  <option key={it.id} value={it.id}>{it.label} ({it.id})</option>
                ))}
              </select>
            )}

            {f.kind === 'idrefMulti' && f.ref && (
              <div className="flex flex-wrap gap-1.5">
                {refItems(world, f.ref).map((it) => {
                  const arr = Array.isArray(val) ? (val as string[]) : [];
                  const on = arr.includes(it.id);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className={`px-2 py-0.5 rounded text-xs border ${
                        on ? 'bg-violet-600/30 border-violet-500 text-violet-200' : 'border-zinc-700 text-zinc-400'
                      }`}
                      onClick={() => onPatch({ [f.key]: on ? arr.filter((x) => x !== it.id) : [...arr, it.id] })}
                    >
                      {it.label}
                    </button>
                  );
                })}
                {refItems(world, f.ref).length === 0 && (
                  <span className="text-xs text-zinc-600">no {String(f.ref)} defined yet</span>
                )}
              </div>
            )}

            {f.kind === 'mods' && (
              <StatModsField value={(val as StatMods) ?? {}} onChange={(next) => onPatch({ [f.key]: next })} />
            )}
          </label>
        );
      })}
    </div>
  );
}
