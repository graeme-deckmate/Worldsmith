import { useEffect, useMemo, useRef, useState } from 'react';
import type { World } from '../model/index.ts';
import { indexWorld } from '../runtime/worldIndex.ts';
import { evalCondition, type RunState } from '../runtime/conditions.ts';
import { mulberry32, chance, pickWeighted } from '../runtime/rng.ts';
import { availableIds } from '../runtime/unlocks.ts';
import {
  castSpell, defend, initBattle, initBossBattle, playerMaxHp, playerMaxMp, zoneLevel,
  type BattleState, type Spell,
} from '../runtime/battle.ts';
import { entityAt, exitAt, gateForMap, inBounds, isSolidTile, tileAt, zoneAt } from '../runtime/overworld.ts';
import { OverworldView } from './OverworldView.tsx';
import { BattleView } from './BattleView.tsx';

/** Standalone playtest of a World: walk maps, hit gates, fight, level up. */
export function Player({ world, onClose }: { world: World; onClose: () => void }) {
  const idx = useMemo(() => indexWorld(world), [world]);
  const rng = useRef(mulberry32((Date.now() & 0xffffffff) >>> 0));

  const startMap = idx.maps.get(world.start.map) ?? world.maps[0] ?? null;
  const starter = world.start.starters[0] ?? null;

  const [mapId, setMapId] = useState(startMap?.id ?? '');
  const [pos, setPos] = useState({ x: startMap?.spawn.x ?? 1, y: startMap?.spawn.y ?? 1 });
  const [level, setLevel] = useState(world.start.level);
  const [xp, setXp] = useState(0);
  const [hp, setHp] = useState(() => playerMaxHp(idx, world.start.level));
  const [mp, setMp] = useState(() => playerMaxMp(idx, world.start.level));
  const [bossesDefeated, setBosses] = useState<Set<string>>(new Set());
  const [flags] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set([startMap?.id ?? '']));

  const [battle, setBattle] = useState<BattleState | null>(null);
  const pendingBoss = useRef<string | null>(null);
  const [dialogue, setDialogue] = useState<{ speaker: string; pages: string[]; page: number } | null>(null);
  const [toast, setToast] = useState('');
  const [spell, setSpell] = useState<Spell>({ element: '', form: '', rune: '' });

  const map = idx.maps.get(mapId) ?? null;
  const maxhp = playerMaxHp(idx, level);
  const maxmp = playerMaxMp(idx, level);

  function avail(kind: 'element' | 'form' | 'rune'): { id: string; label: string }[] {
    const all = kind === 'element' ? world.elements : kind === 'form' ? world.forms : world.runes;
    let ids = availableIds(world, kind, level, flags, starter);
    if (ids.length === 0) ids = all.map((d) => d.id);
    return all.filter((d) => ids.includes(d.id)).map((d) => ({ id: d.id, label: d.label }));
  }
  const elements = avail('element');
  const forms = avail('form');
  const runes = avail('rune');
  const partKey = `${elements.map((e) => e.id).join(',')}|${forms.map((f) => f.id).join(',')}|${runes.map((r) => r.id).join(',')}`;
  // keep the selected spell valid as availability changes (bail when unchanged to avoid loops)
  useEffect(() => {
    setSpell((s) => {
      const element = elements.some((e) => e.id === s.element) ? s.element : elements[0]?.id ?? '';
      const form = forms.some((f) => f.id === s.form) ? s.form : forms[0]?.id ?? '';
      const rune = runes.some((r) => r.id === s.rune) ? s.rune : runes[0]?.id ?? '';
      return element === s.element && form === s.form && rune === s.rune ? s : { element, form, rune };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partKey]);

  const runState = (): RunState => ({ bossesDefeated, flags, itemsHeld: new Set(), mapsVisited: visited, level, sigilBosses: world.sigilBosses });
  const flash = (m: string): void => { setToast(m); window.setTimeout(() => setToast(''), 1800); };
  const fighter = () => ({ hp, maxhp, mp, maxmp, level, statuses: {} });

  const startEnemyBattle = (enemyId: string, lv: number): void => {
    const e = idx.enemies.get(enemyId);
    if (!e) return;
    setBattle(initBattle(idx, e, lv, fighter()));
  };
  const startBoss = (bossId: string): void => {
    const b = idx.bosses.get(bossId);
    if (!b) { flash('(boss not defined)'); return; }
    pendingBoss.current = bossId;
    setBattle(initBossBattle(idx, b, fighter()));
  };

  const maybeEncounter = (x: number, y: number): void => {
    if (!map) return;
    const zr = zoneAt(map, x, y);
    const zone = zr ? idx.zones.get(zr.table) : null;
    if (!zone) return;
    const rate = world.tuning.progression?.['ENCOUNTER_RATE'] ?? 0.25;
    if (!chance(rng.current, rate)) return;
    const f = pickWeighted(rng.current, zone.formations.map((fm) => ({ item: fm, weight: fm.weight })));
    const species = f?.members[0];
    if (species) startEnemyBattle(species, zoneLevel(rng.current, zone.levelMin, zone.levelMax));
  };

  const takeExit = (to: string, tx: number, ty: number): void => {
    const gate = gateForMap(world, to);
    if (gate && !evalCondition(gate.when, runState())) {
      openDialogue(gate.barred, `The way to ${to} is sealed.`);
      return;
    }
    if (!idx.maps.has(to)) { flash('(exit leads nowhere)'); return; }
    setMapId(to);
    setPos({ x: tx, y: ty });
    setVisited((v) => new Set(v).add(to));
  };

  const openDialogue = (id: string, fallback = ''): void => {
    const d = idx.dialogue.get(id);
    if (d) setDialogue({ speaker: d.speaker, pages: d.pages, page: 0 });
    else if (fallback) flash(fallback);
  };

  const step = (dx: number, dy: number): void => {
    if (!map || battle || dialogue) return;
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (!inBounds(map, nx, ny)) return;
    const ent = entityAt(map, nx, ny);
    if (ent) {
      if (ent.kind === 'boss') {
        if (!bossesDefeated.has(ent.id)) { startBoss(ent.id); return; }
      } else if (ent.kind === 'npc' || ent.kind === 'sign' || ent.kind === 'lore') {
        openDialogue(ent.dialogue); return;
      } else {
        flash(`A ${ent.kind}.`); return;
      }
    }
    const exit = exitAt(map, nx, ny);
    if (exit) { takeExit(exit.to, exit.tx, exit.ty); return; }
    if (isSolidTile(map, nx, ny)) return;
    setPos({ x: nx, y: ny });
    if (tileAt(map, nx, ny) === ',') maybeEncounter(nx, ny);
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (dialogue) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          setDialogue((d) => (d && d.page < d.pages.length - 1 ? { ...d, page: d.page + 1 } : null));
        }
        return;
      }
      if (battle) return;
      const map2: Record<string, [number, number]> = {
        ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0],
      };
      const mv = map2[e.key];
      if (mv) { e.preventDefault(); step(mv[0], mv[1]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const finishBattle = (): void => {
    const b = battle;
    if (!b) return;
    setHp(b.player.hp);
    setMp(b.player.mp);
    if (b.over === 'win') {
      let nxp = xp + b.enemy.xp;
      let lv = level;
      let need = lv * 20;
      while (nxp >= need) { nxp -= need; lv += 1; need = lv * 20; }
      if (lv !== level) { setLevel(lv); setHp(playerMaxHp(idx, lv)); setMp(playerMaxMp(idx, lv)); flash(`Level up! Lv ${String(lv)}`); }
      setXp(nxp);
      if (pendingBoss.current) setBosses((s) => new Set(s).add(pendingBoss.current as string));
    } else if (b.over === 'lose' && startMap) {
      setMapId(startMap.id);
      setPos({ x: startMap.spawn.x, y: startMap.spawn.y });
      setHp(playerMaxHp(idx, level));
      setMp(playerMaxMp(idx, level));
      flash('You wake back at the start, a little wiser.');
    }
    pendingBoss.current = null;
    setBattle(null);
  };

  if (!map) {
    return (
      <Modal onClose={onClose}>
        <p className="text-sm text-zinc-400">This world has no start map. Set one in Overview, then playtest.</p>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-2 text-sm">
        <div className="text-zinc-300">
          <span className="font-semibold">{map.id}</span>
          <span className="text-zinc-500 ml-3">Lv {level} · HP {hp}/{maxhp} · MP {mp}/{maxmp} · XP {xp}</span>
        </div>
        <div className="text-zinc-500 text-xs">arrows / WASD to move · bump to interact</div>
      </div>

      <div className="relative grid place-items-center">
        <OverworldView map={map} px={pos.x} py={pos.y} scale={30} defeatedBosses={bossesDefeated} />

        {toast && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-zinc-700 rounded px-3 py-1.5 text-sm">
            {toast}
          </div>
        )}

        {dialogue && (
          <div className="absolute inset-x-4 bottom-4 bg-zinc-950/95 border border-zinc-700 rounded-lg p-3 z-10" onClick={() => setDialogue((d) => (d && d.page < d.pages.length - 1 ? { ...d, page: d.page + 1 } : null))}>
            <div className="text-xs text-violet-300 font-semibold mb-1">{dialogue.speaker}</div>
            <div className="text-sm text-zinc-200">{dialogue.pages[dialogue.page]}</div>
            <div className="text-[10px] text-zinc-500 mt-1">click / enter to continue</div>
          </div>
        )}

        {battle && (
          <BattleView
            state={battle}
            elements={elements}
            forms={forms}
            runes={runes}
            spell={spell}
            setSpell={setSpell}
            onCast={() => setBattle((b) => (b ? castSpell(idx, b, spell, rng.current) : b))}
            onDefend={() => setBattle((b) => (b ? defend(idx, b, rng.current) : b))}
            onDone={finishBattle}
          />
        )}
      </div>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 grid place-items-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 max-w-3xl w-full relative">
        <button className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-100 text-sm" onClick={onClose}>✕ close</button>
        {children}
      </div>
    </div>
  );
}
