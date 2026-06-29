import { useRef, useState } from 'react';
import { useWorld } from '../store/worldStore.ts';
import type { World } from '../model/index.ts';
import { shareUrl } from '../store/share.ts';

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
export function TopBar({ onClose, onPlaytest }: { onClose: () => void; onPlaytest: () => void }) {
  const { world, issues, exportJson, importJson, duplicate, undo, redo, past, future } = useWorld();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');
  if (!world) return null;

  const flash = (m: string): void => { setNote(m); window.setTimeout(() => setNote(''), 1800); };
  const onShare = (): void => {
    const url = shareUrl(world);
    if (!url) { flash('Too large for a link — use export'); return; }
    void navigator.clipboard.writeText(url).then(() => flash('Share link copied')).catch(() => flash('Copy failed'));
  };

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
        {note && <span className="text-xs text-emerald-300">{note}</span>}
        <button
          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
          onClick={() => void duplicate(`${world.meta.id}_copy`, `${world.meta.name} copy`)}
          title="Duplicate this world"
        >
          duplicate
        </button>
        <button className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700" onClick={onShare} title="Copy a share link">
          share
        </button>
        <button
          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
          onClick={() => fileRef.current?.click()}
        >
          import
        </button>
        <button
          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 font-medium"
          onClick={onPlaytest}
          disabled={errors > 0}
          title={errors > 0 ? 'Fix errors before playtesting' : 'Playtest this world'}
        >
          ▶ playtest
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
