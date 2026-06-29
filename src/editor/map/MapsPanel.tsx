import { useState } from 'react';
import { useWorld } from '../../store/worldStore.ts';
import { MAP_THEMES, TERRAIN_CHARS, type World, type WorldMap } from '../../model/index.ts';
import { TERRAIN_COLORS } from '../../render/tiles.ts';
import { idAvailable, removeById, upsert } from '../collections.ts';
import { EntityForm, type Field } from '../form/EntityForm.tsx';
import { MapCanvas } from './MapCanvas.tsx';
import { PLACEABLES, PLACEABLE_BY_KIND } from './placeables.ts';
import { validateMap } from './mapValidate.ts';

type Tool = 'terrain' | 'entity' | 'exit' | 'zone' | 'spawn' | 'select';
type Sel =
  | { t: 'entity'; arrayKey: string; index: number }
  | { t: 'exit'; index: number }
  | { t: 'zone'; index: number }
  | null;

const blankMap = (id: string): WorldMap => ({
  id, width: 12, height: 8, music: '', theme: 'vale',
  tiles: ['############', ...Array.from({ length: 6 }, () => '#..........#'), '############'],
  spawn: { x: 2, y: 2, facing: 'down' },
  zones: [], exits: [], npcs: [], signs: [], lore: [], springs: [], shrines: [], bosses: [],
  gates: [], triggers: [], trials: [], egates: [], portals: [], levers: [], doors: [], chests: [],
  objectives: [], minibosses: [], waystones: [], plates: [], ambushes: [],
});

function setTile(tiles: readonly string[], x: number, y: number, ch: string): string[] {
  const next = tiles.slice();
  const row = next[y];
  if (row === undefined || x < 0 || x >= row.length) return next;
  next[y] = row.slice(0, x) + ch + row.slice(x + 1);
  return next;
}

function resizeTiles(tiles: readonly string[], w: number, h: number): string[] {
  return Array.from({ length: h }, (_, y) => (tiles[y] ?? '').slice(0, w).padEnd(w, '.'));
}

