import { useWorld } from '../../store/worldStore.ts';
import type { BossSpecial, EnemyMove, Formation, MoveRider } from '../../model/index.ts';
import { SPECIAL_DEFAULTS } from './bossDefaults.ts';

/**
 * Bespoke sub-editors for the array/union fields the generic form can't express:
 * enemy/boss moves (+ riders), the 5-arm BossSpecial, and zone formations.
 */

const num = 'w-20 rounded bg-zinc-800 px-2 py-1 text-sm outline-none focus:ring-1 ring-violet-500';
const txt = 'rounded bg-zinc-800 px-2 py-1 text-sm outline-none focus:ring-1 ring-violet-500';
const sectionTitle = 'text-sm font-semibold text-zinc-300 mb-2';
const addBtn = 'text-xs rounded bg-zinc-700 hover:bg-zinc-600 px-2 py-1';
const delBtn = 'text-xs text-zinc-500 hover:text-rose-400 px-1';

/** A reusable id-chip multi-select bound to a World collection. */
export function IdChips({
  ids,
  selected,
  onChange,
  labelOf,
}: {
  ids: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  labelOf?: (id: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((it) => {
        const on = selected.includes(it.id);
        return (
          <button
            key={it.id}
            type="button"
            className={`px-2 py-0.5 rounded text-xs border ${
              on ? 'bg-violet-600/30 border-violet-500 text-violet-200' : 'border-zinc-700 text-zinc-400'
            }`}
            onClick={() => onChange(on ? selected.filter((x) => x !== it.id) : [...selected, it.id])}
          >
            {labelOf ? labelOf(it.id) : it.label}
          </button>
        );
      })}
      {ids.length === 0 && <span className="text-xs text-zinc-600">none defined yet</span>}
    </div>
  );
}

const RIDER_KINDS = ['none', 'playerStatus', 'mpDrain', 'selfShield'] as const;

function riderOf(move: EnemyMove): MoveRider | undefined {
  return move.rider;
}

