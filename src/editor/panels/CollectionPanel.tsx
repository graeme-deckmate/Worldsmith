import { useState } from 'react';
import { useWorld } from '../../store/worldStore.ts';
import type { Section } from '../nav.ts';

/**
 * Generic, read-only collection browser used until each content type gets its
 * dedicated editor (E1-E5). Lists the section's items and shows the selected
 * def as formatted JSON, so the whole world is inspectable from day one.
 */
export function CollectionPanel({ section }: { section: Section }) {
  const world = useWorld((s) => s.world);
  const [sel, setSel] = useState<string | null>(null);
  if (!world) return null;

  const items = section.items(world);
  const rawArr = (world as unknown as Record<string, unknown>)[section.key];
  const arr = Array.isArray(rawArr) ? rawArr : [];
  const selectedRaw =
    sel === null
      ? null
      : (arr.find((d) => typeof d === 'object' && d !== null && (d as { id?: string }).id === sel) ??
        arr[Number(sel)] ??
        null);

  return (
    <div className="flex gap-4 h-full">
      <div className="w-64 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">{section.label}</h2>
          <span className="text-xs text-zinc-500">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">Empty. A dedicated editor for this type arrives in a later phase.</p>
        ) : (
          <ul className="space-y-0.5">
            {items.map((it) => (
              <li key={it.id}>
                <button
                  className={`w-full text-left px-2 py-1 rounded text-sm ${
                    sel === it.id ? 'bg-violet-600/20 text-violet-200' : 'hover:bg-zinc-800'
                  }`}
                  onClick={() => setSel(it.id)}
                >
                  <span className="font-medium">{it.label}</span>
                  {it.label !== it.id && <span className="text-zinc-600 text-xs ml-2">{it.id}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {selectedRaw ? (
          <pre className="text-xs bg-zinc-950 border border-zinc-800 rounded p-3 overflow-auto max-h-full whitespace-pre-wrap">
            {JSON.stringify(selectedRaw, null, 2)}
          </pre>
        ) : (
          <div className="text-sm text-zinc-500 grid place-items-center h-full">
            Select an entry to inspect it. Full editing for <b className="mx-1">{section.label}</b> comes
            in a later phase.
          </div>
        )}
      </div>
    </div>
  );
}
