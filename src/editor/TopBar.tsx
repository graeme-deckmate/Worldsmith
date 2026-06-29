import { useRef } from 'react';
import { useWorld } from '../store/worldStore.ts';
import type { World } from '../model/index.ts';

function download(world: World, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${world.meta.id}.world.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Editor top bar: world name, undo/redo, import/export, validation summary. */
export function TopBar({ onClose }: { onClose: () => void }) {
  const { world, issues, exportJson, importJson, undo, redo, past, future } = useWorld();
  const fileRef = useRef<HTMLInputElement>(null);
  if (!world) return null;

  const errors = issues.filter((i) => i.level === 'error').length;
  const warns = issues.filter((i) => i.level === 'warn').length;

  return (
    <header className="flex items-center gap-3 px-4 h-12 border-b border-zinc-800 bg-zinc-950">
      <button className="text-zinc-400 hover:text-zinc-100 text-sm" onClick={onClose}>
        ← worlds
      </button>
      <div className="font-semibold">{world.meta.name}</div>
      <span className="text-zinc-600 text-xs">{world.meta.id}</span>

      <div className="ml-auto flex items-center gap-2 text-sm">
        <span
          className={`text-xs px-2 py-1 rounded ${
            errors > 0 ? 'bg-rose-900/50 text-rose-300' : 'bg-emerald-900/40 text-emerald-300'
          }`}
          title="validation"
        >
          {errors} errors · {warns} warnings
        </span>
        <button
          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40"
          disabled={past.length === 0}
          onClick={undo}
        >
          ↩ undo
        </button>
        <button
          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40"
          disabled={future.length === 0}
          onClick={redo}
        >
          redo ↪
        </button>
        <button
          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
          onClick={() => fileRef.current?.click()}
        >
          import
        </button>
        <button
          className="px-3 py-1 rounded bg-violet-600 hover:bg-violet-500 font-medium"
          onClick={() => download(world, exportJson())}
        >
          export
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void f.text().then((t) => importJson(t));
            e.target.value = '';
          }}
        />
      </div>
    </header>
  );
}
