import { useWorld } from '../../store/worldStore.ts';
import type { Reaction, Surge, TwinPair, Wheel } from '../../model/index.ts';

/**
 * Bespoke editor for the Wheel: order, reactions, surges, twin pairs (each with
 * its author-defined effect) and the mastery/aspect/wheel tuning knobs.
 */

const fld = 'rounded bg-zinc-800 px-2 py-1 text-xs outline-none focus:ring-1 ring-violet-500';
const card = 'rounded border border-zinc-800 bg-zinc-900/30 p-2 space-y-2';
const addBtn = 'text-xs rounded bg-zinc-700 hover:bg-zinc-600 px-2 py-1';
const del = 'text-zinc-500 hover:text-rose-400 text-xs';

type Obj = Record<string, unknown>;

/** A grid of optional fields written onto an effect object (cleared when blank). */
function EffFields({
  obj, fields, onChange, statuses, elements,
}: {
  obj: Obj;
  fields: { key: string; label: string; kind: 'num' | 'bool' | 'status' | 'element' }[];
  onChange: (next: Obj) => void;
  statuses: { id: string; label: string }[];
  elements: { id: string; label: string }[];
}) {
  const set = (key: string, val: unknown): void => {
    const next = { ...obj };
    if (val === undefined || val === '' || val === false) delete next[key];
    else next[key] = val;
    onChange(next);
  };
  return (
    <div className="grid grid-cols-3 gap-2">
      {fields.map((f) => (
        <label key={f.key} className="text-[10px] text-zinc-400 flex flex-col gap-0.5">
          {f.label}
          {f.kind === 'num' && (
            <input className={fld} type="number" step="any" value={obj[f.key] === undefined ? '' : String(obj[f.key])} onChange={(e) => set(f.key, e.target.value === '' ? undefined : Number(e.target.value))} />
          )}
          {f.kind === 'bool' && (
            <input type="checkbox" checked={Boolean(obj[f.key])} onChange={(e) => set(f.key, e.target.checked)} />
          )}
          {(f.kind === 'status' || f.kind === 'element') && (
            <select className={fld} value={String(obj[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value || undefined)}>
              <option value="">—</option>
              {(f.kind === 'status' ? statuses : elements).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          )}
        </label>
      ))}
    </div>
  );
}

export function WheelPanel() {
  const { world, update } = useWorld();
  if (!world) return null;
  const w = world.wheel;
  const statuses = world.enemyStatuses.map((s) => ({ id: s.id, label: s.label }));
  const elements = world.elements.map((e) => ({ id: e.id, label: e.label }));
  const setWheel = (patch: Partial<Wheel>): void => update((x) => ({ ...x, wheel: { ...x.wheel, ...patch } }));

  // --- reactions ---
  const setReaction = (i: number, r: Reaction): void => setWheel({ reactions: w.reactions.map((x, j) => (j === i ? r : x)) });
  const reactionEff = (r: Reaction): Obj => (r.effect ?? {}) as Obj;

  // --- surges ---
  const setSurge = (i: number, su: Surge): void => setWheel({ surges: w.surges.map((x, j) => (j === i ? su : x)) });

  // --- twins ---
  const setTwin = (i: number, tp: TwinPair): void => setWheel({ twinPairs: w.twinPairs.map((x, j) => (j === i ? tp : x)) });

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-lg font-semibold">Wheel</h2>

      {/* order */}
      <section>
        <h3 className="font-semibold text-sm mb-1">Element order</h3>
        <div className="flex flex-wrap gap-1.5 items-center">
          {w.order.map((id, i) => (
            <span key={i} className="px-2 py-0.5 rounded bg-zinc-800 text-xs flex items-center gap-1">
              {world.elements.find((e) => e.id === id)?.label ?? id}
              <button className={del} onClick={() => setWheel({ order: w.order.filter((_, j) => j !== i) })}>✕</button>
            </span>
          ))}
          <select className={fld} value="" onChange={(e) => { if (e.target.value) setWheel({ order: [...w.order, e.target.value] }); }}>
            <option value="">+ add</option>
            {elements.filter((e) => !w.order.includes(e.id)).map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
      </section>

      {/* reactions */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm">Reactions ({w.reactions.length})</h3>
          <button className={addBtn} onClick={() => setWheel({ reactions: [...w.reactions, { id: `reaction_${String(w.reactions.length + 1)}`, setup: statuses[0]?.id ?? 'status', trigger: elements[0]?.id ?? 'element', line: '' }] })}>+ reaction</button>
        </div>
        <div className="space-y-2">
          {w.reactions.map((r, i) => (
            <div key={i} className={card}>
              <div className="flex items-center gap-2 flex-wrap">
                <input className={`${fld} w-28`} value={r.id} onChange={(e) => setReaction(i, { ...r, id: e.target.value })} />
                <span className="text-[10px] text-zinc-500">setup</span>
                <select className={fld} value={r.setup} onChange={(e) => setReaction(i, { ...r, setup: e.target.value })}>{statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                <span className="text-[10px] text-zinc-500">trigger</span>
                <select className={fld} value={r.trigger} onChange={(e) => setReaction(i, { ...r, trigger: e.target.value })}>{elements.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                <input className={`${fld} flex-1 min-w-0`} placeholder="log line" value={r.line} onChange={(e) => setReaction(i, { ...r, line: e.target.value })} />
                <button className={del} onClick={() => setWheel({ reactions: w.reactions.filter((_, j) => j !== i) })}>✕</button>
              </div>
              <EffFields
                obj={reactionEff(r)}
                fields={[{ key: 'hitBonus', label: 'hit bonus ×', kind: 'num' }]}
                statuses={statuses} elements={elements}
                onChange={(eff) => setReaction(i, { ...r, effect: { ...r.effect, ...eff } })}
              />
              <div className="text-[10px] text-zinc-500">instantDot</div>
              <EffFields
                obj={(r.effect?.instantDot ?? {}) as Obj}
                fields={[{ key: 'status', label: 'status', kind: 'status' }, { key: 'mult', label: 'mult', kind: 'num' }, { key: 'perRemainingTurn', label: '× turns left', kind: 'bool' }]}
                statuses={statuses} elements={elements}
                onChange={(eff) => setReaction(i, { ...r, effect: { ...r.effect, instantDot: eff.status ? { status: String(eff.status), mult: typeof eff.mult === 'number' ? eff.mult : 1, ...(eff.perRemainingTurn ? { perRemainingTurn: true } : {}) } : undefined } })}
              />
              <div className="text-[10px] text-zinc-500">applyStatus</div>
              <EffFields
                obj={(r.effect?.applyStatus ?? {}) as Obj}
                fields={[{ key: 'status', label: 'status', kind: 'status' }, { key: 'turns', label: 'turns', kind: 'num' }]}
                statuses={statuses} elements={elements}
                onChange={(eff) => setReaction(i, { ...r, effect: { ...r.effect, applyStatus: eff.status ? { status: String(eff.status), turns: typeof eff.turns === 'number' ? eff.turns : 1 } : undefined } })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* surges */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm">Surges ({w.surges.length})</h3>
          <button className={addBtn} onClick={() => setWheel({ surges: [...w.surges, { roll: w.surges.length + 1, severity: 'mild', id: `surge_${String(w.surges.length + 1)}`, line: '' }] })}>+ surge</button>
        </div>
        <div className="space-y-2">
          {w.surges.map((su, i) => (
            <div key={i} className={card}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-zinc-500">roll</span>
                <input className={`${fld} w-14`} type="number" value={su.roll} onChange={(e) => setSurge(i, { ...su, roll: Number(e.target.value) })} />
                <select className={fld} value={su.severity} onChange={(e) => setSurge(i, { ...su, severity: e.target.value as Surge['severity'] })}><option value="mild">mild</option><option value="moderate">moderate</option><option value="severe">severe</option></select>
                <input className={`${fld} w-28`} value={su.id} onChange={(e) => setSurge(i, { ...su, id: e.target.value })} />
                <input className={`${fld} flex-1 min-w-0`} placeholder="log line" value={su.line} onChange={(e) => setSurge(i, { ...su, line: e.target.value })} />
                <button className={del} onClick={() => setWheel({ surges: w.surges.filter((_, j) => j !== i) })}>✕</button>
              </div>
              <EffFields
                obj={(su.effect ?? {}) as Obj}
                fields={[
                  { key: 'damage', label: 'damage', kind: 'num' }, { key: 'healHp', label: 'heal hp', kind: 'num' }, { key: 'restoreMp', label: 'restore mp', kind: 'num' },
                  { key: 'recastFrac', label: 'recast ×', kind: 'num' }, { key: 'selfHpFracFee', label: 'self hp fee', kind: 'num' }, { key: 'mpDrain', label: 'mp drain', kind: 'num' },
                  { key: 'forceElementStatus', label: 'force status', kind: 'bool' }, { key: 'selfElementStatus', label: 'self status', kind: 'bool' },
                ]}
                statuses={statuses} elements={elements}
                onChange={(eff) => setSurge(i, { ...su, effect: { ...su.effect, ...eff } })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* twins */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm">Twin pairs ({w.twinPairs.length})</h3>
          <button className={addBtn} onClick={() => setWheel({ twinPairs: [...w.twinPairs, { a: elements[0]?.id ?? 'a', b: elements[1]?.id ?? 'b', prefix: 'Twin', rider: 'rider' }] })}>+ twin</button>
        </div>
        <div className="space-y-2">
          {w.twinPairs.map((tp, i) => (
            <div key={i} className={card}>
              <div className="flex items-center gap-2 flex-wrap">
                <select className={fld} value={tp.a} onChange={(e) => setTwin(i, { ...tp, a: e.target.value })}>{elements.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                <span className="text-[10px] text-zinc-500">+</span>
                <select className={fld} value={tp.b} onChange={(e) => setTwin(i, { ...tp, b: e.target.value })}>{elements.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                <input className={`${fld} w-24`} placeholder="prefix" value={tp.prefix} onChange={(e) => setTwin(i, { ...tp, prefix: e.target.value })} />
                <input className={`${fld} w-24`} placeholder="rider" value={tp.rider} onChange={(e) => setTwin(i, { ...tp, rider: e.target.value })} />
                <button className={del} onClick={() => setWheel({ twinPairs: w.twinPairs.filter((_, j) => j !== i) })}>✕</button>
              </div>
              <EffFields
                obj={(tp.effect ?? {}) as Obj}
                fields={[
                  { key: 'matchupCap', label: 'matchup cap', kind: 'num' }, { key: 'arcFrac', label: 'arc ×', kind: 'num' }, { key: 'mpOnHit', label: 'mp on hit', kind: 'num' },
                  { key: 'enemyNextMoveMult', label: 'foe move ×', kind: 'num' }, { key: 'witherTakenMult', label: 'wither ×', kind: 'num' }, { key: 'reactionHitBonus', label: 'reaction ×', kind: 'num' },
                  { key: 'blockEnemyShieldTurns', label: 'block shield', kind: 'num' }, { key: 'ignoreShield', label: 'ignore shield', kind: 'bool' }, { key: 'extraDotTick', label: 'double DoT', kind: 'bool' },
                  { key: 'enemyActsLast', label: 'foe acts last', kind: 'bool' }, { key: 'spreadStatusOnKill', label: 'spread on kill', kind: 'status' },
                ]}
                statuses={statuses} elements={elements}
                onChange={(eff) => setTwin(i, { ...tp, effect: { ...tp.effect, ...eff } })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* tuning */}
      <section>
        <h3 className="font-semibold text-sm mb-1">Tuning (mastery / aspect / wheel)</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(w.tuning).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 w-40 truncate">{k}</span>
              <input className={`${fld} w-24`} type="number" step="any" value={v} onChange={(e) => setWheel({ tuning: { ...w.tuning, [k]: Number(e.target.value) } })} />
              <button className={del} onClick={() => { const t = { ...w.tuning }; delete t[k]; setWheel({ tuning: t }); }}>✕</button>
            </div>
          ))}
        </div>
        <AddTuning onAdd={(k) => setWheel({ tuning: { ...w.tuning, [k]: 1 } })} existing={w.tuning} />
      </section>
    </div>
  );
}

function AddTuning({ onAdd, existing }: { onAdd: (k: string) => void; existing: Record<string, number> }) {
  const keys = ['masteryCap', 'masteryT1', 'masteryT2', 'masteryT3', 'masteryT1Power', 'masteryT2Proc', 'masteryT3Cost', 'aspectPower', 'aspectProc', 'aspectDot', 'twinMpMult', 'twinMatchupCap', 'twinProcFrac', 'surgeChance', 'steamMult'];
  return (
    <select className={`${fld} mt-2`} value="" onChange={(e) => { if (e.target.value) onAdd(e.target.value); }}>
      <option value="">+ add tuning key</option>
      {keys.filter((k) => !(k in existing)).map((k) => <option key={k} value={k}>{k}</option>)}
    </select>
  );
}