/** Edit an array of enemy moves, including the optional rider on each. */
export function MovesEditor({
  moves,
  onChange,
}: {
  moves: readonly EnemyMove[];
  onChange: (next: EnemyMove[]) => void;
}) {
  const playerStatuses = useWorld((s) => s.world?.playerStatuses ?? []);
  const set = (i: number, patch: Partial<EnemyMove>): void =>
    onChange(moves.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const setRider = (i: number, rider: MoveRider | undefined): void => {
    const m = { ...moves[i] } as EnemyMove;
    if (rider) m.rider = rider;
    else delete m.rider;
    onChange(moves.map((x, j) => (j === i ? m : x)));
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className={sectionTitle}>Moves ({moves.length})</div>
        <button className={addBtn} onClick={() => onChange([...moves, { name: 'attack', mult: 1 }])}>
          + move
        </button>
      </div>
      <div className="space-y-2">
        {moves.map((m, i) => {
          const rider = riderOf(m);
          const kind = rider?.type ?? 'none';
          return (
            <div key={i} className="rounded border border-zinc-800 p-2 bg-zinc-900/30">
              <div className="flex items-center gap-2 flex-wrap">
                <input className={`${txt} w-40`} value={m.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="name" />
                <label className="text-[11px] text-zinc-400 flex items-center gap-1">
                  mult
                  <input className={num} type="number" step="0.05" value={m.mult} onChange={(e) => set(i, { mult: Number(e.target.value) })} />
                </label>
                <label className="text-[11px] text-zinc-400 flex items-center gap-1">
                  weight
                  <input
                    className={num}
                    type="number"
                    step="1"
                    value={m.weight ?? ''}
                    onChange={(e) => set(i, { weight: e.target.value === '' ? undefined : Number(e.target.value) })}
                  />
                </label>
                <select
                  className={txt}
                  value={kind}
                  onChange={(e) => {
                    const k = e.target.value as (typeof RIDER_KINDS)[number];
                    if (k === 'none') setRider(i, undefined);
                    else if (k === 'playerStatus') setRider(i, { type: 'playerStatus', status: playerStatuses[0]?.id ?? 'status', chance: 0.3 });
                    else if (k === 'mpDrain') setRider(i, { type: 'mpDrain', amount: 5 });
                    else setRider(i, { type: 'selfShield', amount: 10 });
                  }}
                >
                  {RIDER_KINDS.map((k) => (
                    <option key={k} value={k}>rider: {k}</option>
                  ))}
                </select>
                <button className={delBtn} onClick={() => onChange(moves.filter((_, j) => j !== i))}>✕</button>
              </div>
              {rider?.type === 'playerStatus' && (
                <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-400">
                  status
                  <select className={txt} value={rider.status} onChange={(e) => setRider(i, { ...rider, status: e.target.value })}>
                    {playerStatuses.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                  chance
                  <input className={num} type="number" step="0.05" value={rider.chance} onChange={(e) => setRider(i, { ...rider, chance: Number(e.target.value) })} />
                </div>
              )}
              {rider?.type === 'mpDrain' && (
                <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-400">
                  mp drain
                  <input className={num} type="number" value={rider.amount} onChange={(e) => setRider(i, { type: 'mpDrain', amount: Number(e.target.value) })} />
                </div>
              )}
              {rider?.type === 'selfShield' && (
                <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-400">
                  self shield
                  <input className={num} type="number" value={rider.amount} onChange={(e) => setRider(i, { type: 'selfShield', amount: Number(e.target.value) })} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type SF = { key: string; label: string; t: 'num' | 'text' | 'enemy' };
const SPECIAL_FIELDS: Record<BossSpecial['kind'], SF[]> = {
  bars: [
    { key: 'barHp', label: 'bar HP', t: 'num' },
    { key: 'offKeyMult', label: 'off-key ×', t: 'num' },
    { key: 'summonSpecies', label: 'summon', t: 'enemy' },
    { key: 'summonLv', label: 'summon lv', t: 'num' },
    { key: 'unwriteEvery', label: 'unwrite every', t: 'num' },
    { key: 'unwriteMult', label: 'unwrite ×', t: 'num' },
    { key: 'unwriteName', label: 'unwrite name', t: 'text' },
  ],
  submerge: [
    { key: 'every', label: 'every', t: 'num' },
    { key: 'voltMult', label: 'volt ×', t: 'num' },
    { key: 'breachName', label: 'breach name', t: 'text' },
    { key: 'breachMult', label: 'breach ×', t: 'num' },
  ],
  summonAndVeil: [
    { key: 'summonAtHpFrac', label: 'summon @ hp', t: 'num' },
    { key: 'summonSpecies', label: 'summon', t: 'enemy' },
    { key: 'summonCount', label: 'count', t: 'num' },
    { key: 'summonLv', label: 'summon lv', t: 'num' },
    { key: 'veilName', label: 'veil name', t: 'text' },
    { key: 'veilEvery', label: 'veil every', t: 'num' },
    { key: 'veilShield', label: 'veil shield', t: 'num' },
  ],
  enrage: [
    { key: 'belowHpFrac', label: 'below hp', t: 'num' },
    { key: 'dmgMult', label: 'dmg ×', t: 'num' },
    { key: 'weightedMove', label: 'weighted move', t: 'text' },
    { key: 'enragedWeightMult', label: 'weight ×', t: 'num' },
  ],
  attune: [
    { key: 'attunedMult', label: 'attuned ×', t: 'num' },
    { key: 'otherMult', label: 'other ×', t: 'num' },
    { key: 'shiftEveryPhase1', label: 'shift p1', t: 'num' },
    { key: 'shiftEveryPhase2', label: 'shift p2', t: 'num' },
    { key: 'phase2AtHpFrac', label: 'phase2 @ hp', t: 'num' },
    { key: 'phase3AtHpFrac', label: 'phase3 @ hp', t: 'num' },
    { key: 'summonSpecies', label: 'summon', t: 'enemy' },
    { key: 'summonCount', label: 'count', t: 'num' },
    { key: 'summonLv', label: 'summon lv', t: 'num' },
    { key: 'doomName', label: 'doom name', t: 'text' },
    { key: 'doomMult', label: 'doom ×', t: 'num' },
  ],
};

/** Edit a boss's BossSpecial: pick the mechanic archetype, edit its parameters. */
export function BossSpecialEditor({
  special,
  onChange,
}: {
  special: BossSpecial;
  onChange: (next: BossSpecial) => void;
}) {
  const enemies = useWorld((s) => s.world?.enemies ?? []);
  const rec = special as unknown as Record<string, unknown>;
  const set = (key: string, value: unknown): void =>
    onChange({ ...special, [key]: value } as BossSpecial);

  return (
    <div>
      <div className={sectionTitle}>Boss mechanic</div>
      <select
        className={`${txt} mb-3`}
        value={special.kind}
        onChange={(e) => onChange(SPECIAL_DEFAULTS[e.target.value as BossSpecial['kind']])}
      >
        {(Object.keys(SPECIAL_DEFAULTS) as BossSpecial['kind'][]).map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>
      <div className="grid grid-cols-3 gap-2 max-w-2xl">
        {SPECIAL_FIELDS[special.kind].map((f) => (
          <label key={f.key} className="text-[11px] text-zinc-400 flex flex-col gap-0.5">
            {f.label}
            {f.t === 'enemy' ? (
              <select className={txt} value={String(rec[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">— pick —</option>
                {enemies.map((en) => (
                  <option key={en.id} value={en.id}>{en.name}</option>
                ))}
              </select>
            ) : f.t === 'text' ? (
              <input className={txt} value={String(rec[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} />
            ) : (
              <input className={num} type="number" step="0.05" value={Number(rec[f.key] ?? 0)} onChange={(e) => set(f.key, Number(e.target.value))} />
            )}
          </label>
        ))}
      </div>
      {special.kind === 'bars' && (
        <label className="text-[11px] text-zinc-400 flex items-center gap-2 mt-2">
          bar keys (comma-separated)
          <input
            className={`${txt} w-72`}
            value={special.barKeys.join(',')}
            onChange={(e) => set('barKeys', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        </label>
      )}
    </div>
  );
}

/** Edit a zone's formations: each a set of enemy members + a pick weight. */
export function FormationsEditor({
  formations,
  onChange,
}: {
  formations: readonly Formation[];
  onChange: (next: Formation[]) => void;
}) {
  const enemies = useWorld((s) => s.world?.enemies ?? []);
  const ids = enemies.map((e) => ({ id: e.id, label: e.name }));
  const set = (i: number, patch: Partial<Formation>): void =>
    onChange(formations.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className={sectionTitle}>Formations ({formations.length})</div>
        <button className={addBtn} onClick={() => onChange([...formations, { members: [], weight: 1 }])}>
          + formation
        </button>
      </div>
      <div className="space-y-2">
        {formations.map((f, i) => (
          <div key={i} className="rounded border border-zinc-800 p-2 bg-zinc-900/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] text-zinc-400">weight</span>
              <input className={num} type="number" value={f.weight} onChange={(e) => set(i, { weight: Number(e.target.value) })} />
              <button className={`${delBtn} ml-auto`} onClick={() => onChange(formations.filter((_, j) => j !== i))}>✕ remove</button>
            </div>
            <IdChips ids={ids} selected={[...f.members]} onChange={(members) => set(i, { members })} />
          </div>
        ))}
        {formations.length === 0 && <p className="text-xs text-zinc-500">No formations. Add one and pick its enemies.</p>}
      </div>
    </div>
  );
}
