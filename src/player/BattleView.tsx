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
  onTarget,
  aspect,
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
  onTarget: (i: number) => void;
  aspect: string | null;
}) {
  const sel = 'rounded bg-zinc-800 px-2 py-1.5 text-sm outline-none focus:ring-1 ring-violet-500';
  const playerStatuses = Object.keys(state.player.statuses);

  return (
    <div className="absolute inset-0 bg-zinc-950/95 grid place-items-center z-20">
      <div className="w-[640px] max-w-[92vw] rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        {/* enemies */}
        <div className="space-y-1.5 mb-3">
          {state.enemies.map((e, i) => {
            const dead = e.hp <= 0;
            const focused = i === state.target && !dead;
            const statuses = Object.keys(e.statuses);
            return (
              <button
                key={i}
                disabled={dead}
                onClick={() => onTarget(i)}
                className={`w-full flex items-center justify-between gap-3 px-2 py-1 rounded ${
                  focused ? 'bg-rose-900/30 ring-1 ring-rose-500/60' : 'hover:bg-zinc-800'
                } ${dead ? 'opacity-40' : ''}`}
              >
                <div className="text-left">
                  <span className={`font-semibold ${dead ? 'line-through text-zinc-500' : 'text-rose-300'}`}>{e.name}</span>
                  <span className="text-zinc-500 text-xs ml-2">Lv {e.lv}{e.isBoss ? ' · BOSS' : ''}</span>
                  {statuses.length > 0 && <span className="text-[11px] text-amber-400 ml-2">{statuses.join(', ')}</span>}
                  {e.shield > 0 && <span className="text-[11px] text-sky-300 ml-2">⛨ {e.shield}</span>}
                </div>
                <Bar value={e.hp} max={e.maxhp} color="#ff5d5d" />
              </button>
            );
          })}
        </div>

        {/* player */}
        <div className="flex items-center justify-between mt-3">
          <div className="font-semibold text-violet-200">
            You <span className="text-zinc-500 text-xs">Lv {state.player.level}</span>
            {aspect && <span className="text-[11px] text-amber-300 ml-2">✶ {aspect} aspect</span>}
          </div>
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
            <label className="text-[11px] text-zinc-400 flex flex-col gap-0.5">+ twin
              <select className={sel} value={spell.element2 ?? ''} onChange={(e) => setSpell({ ...spell, element2: e.target.value || undefined })}>
                <option value="">— none —</option>
                {elements.filter((o) => o.id !== spell.element).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
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
