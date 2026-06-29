import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../store/worldStore.ts';
import { SAMPLES } from '../model/samples.ts';

/** Landing screen: create, open, import, or load a sample world. */
export function HomeScreen() {
  const { summaries, refreshList, newWorld, loadSampleWorld, open, remove, importJson } = useWorld();
  const [id, setId] = useState('my_world');
  const [name, setName] = useState('My World');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const onImport = (file: File): void => {
    void file.text().then((text) => {
      const res = importJson(text);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="min-h-full grid place-items-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">
          Worldsmith <span className="text-violet-400">⚒</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          A world editor for Sigilbound-style games. Author elements, enemies, maps, sprites and
          unlock rules, then export a <code className="text-zinc-300">.world.json</code>.
        </p>

        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="font-semibold mb-3">New world</h2>
          <div className="flex gap-2 items-end flex-wrap">
            <label className="text-xs text-zinc-400">
              id
              <input
                className="block mt-1 w-40 rounded bg-zinc-800 px-2 py-1.5 text-sm outline-none focus:ring-1 ring-violet-500"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </label>
            <label className="text-xs text-zinc-400">
              name
              <input
                className="block mt-1 w-56 rounded bg-zinc-800 px-2 py-1.5 text-sm outline-none focus:ring-1 ring-violet-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button
              className="rounded bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-sm font-medium"
              onClick={() => void newWorld(id.trim(), name.trim())}
            >
              Create
            </button>
            <button
              className="rounded bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 text-sm"
              onClick={() => fileRef.current?.click()}
            >
              Import .world.json
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = '';
              }}
            />
          </div>
          {error && <p className="text-rose-400 text-xs mt-2">Import failed: {error}</p>}
        </div>

        <div className="mt-6">
          <h2 className="font-semibold mb-2">Start from a sample</h2>
          <div className="grid grid-cols-2 gap-3">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                className="text-left rounded-lg border border-zinc-800 bg-zinc-900/40 hover:border-violet-500 p-3"
                onClick={() => void loadSampleWorld(s.world)}
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{s.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-semibold mb-2">Your worlds</h2>
          {summaries.length === 0 ? (
            <p className="text-sm text-zinc-500">None yet. Create one or load the sample.</p>
          ) : (
            <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 overflow-hidden">
              {summaries.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/40">
                  <button className="text-left flex-1" onClick={() => void open(s.id)}>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-zinc-500 text-xs ml-2">{s.id}</span>
                  </button>
                  <button
                    className="text-zinc-500 hover:text-rose-400 text-xs"
                    onClick={() => void remove(s.id)}
                  >
                    delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
