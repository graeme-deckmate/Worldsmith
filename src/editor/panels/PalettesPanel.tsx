import { useState } from 'react';
import { useWorld } from '../../store/worldStore.ts';
import type { NamedPalette } from '../../model/index.ts';
import { nextPaletteChar } from '../../render/pixels.ts';
import { idAvailable, removeById, upsert } from '../collections.ts';
import { PaletteManager } from '../pixel/PaletteManager.tsx';

function newId(existing: readonly { id: string }[]): string {
  for (let i = 1; ; i++) {
    const id = `palette_${String(i)}`;
    if (idAvailable(existing, id)) return id;
  }
}

/** Named palettes (player/villager cosmetic recolours): a label + colour set. */
export function PalettesPanel() {
  const { world, update } = useWorld();
  const [selId, setSelId] = useState<string | null>(world?.palettes[0]?.id ?? null);
  if (!world) return null;

  const palettes = world.palettes;
  const selected = palettes.find((p) => p.id === selId) ?? null;

  const create = (): void => {
    const id = newId(palettes);
    const np: NamedPalette = { id, label: id, pal: { a: '#ffffff' } };
    update((w) => ({ ...w, palettes: [...w.palettes, np] }));
    setSelId(id);
  };
  const commit = (next: NamedPalette): void =>
    update((w) => ({ ...w, palettes: upsert(w.palettes, next) }));

  return (
    <div className="flex gap-6 h-full">
      <div className="w-52 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Palettes</h2>
          <button className="text-xs rounded bg-violet-600 hover:bg-violet-500 px-2 py-1" onClick={create}>
            + new
          </button>
        </div>
        <ul className="space-y-1">
          {palettes.map((p) => (
            <li key={p.id}>
              <button
                className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
                  selId === p.id ? 'bg-violet-600/20 text-violet-200' : 'hover:bg-zinc-800'
                }`}
                onClick={() => setSelId(p.id)}
              >
                <span className="flex -space-x-1">
                  {Object.values(p.pal).slice(0, 5).map((c, i) => (
                    <span key={i} className="w-3 h-3 rounded-full border border-zinc-900" style={{ background: c }} />
                  ))}
                </span>
                {p.label}
              </button>
            </li>
          ))}
        </ul>
        {palettes.length === 0 && <p className="text-sm text-zinc-500">No named palettes yet.</p>}
      </div>

      <div className="flex-1 min-w-0">
        {selected ? (
          <div className="max-w-md space-y-4">
            <label className="text-xs text-zinc-400 block">
              Label
              <input
                className="block mt-1 w-full rounded bg-zinc-800 px-2 py-1.5 text-sm outline-none focus:ring-1 ring-violet-500"
                value={selected.label}
                onChange={(e) => commit({ ...selected, label: e.target.value })}
              />
            </label>
            <PaletteManager
              pal={selected.pal}
              paintChar=""
              onSelect={() => undefined}
              onSetColor={(ch, color) => commit({ ...selected, pal: { ...selected.pal, [ch]: color } })}
              onAddColor={() => {
                const ch = nextPaletteChar(selected.pal);
                if (ch) commit({ ...selected, pal: { ...selected.pal, [ch]: '#ffffff' } });
              }}
              onRemoveChar={(ch) => {
                const pal = { ...selected.pal };
                delete pal[ch];
                commit({ ...selected, pal });
              }}
            />
            <button
              className="text-xs rounded bg-zinc-800 hover:bg-rose-900/50 text-zinc-400 hover:text-rose-300 px-2 py-1"
              onClick={() => {
                update((w) => ({ ...w, palettes: removeById(w.palettes, selected.id) }));
                setSelId(null);
              }}
            >
              delete palette
            </button>
          </div>
        ) : (
          <div className="text-sm text-zinc-500 grid place-items-center h-full">
            Select or create a palette.
          </div>
        )}
      </div>
    </div>
  );
}
