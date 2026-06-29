import { useWorld } from '../../store/worldStore.ts';
import type { Unlock, UnlockTrigger } from '../../model/index.ts';

/**
 * Unlock-schedule editor: which elements/forms/runes become available and when
 * (start / level / shrine / starter / flag). Mirrors the game's UNLOCKS table.
 */

const TRIGGER_TYPES: UnlockTrigger['type'][] = ['start', 'level', 'shrine', 'starter', 'flag'];

function triggerDefault(type: UnlockTrigger['type']): UnlockTrigger {
  switch (type) {
    case 'start': return { type };
    case 'starter': return { type };
    case 'level': return { type, lv: 2 };
    case 'shrine': return { type, shrine: 'shrine', region: '' };
    case 'flag': return { type, flag: 'flag', hint: '' };
  }
}

const sel = 'rounded bg-zinc-800 px-2 py-1 text-xs outline-none focus:ring-1 ring-violet-500';

export function UnlocksPanel() {
  const { world, update } = useWorld();
  if (!world) return null;
  const unlocks = world.unlocks;

  const write = (next: Unlock[]): void => update((w) => ({ ...w, unlocks: next }));
  const setRow = (i: number, patch: Partial<Unlock>): void =>
    write(unlocks.map((u, j) => (j === i ? ({ ...u, ...patch } as Unlock) : u)));
  const collectionFor = (kind: Unlock['kind']) =>
    kind === 'element' ? world.elements : kind === 'form' ? world.forms : world.runes;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Unlock schedule</h2>
        <button
          className="text-xs rounded bg-violet-600 hover:bg-violet-500 px-2 py-1"
          onClick={() => write([...unlocks, { kind: 'element', id: world.elements[0]?.id ?? 'element', trigger: { type: 'start' } }])}
        >
          + unlock
        </button>
      </div>

      <div className="space-y-2">
        {unlocks.map((u, i) => {
          const t = u.trigger;
          return (
            <div key={i} className="flex items-center gap-2 flex-wrap rounded border border-zinc-800 p-2 bg-zinc-900/30">
              <select className={sel} value={u.kind} onChange={(e) => { const kind = e.target.value as Unlock['kind']; const id = collectionFor(kind)[0]?.id ?? ''; setRow(i, { kind, id }); }}>
                <option value="element">element</option>
                <option value="form">form</option>
                <option value="rune">rune</option>
              </select>
              <select className={sel} value={u.id} onChange={(e) => setRow(i, { id: e.target.value })}>
                {collectionFor(u.kind).map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
              <span className="text-zinc-600 text-xs">when</span>
              <select className={sel} value={t.type} onChange={(e) => setRow(i, { trigger: triggerDefault(e.target.value as UnlockTrigger['type']) })}>
                {TRIGGER_TYPES.map((tt) => (<option key={tt} value={tt}>{tt}</option>))}
              </select>
              {t.type === 'level' && (
                <input className={`${sel} w-16`} type="number" value={t.lv} onChange={(e) => setRow(i, { trigger: { type: 'level', lv: Number(e.target.value) } })} />
              )}
              {t.type === 'shrine' && (
                <>
                  <input className={`${sel} w-24`} placeholder="shrine" value={t.shrine} onChange={(e) => setRow(i, { trigger: { ...t, shrine: e.target.value } })} />
                  <input className={`${sel} w-24`} placeholder="region" value={t.region} onChange={(e) => setRow(i, { trigger: { ...t, region: e.target.value } })} />
                </>
              )}
              {t.type === 'flag' && (
                <>
                  <input className={`${sel} w-28`} placeholder="flag" value={t.flag} onChange={(e) => setRow(i, { trigger: { ...t, flag: e.target.value } })} />
                  <input className={`${sel} w-40`} placeholder="hint" value={t.hint} onChange={(e) => setRow(i, { trigger: { ...t, hint: e.target.value } })} />
                </>
              )}
              <button className="ml-auto text-zinc-500 hover:text-rose-400 text-xs" onClick={() => write(unlocks.filter((_, j) => j !== i))}>✕</button>
            </div>
          );
        })}
        {unlocks.length === 0 && <p className="text-sm text-zinc-500">No unlock rules. Add one to schedule when an element/form/rune becomes available.</p>}
      </div>
    </div>
  );
}
