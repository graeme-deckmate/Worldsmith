import { useState, type ReactNode } from 'react';
import { useWorld } from '../../store/worldStore.ts';
import type { World } from '../../model/index.ts';
import { idAvailable, removeById, upsert } from '../collections.ts';
import { EntityForm, type Field } from './EntityForm.tsx';

type Def = { id: string } & Record<string, unknown>;

/** Declarative registration for a content collection's list+form editor. */
export interface EntityReg {
  key: keyof World;
  label: string;
  spec: readonly Field[];
  factory: (id: string, world: World) => Def;
  idPrefix: string;
  /** optional bespoke sub-editor rendered below the form (moves, boss special…). */
  extra?: (def: Def, patch: (p: Record<string, unknown>) => void) => ReactNode;
}

function mergePatch(def: Def, patch: Record<string, unknown>): Def {
  const next: Def = { ...def, ...patch };
  for (const [k, v] of Object.entries(patch)) if (v === undefined) delete next[k];
  return next;
}

function autoId(arr: readonly { id: string }[], prefix: string): string {
  for (let i = 1; ; i++) {
    const id = `${prefix}_${String(i)}`;
    if (idAvailable(arr, id)) return id;
  }
}

/** Generic list + form editor for any World collection, driven by an EntityReg. */
export function EntityListPanel({ reg }: { reg: EntityReg }) {
  const { world, update } = useWorld();
  const collection = (world?.[reg.key] ?? []) as Def[];
  const [selId, setSelId] = useState<string | null>(collection[0]?.id ?? null);
  const [newId, setNewId] = useState('');
  if (!world) return null;

  const selected = collection.find((d) => d.id === selId) ?? null;

  const writeCollection = (next: Def[]): void =>
    update((w) => ({ ...w, [reg.key]: next }) as World);

  const create = (): void => {
    const id = newId.trim() || autoId(collection, reg.idPrefix);
    if (!idAvailable(collection, id)) return;
    writeCollection([...collection, reg.factory(id, world)]);
    setSelId(id);
    setNewId('');
  };
  const patch = (p: Record<string, unknown>): void => {
    if (!selected) return;
    writeCollection(upsert(collection, mergePatch(selected, p)));
  };
  const remove = (id: string): void => {
    writeCollection(removeById(collection, id));
    if (selId === id) setSelId(null);
  };
  const renameId = (id: string): void => {
    if (!selected || !idAvailable(collection, id)) return;
    writeCollection(upsert(removeById(collection, selected.id), { ...selected, id }));
    setSelId(id);
  };

  return (
    <div className="flex gap-6 h-full">
      <div className="w-56 shrink-0 flex flex-col">
        <h2 className="text-lg font-semibold mb-2">{reg.label}</h2>
        <ul className="space-y-0.5 overflow-y-auto flex-1">
          {collection.map((d) => (
            <li key={d.id}>
              <button
                className={`w-full text-left px-2 py-1 rounded text-sm ${
                  selId === d.id ? 'bg-violet-600/20 text-violet-200' : 'hover:bg-zinc-800'
                }`}
                onClick={() => setSelId(d.id)}
              >
                <span className="font-medium">{String(d.label ?? d.name ?? d.id)}</span>
                <span className="text-zinc-600 text-xs ml-2">{d.id}</span>
              </button>
            </li>
          ))}
          {collection.length === 0 && <li className="text-sm text-zinc-500 px-2">None yet.</li>}
        </ul>
        <div className="mt-2 flex gap-1">
          <input
            className="flex-1 min-w-0 rounded bg-zinc-800 px-2 py-1 text-sm outline-none focus:ring-1 ring-violet-500"
            placeholder={`${reg.idPrefix}_id (optional)`}
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <button className="rounded bg-violet-600 hover:bg-violet-500 px-2 py-1 text-sm" onClick={create}>
            + new
          </button>
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto">
        {selected ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-zinc-400">id</span>
              <input
                className="w-44 rounded bg-zinc-800 px-2 py-1 text-sm outline-none focus:ring-1 ring-violet-500"
                value={selected.id}
                onChange={(e) => renameId(e.target.value)}
              />
              <button
                className="ml-auto text-xs rounded bg-zinc-800 hover:bg-rose-900/50 text-zinc-400 hover:text-rose-300 px-2 py-1"
                onClick={() => remove(selected.id)}
              >
                delete
              </button>
            </div>
            <EntityForm def={selected} spec={reg.spec} onPatch={patch} />
            {reg.extra && <div className="mt-5">{reg.extra(selected, patch)}</div>}
          </>
        ) : (
          <div className="text-sm text-zinc-500 grid place-items-center h-full">
            Select or create a {reg.label.toLowerCase().replace(/s$/, '')} to edit it.
          </div>
        )}
      </div>
    </div>
  );
}
