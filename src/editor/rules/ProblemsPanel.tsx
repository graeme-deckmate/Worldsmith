import { useWorld } from '../../store/worldStore.ts';
import { validateWorld, type Issue } from '../../model/index.ts';
import { validateMap } from '../map/mapValidate.ts';

/** Whole-world problem list: cross-reference integrity + per-map validation. */
export function ProblemsPanel({ onNavigate }: { onNavigate: (sectionKey: string) => void }) {
  const world = useWorld((s) => s.world);
  if (!world) return null;

  const issues: Issue[] = [
    ...validateWorld(world),
    ...world.maps.flatMap((m) => validateMap(m, world)),
  ];
  const errors = issues.filter((i) => i.level === 'error');
  const warns = issues.filter((i) => i.level === 'warn');

  const sectionOf = (where: string): string => where.split('.')[0] ?? 'overview';

  const row = (i: Issue, idx: number) => (
    <li key={idx} className="text-sm flex gap-2 items-start">
      <span className={i.level === 'error' ? 'text-rose-400' : 'text-amber-400'}>{i.level === 'error' ? '✗' : '⚠'}</span>
      <button className="text-zinc-500 hover:text-violet-300 shrink-0" onClick={() => onNavigate(sectionOf(i.where))} title="go to section">
        {i.where}
      </button>
      <span className="text-zinc-300">{i.message}</span>
    </li>
  );

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-semibold mb-1">Problems</h2>
      <p className="text-sm text-zinc-500 mb-4">
        {errors.length} errors, {warns.length} warnings across the whole world. Errors block a clean export.
      </p>
      {issues.length === 0 ? (
        <p className="text-emerald-400">No problems. This world is export-ready. 🎉</p>
      ) : (
        <div className="space-y-4">
          {errors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-rose-300 mb-1">Errors</h3>
              <ul className="space-y-1">{errors.map(row)}</ul>
            </div>
          )}
          {warns.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-300 mb-1">Warnings</h3>
              <ul className="space-y-1">{warns.map(row)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
