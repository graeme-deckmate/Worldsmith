import type { BattleState, Spell } from '../runtime/battle.ts';

interface Opt { id: string; label: string }

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-2 rounded bg-zinc-800 overflow-hidden w-40">
      <div className="h-full" style={{ width: `${String(pct)}%`, background: color }} />
    </div>
  );
}

/** Turn-based battle UI driven by the runtime BattleState. */
export function BattleView({
  state,
  elements,
  forms,
  runes,
  spell,
  setSpell,
  onCast,
  onDefend,
  onDone,
}: {
  state: BattleState;
  elements: Opt[];
  forms: Opt[];
  runes: Opt[];
  spell: Spell;
  setSpell: (s: Spell) => void;
  onCast: () => void;
  onDefend: () => void;
  onDone: () => void;
}) {
  const sel = 'rounded bg-zinc-800 px-2 py-1.5 text-sm outline-none focus:ring-1 ring-violet-500';
  const enemyStatuses = Object.keys(state.enemy.statuses);
  const playerStatuses = Object.keys(state.player.statuses);

  return (
    <div className="absolute inset-0 bg-zinc-950/95 grid place-items-center z-20">
      <div className="w-[640px] max-w-[92vw] rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        {/* enemy */}
        <div className="flex items-center justify-between mb-1">
          <div className="font-semibold text-rose-300">
            {state.enemy.name} <span className="text-zinc-500 text-xs">Lv {state.enemy.lv}{state.enemy.isBoss ? ' · BOSS' : ''}</span>
          </div>
          <Bar value={state.enemy.hp} max={state.enemy.maxhp} color="#ff5d5d" />
        </div>
        {enemyStatuses.length > 0 && <div className="text-[11px] text-amber-400 mb-3">{enemyStatuses.join(', ')}</div>}

        {/* player */}
        <div className="flex items-center justify-between mt-3">
          <div className="font-semibold text-violet-200">You <span className="text-zinc-500 text-xs">Lv {state.player.level}</span></div>
          <div className="flex flex-col items-end gap-1">
            <Bar value={state.player.hp} max={state.player.maxhp} color="#5fd6a0" />
            <Bar value={state.player.mp} max={state.player.maxmp} color="#5ad1ff" />
          </div>
        </div>
        {playerStatuses.length > 0 && <div className="text-[11px] text-amber-400 mt-1">{playerStatuses.join(', ')}</div>}

        {/* log */}
        <div className="mt-4 h-28 overflow-y-auto rounded bg-zinc-950 border border-zinc-800 p-2 text-xs text-zinc-300 space-y-0.5">
          {state.log.slice(-8).map((l, i) => <div key={i}>{l}</div>)}
        </div>

        {/* actions */}
        {state.over ? (
          <div className="mt-4 flex items-center justify-between">
            <div className={state.over === 'win' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {state.over === 'win' ? 'Victory!' : 'Defeated.'}
            </div>
            <button className="rounded bg-violet-600 hover:bg-violet-500 px-4 py-1.5 text-sm font-medium" onClick={onDone}>continue</button>
          </div>
        ) : (
          <div className="mt-4 flex items-end gap-2 flex-wrap">
            <label className="text-[11px] text-zinc-400 flex flex-col gap-0.5">element
              <select className={sel} value={spell.element} onChange={(e) => setSpell({ ...spell, element: e.target.value })}>
                {elements.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
            <label className="text-[11px] text-zinc-400 flex flex-col gap-0.5">form
              <select className={sel} value={spell.form} onChange={(e) => setSpell({ ...spell, form: e.target.value })}>
                {forms.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
            <label className="text-[11px] text-zinc-400 flex flex-col gap-0.5">rune
              <select className={sel} value={spell.rune} onChange={(e) => setSpell({ ...spell, rune: e.target.value })}>
                {runes.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
            <button className="rounded bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium" onClick={onCast}>Cast</button>
            <button className="rounded bg-zinc-700 hover:bg-zinc-600 px-3 py-2 text-sm" onClick={onDefend}>Focus</button>
          </div>
        )}
      </div>
    </div>
  );
}