export function MapsPanel() {
  const { world, update } = useWorld();
  const [selMapId, setSelMapId] = useState<string | null>(world?.maps[0]?.id ?? null);
  const [tool, setTool] = useState<Tool>('terrain');
  const [brush, setBrush] = useState<string>('.');
  const [placeKind, setPlaceKind] = useState<string>('npc');
  const [sel, setSel] = useState<Sel>(null);
  const [scale, setScale] = useState(28);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  if (!world) return null;

  const map = world.maps.find((m) => m.id === selMapId) ?? null;

  const writeMaps = (next: WorldMap[]): void => update((w) => ({ ...w, maps: next }) as World);
  const editMap = (fn: (m: WorldMap) => WorldMap): void => {
    if (!map) return;
    writeMaps(upsert(world.maps, fn(map)) as WorldMap[]);
  };

  // ---- tool actions -------------------------------------------------------
  const paint = (x: number, y: number): void => editMap((m) => ({ ...m, tiles: setTile(m.tiles, x, y, brush) }));

  const placeEntity = (x: number, y: number): void => {
    const p = PLACEABLE_BY_KIND[placeKind];
    if (!p || !map) return;
    const idx = map[p.arrayKey].length;
    editMap((m) => ({ ...m, [p.arrayKey]: [...m[p.arrayKey], p.make(x, y, world, m)] }) as unknown as WorldMap);
    setSel({ t: 'entity', arrayKey: p.arrayKey, index: idx });
  };
  const placeExit = (x: number, y: number): void => {
    if (!map) return;
    const idx = map.exits.length;
    editMap((m) => ({ ...m, exits: [...m.exits, { x, y, to: world.maps[0]?.id ?? m.id, tx: 1, ty: 1 }] }));
    setSel({ t: 'exit', index: idx });
  };

  const selectAt = (x: number, y: number): void => {
    for (const p of PLACEABLES) {
      const idx = map?.[p.arrayKey].findIndex((e) => e.x === x && e.y === y) ?? -1;
      if (idx >= 0) { setSel({ t: 'entity', arrayKey: p.arrayKey, index: idx }); return; }
    }
    const ex = map?.exits.findIndex((e) => e.x === x && e.y === y) ?? -1;
    if (ex >= 0) { setSel({ t: 'exit', index: ex }); return; }
    const zi = map?.zones.findIndex((z) =>
      x >= Math.min(z.rect.x1, z.rect.x2) && x <= Math.max(z.rect.x1, z.rect.x2) &&
      y >= Math.min(z.rect.y1, z.rect.y2) && y <= Math.max(z.rect.y1, z.rect.y2)) ?? -1;
    if (zi >= 0) { setSel({ t: 'zone', index: zi }); return; }
    setSel(null);
  };

  const onDown = (x: number, y: number): void => {
    if (tool === 'terrain') paint(x, y);
    else if (tool === 'spawn') editMap((m) => ({ ...m, spawn: { ...m.spawn, x, y } }));
    else if (tool === 'entity') placeEntity(x, y);
    else if (tool === 'exit') placeExit(x, y);
    else if (tool === 'select') selectAt(x, y);
    else if (tool === 'zone') { setDragStart({ x, y }); setPreview({ x1: x, y1: y, x2: x, y2: y }); }
  };
  const onDrag = (x: number, y: number): void => {
    if (tool === 'terrain') paint(x, y);
    else if (tool === 'zone' && dragStart) setPreview({ x1: dragStart.x, y1: dragStart.y, x2: x, y2: y });
  };
  const onUp = (x: number, y: number): void => {
    if (tool === 'zone' && dragStart) {
      const rect = { x1: dragStart.x, y1: dragStart.y, x2: x, y2: y };
      editMap((m) => ({ ...m, zones: [...m.zones, { name: `zone_${String(m.zones.length + 1)}`, rect, table: world.zones[0]?.id ?? 'zone' }] }));
      setDragStart(null);
      setPreview(null);
    }
  };

  // ---- inspector ----------------------------------------------------------
  const inspectorPatch = (patch: Record<string, unknown>): void => {
    if (!sel || !map) return;
    if (sel.t === 'entity') {
      const key = sel.arrayKey as keyof WorldMap;
      const arr = (map[key] as Record<string, unknown>[]).map((e, i) => (i === sel.index ? { ...e, ...patch } : e));
      editMap((m) => ({ ...m, [key]: arr }) as unknown as WorldMap);
    } else if (sel.t === 'exit') {
      editMap((m) => ({ ...m, exits: m.exits.map((e, i) => (i === sel.index ? { ...e, ...patch } : e)) }));
    } else if (sel.t === 'zone') {
      editMap((m) => ({ ...m, zones: m.zones.map((z, i) => (i === sel.index ? { ...z, ...patch } : z)) }));
    }
  };
  const deleteSelected = (): void => {
    if (!sel || !map) return;
    if (sel.t === 'entity') {
      const key = sel.arrayKey as keyof WorldMap;
      editMap((m) => ({ ...m, [key]: (m[key] as unknown[]).filter((_, i) => i !== sel.index) }) as unknown as WorldMap);
    } else if (sel.t === 'exit') {
      editMap((m) => ({ ...m, exits: m.exits.filter((_, i) => i !== sel.index) }));
    } else if (sel.t === 'zone') {
      editMap((m) => ({ ...m, zones: m.zones.filter((_, i) => i !== sel.index) }));
    }
    setSel(null);
  };

  // selected def + spec + highlight
  let selDef: Record<string, unknown> | null = null;
  let selSpec: Field[] = [];
  let highlight: { x: number; y: number } | null = null;
  if (sel && map) {
    if (sel.t === 'entity') {
      const p = PLACEABLES.find((q) => q.arrayKey === sel.arrayKey);
      selDef = (map[sel.arrayKey as keyof WorldMap] as Record<string, unknown>[])[sel.index] ?? null;
      selSpec = p?.spec ?? [];
    } else if (sel.t === 'exit') {
      selDef = map.exits[sel.index] as unknown as Record<string, unknown>;
      selSpec = [{ key: 'to', label: 'To map', kind: 'idref', ref: 'maps' }, { key: 'tx', label: 'Target x', kind: 'number' }, { key: 'ty', label: 'Target y', kind: 'number' }];
    } else {
      selDef = map.zones[sel.index] as unknown as Record<string, unknown>;
      selSpec = [{ key: 'name', label: 'Name', kind: 'text' }, { key: 'table', label: 'Zone table', kind: 'idref', ref: 'zones' }];
    }
    if (selDef && typeof selDef.x === 'number' && typeof selDef.y === 'number') {
      highlight = { x: selDef.x, y: selDef.y };
    }
  }

  const issues = map ? validateMap(map, world) : [];

  // ---- map list ops -------------------------------------------------------
  const createMap = (): void => {
    let id = 'map';
    for (let i = 1; !idAvailable(world.maps, id); i++) id = `map_${String(i)}`;
    writeMaps([...world.maps, blankMap(id)]);
    setSelMapId(id);
  };

  return (
    <div className="flex gap-4 h-full">
      {/* map list */}
      <div className="w-40 shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Maps</h2>
          <button className="text-xs rounded bg-violet-600 hover:bg-violet-500 px-2 py-1" onClick={createMap}>+ new</button>
        </div>
        <ul className="space-y-0.5 overflow-y-auto flex-1">
          {world.maps.map((m) => (
            <li key={m.id}>
              <button
                className={`w-full text-left px-2 py-1 rounded text-sm ${selMapId === m.id ? 'bg-violet-600/20 text-violet-200' : 'hover:bg-zinc-800'}`}
                onClick={() => { setSelMapId(m.id); setSel(null); }}
              >
                {m.id}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {!map ? (
        <div className="flex-1 grid place-items-center text-sm text-zinc-500">Select or create a map.</div>
      ) : (
        <div className="flex-1 min-w-0 flex gap-4">
          {/* canvas + toolbar */}
          <div className="min-w-0">
            {/* map props */}
            <div className="flex items-center gap-2 mb-2 text-xs flex-wrap">
              <input
                className="w-32 rounded bg-zinc-800 px-2 py-1 outline-none focus:ring-1 ring-violet-500"
                value={map.id}
                onChange={(e) => { const id = e.target.value; if (idAvailable(world.maps, id)) { writeMaps(upsert(removeById(world.maps, map.id), { ...map, id }) as WorldMap[]); setSelMapId(id); } }}
              />
              <select className="rounded bg-zinc-800 px-2 py-1" value={map.theme} onChange={(e) => editMap((m) => ({ ...m, theme: e.target.value as WorldMap['theme'] }))}>
                {MAP_THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="w-24 rounded bg-zinc-800 px-2 py-1" placeholder="music" value={map.music} onChange={(e) => editMap((m) => ({ ...m, music: e.target.value }))} />
              <label className="flex items-center gap-1">w<input className="w-14 rounded bg-zinc-800 px-1 py-1" type="number" value={map.width} onChange={(e) => { const w = Math.max(3, Math.min(120, Number(e.target.value) || 3)); editMap((m) => ({ ...m, width: w, tiles: resizeTiles(m.tiles, w, m.height) })); }} /></label>
              <label className="flex items-center gap-1">h<input className="w-14 rounded bg-zinc-800 px-1 py-1" type="number" value={map.height} onChange={(e) => { const h = Math.max(3, Math.min(120, Number(e.target.value) || 3)); editMap((m) => ({ ...m, height: h, tiles: resizeTiles(m.tiles, m.width, h) })); }} /></label>
              <label className="flex items-center gap-1">zoom<input type="range" min={10} max={44} value={scale} onChange={(e) => setScale(Number(e.target.value))} /></label>
              <button className="text-xs rounded bg-zinc-800 hover:bg-rose-900/50 text-zinc-400 hover:text-rose-300 px-2 py-1" onClick={() => { writeMaps(removeById(world.maps, map.id) as WorldMap[]); setSelMapId(null); }}>delete map</button>
            </div>

            {/* tools */}
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {(['terrain', 'entity', 'exit', 'zone', 'spawn', 'select'] as Tool[]).map((t) => (
                <button key={t} className={`text-xs px-2 py-1 rounded ${tool === t ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-300'}`} onClick={() => setTool(t)}>{t}</button>
              ))}
            </div>
            {tool === 'terrain' && (
              <div className="flex gap-1 mb-2">
                {TERRAIN_CHARS.map((ch) => (
                  <button key={ch} className={`w-7 h-7 rounded border-2 text-xs grid place-items-center ${brush === ch ? 'border-violet-400' : 'border-zinc-700'}`} style={{ background: TERRAIN_COLORS[ch] }} onClick={() => setBrush(ch)} title={ch}>
                    <span className="text-white/80 mix-blend-difference">{ch}</span>
                  </button>
                ))}
              </div>
            )}
            {tool === 'entity' && (
              <select className="text-xs rounded bg-zinc-800 px-2 py-1 mb-2" value={placeKind} onChange={(e) => setPlaceKind(e.target.value)}>
                {PLACEABLES.map((p) => <option key={p.kind} value={p.kind}>{p.glyph} {p.kind}</option>)}
              </select>
            )}

            <div className="overflow-auto">
              <MapCanvas map={map} scale={scale} highlight={highlight} preview={preview} onCellDown={onDown} onCellDrag={onDrag} onCellUp={onUp} />
            </div>
          </div>

          {/* inspector + validation */}
          <div className="w-72 shrink-0 overflow-y-auto">
            {selDef ? (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">
                    {sel?.t === 'entity' ? PLACEABLES.find((p) => p.arrayKey === sel.arrayKey)?.kind : sel?.t}
                  </h3>
                  <button className="text-xs text-zinc-500 hover:text-rose-400" onClick={deleteSelected}>delete</button>
                </div>
                <EntityForm def={selDef} spec={selSpec} onPatch={inspectorPatch} />
              </div>
            ) : (
              <p className="text-xs text-zinc-500 mb-4">
                Pick a tool. Paint terrain, place entities/exits, drag a zone, set spawn, or select to edit.
              </p>
            )}

            <h3 className="font-semibold text-sm mb-1">
              Validation <span className="text-zinc-500 font-normal">({issues.filter((i) => i.level === 'error').length}E {issues.filter((i) => i.level === 'warn').length}W)</span>
            </h3>
            {issues.length === 0 ? (
              <p className="text-emerald-400 text-xs">No problems with this map.</p>
            ) : (
              <ul className="space-y-1">
                {issues.map((i, idx) => (
                  <li key={idx} className="text-xs flex gap-1">
                    <span className={i.level === 'error' ? 'text-rose-400' : 'text-amber-400'}>{i.level === 'error' ? '✗' : '⚠'}</span>
                    <span className="text-zinc-300">{i.message}</span>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="font-semibold text-sm mt-4 mb-1">Exits</h3>
            <ul className="text-xs space-y-0.5">
              {map.exits.map((e, i) => (
                <li key={i} className="text-zinc-400">({e.x},{e.y}) → <span className="text-violet-300">{e.to}</span> ({e.tx},{e.ty})</li>
              ))}
              {map.exits.length === 0 && <li className="text-zinc-600">none</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
