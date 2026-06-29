import { useWorld } from '../../store/worldStore.ts';
import { SECTIONS } from '../nav.ts';

/** World overview: editable meta + start, collection counts, and the issue list. */
export function OverviewPanel() {
  const { world, issues, update } = useWorld();
  if (!world) return null;

  const setMeta = (patch: Partial<typeof world.meta>): void =>
    update((w) => ({ ...w, meta: { ...w.meta, ...patch } }), { history: false });
  const setStart = (patch: Partial<typeof world.start>): void =>
    update((w) => ({ ...w, start: { ...w.start, ...patch } }), { history: false });

  const field = 'block w-full rounded bg-zinc-800 px-2 py-1.5 text-sm outline-none focus:ring-1 ring-violet-500';

  return (
    <div className="max-w-3xl space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-3">World details</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-zinc-400">
            Name
            <input className={field} value={world.meta.name} onChange={(e) => setMeta({ name: e.target.value })} />
          </label>
          <label className="text-xs text-zinc-400">
            Author
            <input className={field} value={world.meta.author} onChange={(e) => setMeta({ author: e.target.value })} />
          </label>
          <label className="text-xs text-zinc-400 col-span-2">
            Description
            <textarea
              className={field}
              rows={2}
              value={world.meta.description}
              onChange={(e) => setMeta({ description: e.target.value })}
            />
          </label>
          <label className="text-xs text-zinc-400">
            Start map id
            <input className={field} value={world.start.map} onChange={(e) => setStart({ map: e.target.value })} />
          </label>
          <label className="text-xs text-zinc-400">
            Start level
            <input
              type="number"
              className={field}
              value={world.start.level}
              onChange={(e) => setStart({ level: Number(e.target.value) || 1 })}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Contents</h2>
        <div className="grid grid-cols-3 gap-2">
          {SECTIONS.map((s) => (
            <div key={s.key} className="rounded border border-zinc-800 px-3 py-2 bg-zinc-900/40">
              <div className="text-sm">{s.label}</div>
              <div className="text-2xl font-bold text-violet-300">{s.items(world).length}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">
          Validation{' '}
          <span className="text-sm font-normal text-zinc-500">
            ({issues.filter((i) => i.level === 'error').length} errors,{' '}
            {issues.filter((i) => i.level === 'warn').length} warnings)
          </span>
        </h2>
        {issues.length === 0 ? (
          <p className="text-emerald-400 text-sm">No problems. This world is export-ready.</p>
        ) : (
          <ul className="space-y-1">
            {issues.map((i, idx) => (
              <li key={idx} className="text-sm flex gap-2">
                <span className={i.level === 'error' ? 'text-rose-400' : 'text-amber-400'}>
                  {i.level === 'error' ? '✗' : '⚠'}
                </span>
                <span className="text-zinc-500">{i.where}</span>
                <span className="text-zinc-300">{i.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
