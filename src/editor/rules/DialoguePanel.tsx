import { useState } from 'react';
import { useWorld } from '../../store/worldStore.ts';
import type { Dialogue } from '../../model/index.ts';
import { idAvailable, removeById, upsert } from '../collections.ts';

/** Dialogue editor: speaker + an ordered list of pages, referenced by map NPCs/signs. */
export function DialoguePanel() {
  const { world, update } = useWorld();
  const [selId, setSelId] = useState<string | null>(world?.dialogue[0]?.id ?? null);
  const [newId, setNewId] = useState('');
  if (!world) return null;

  const list = world.dialogue;
  const selected = list.find((d) => d.id === selId) ?? null;
  const write = (next: Dialogue): void => update((w) => ({ ...w, dialogue: upsert(w.dialogue, next) }));

  const create = (): void => {
    let id = newId.trim() || 'line';
    for (let i = 1; !idAvailable(list, id); i++) id = `line_${String(i)}`;
    update((w) => ({ ...w, dialogue: [...w.dialogue, { id, speaker: 'SIGN', pages: ['…'] }] }));
    setSelId(id);
    setNewId('');
  };

  const field = 'rounded bg-zinc-800 px-2 py-1.5 text-sm outline-none focus:ring-1 ring-violet-500';

  return (
    <div className="flex gap-6 h-full">
      <div className="w-56 shrink-0 flex flex-col">
        <h2 className="text-lg font-semibold mb-2">Dialogue</h2>
        <ul className="space-y-0.5 overflow-y-auto flex-1">
          {list.map((d) => (
            <li key={d.id}>
              <button className={`w-full text-left px-2 py-1 rounded text-sm ${selId === d.id ? 'bg-violet-600/20 text-violet-200' : 'hover:bg-zinc-800'}`} onClick={() => setSelId(d.id)}>
                <span className="font-medium">{d.id}</span>
                <span className="text-zinc-600 text-xs ml-2">{d.speaker}</span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="text-sm text-zinc-500 px-2">None yet.</li>}
        </ul>
        <div className="mt-2 flex gap-1">
          <input className={`${field} flex-1 min-w-0`} placeholder="line id" value={newId} onChange={(e) => setNewId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          <button className="rounded bg-violet-600 hover:bg-violet-500 px-2 py-1 text-sm" onClick={create}>+ new</button>
        </div>
      </div>

      <div className="flex-1 min-w-0 max-w-2xl">
        {selected ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-zinc-400">id</span>
              <input className={`${field} w-40`} value={selected.id} onChange={(e) => { const id = e.target.value; if (idAvailable(list, id)) { update((w) => ({ ...w, dialogue: upsert(removeById(w.dialogue, selected.id), { ...selected, id }) })); setSelId(id); } }} />
              <span className="text-sm text-zinc-400 ml-2">speaker</span>
              <input className={`${field} w-40`} value={selected.speaker} onChange={(e) => write({ ...selected, speaker: e.target.value })} />
              <button className="ml-auto text-xs text-zinc-500 hover:text-rose-400" onClick={() => { update((w) => ({ ...w, dialogue: removeById(w.dialogue, selected.id) })); setSelId(null); }}>delete</button>
            </div>
            <div className="space-y-2">
              {selected.pages.map((p, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs text-zinc-600 mt-2 w-6">{i + 1}</span>
                  <textarea className={`${field} flex-1`} rows={2} value={p} onChange={(e) => write({ ...selected, pages: selected.pages.map((q, j) => (j === i ? e.target.value : q)) })} />
                  <button className="text-zinc-500 hover:text-rose-400 text-xs mt-2" onClick={() => write({ ...selected, pages: selected.pages.filter((_, j) => j !== i) || ['…'] })} disabled={selected.pages.length <= 1}>✕</button>
                </div>
              ))}
              <button className="text-xs rounded bg-zinc-700 hover:bg-zinc-600 px-2 py-1" onClick={() => write({ ...selected, pages: [...selected.pages, '…'] })}>+ page</button>
            </div>
          </>
        ) : (
          <div className="text-sm text-zinc-500 grid place-items-center h-full">Select or create a dialogue line.</div>
        )}
      </div>
    </div>
  );
}
