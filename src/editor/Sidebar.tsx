import { useWorld } from '../store/worldStore.ts';
import { GROUPS, SECTIONS } from './nav.ts';

/** Left nav: an Overview link plus every content section grouped by area. */
export function Sidebar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (key: string) => void;
}) {
  const world = useWorld((s) => s.world);
  if (!world) return null;

  const itemClass = (key: string): string =>
    `w-full text-left px-3 py-1.5 rounded text-sm flex items-center justify-between ${
      active === key ? 'bg-violet-600/20 text-violet-200' : 'hover:bg-zinc-800 text-zinc-300'
    }`;

  return (
    <nav className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-950 overflow-y-auto p-2">
      <button className={itemClass('overview')} onClick={() => onSelect('overview')}>
        Overview
      </button>
      <button className={itemClass('problems')} onClick={() => onSelect('problems')}>
        Problems
      </button>
      {GROUPS.map((group) => (
        <div key={group} className="mt-3">
          <div className="px-3 text-[10px] uppercase tracking-wider text-zinc-600 mb-1">{group}</div>
          {SECTIONS.filter((s) => s.group === group).map((s) => {
            const count = s.items(world).length;
            return (
              <button key={s.key} className={itemClass(s.key)} onClick={() => onSelect(s.key)}>
                <span>{s.label}</span>
                <span className="text-zinc-600 text-xs">{count}</span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
