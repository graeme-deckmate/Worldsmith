import { useState } from 'react';
import { useWorld } from '../../store/worldStore.ts';
import type { Sprite } from '../../model/index.ts';
import { spriteDataUrl } from '../../render/pixels.ts';
import { idAvailable, removeById, upsert } from '../collections.ts';
import { SpriteEditor } from '../pixel/SpriteEditor.tsx';

function newSpriteId(existing: readonly { id: string }[]): string {
  for (let i = 1; ; i++) {
    const id = `sprite_${String(i)}`;
    if (idAvailable(existing, id)) return id;
  }
}

const BLANK: (id: string) => Sprite = (id) => ({
  id,
  grid: Array.from({ length: 8 }, () => '........'),
  pal: { a: '#a78bfa' },
});

/** Sprites panel: pick/create/rename/delete sprites, edit in the pixel editor. */
export function SpritesPanel() {
  const { world, update } = useWorld();
  const [selId, setSelId] = useState<string | null>(world?.sprites[0]?.id ?? null);
  const [renaming, setRenaming] = useState('');
  if (!world) return null;

  const sprites = world.sprites;
  const selected = sprites.find((s) => s.id === selId) ?? null;

  const create = (): void => {
    const id = newSpriteId(sprites);
    update((w) => ({ ...w, sprites: [...w.sprites, BLANK(id)] }));
    setSelId(id);
  };
  const commit = (next: Sprite): void =>
    update((w) => ({ ...w, sprites: upsert(w.sprites, next) }));
  const remove = (id: string): void => {
    update((w) => ({ ...w, sprites: removeById(w.sprites, id) }));
    if (selId === id) setSelId(null);
  };
  const rename = (): void => {
    if (!selected || !renaming || !idAvailable(sprites, renaming)) return;
    const moved: Sprite = { ...selected, id: renaming };
    update((w) => ({ ...w, sprites: upsert(removeById(w.sprites, selected.id), moved) }));
    setSelId(renaming);
    setRenaming('');
  };

  return (
    <div className="flex gap-6 h-full">
      <div className="w-52 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Sprites</h2>
          <button className="text-xs rounded bg-violet-600 hover:bg-violet-500 px-2 py-1" onClick={create}>
            + new
          </button>
        </div>
        <ul className="grid grid-cols-3 gap-2">
          {sprites.map((s) => (
            <li key={s.id}>
              <button
                className={`w-full aspect-square rounded border-2 grid place-items-center bg-zinc-900 ${
                  selId === s.id ? 'border-violet-400' : 'border-zinc-800 hover:border-zinc-600'
                }`}
                title={s.id}
                onClick={() => setSelId(s.id)}
              >
                <img src={spriteDataUrl(s.grid, s.pal, 4)} alt={s.id} className="pixelated max-w-full max-h-full" />
              </button>
              <div className="text-[10px] text-zinc-500 truncate text-center mt-0.5">{s.id}</div>
            </li>
          ))}
        </ul>
        {sprites.length === 0 && <p className="text-sm text-zinc-500">No sprites yet. Create one.</p>}
      </div>

      <div className="flex-1 min-w-0">
        {selected ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-zinc-400">id</span>
              <code className="text-sm bg-zinc-800 px-2 py-1 rounded">{selected.id}</code>
              <input
                className="w-40 rounded bg-zinc-800 px-2 py-1 text-sm outline-none focus:ring-1 ring-violet-500"
                placeholder="rename to…"
                value={renaming}
                onChange={(e) => setRenaming(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && rename()}
              />
              <button className="text-xs rounded bg-zinc-700 hover:bg-zinc-600 px-2 py-1" onClick={rename}>
                rename
              </button>
              <button
                className="text-xs rounded bg-zinc-800 hover:bg-rose-900/50 text-zinc-400 hover:text-rose-300 px-2 py-1 ml-auto"
                onClick={() => remove(selected.id)}
              >
                delete
              </button>
            </div>
            <SpriteEditor sprite={selected} onCommit={commit} />
          </>
        ) : (
          <div className="text-sm text-zinc-500 grid place-items-center h-full">
            Select or create a sprite to edit it.
          </div>
        )}
      </div>
    </div>
  );
}
