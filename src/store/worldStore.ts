import { create } from 'zustand';
import {
  emptyWorld,
  parseWorld,
  validateWorld,
  type Issue,
  type World,
} from '../model/index.ts';
import {
  deleteWorldFromDb,
  listWorlds,
  loadWorldFromDb,
  saveWorldToDb,
  type WorldSummary,
} from './persist.ts';

/**
 * The single editor store. Holds the open World, drives autosave to IndexedDB,
 * and exposes import/export + a derived validation list. Undo/redo is a bounded
 * history of world snapshots (worlds are small JSON).
 */

const HISTORY_LIMIT = 50;
const now = (): number => Date.now();

interface WorldState {
  world: World | null;
  summaries: WorldSummary[];
  issues: Issue[];
  past: World[];
  future: World[];
  dirty: boolean;

  refreshList: () => Promise<void>;
  newWorld: (id: string, name: string) => Promise<void>;
  loadSampleWorld: (w: World) => Promise<void>;
  duplicate: (id: string, name: string) => Promise<void>;
  open: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Apply a structural change to the open world (recorded for undo, autosaved). */
  update: (fn: (w: World) => World, opts?: { history?: boolean }) => void;
  undo: () => void;
  redo: () => void;
  importJson: (text: string) => { ok: true } | { ok: false; error: string };
  exportJson: () => string;
}

function commit(world: World): World {
  const stamped: World = { ...world, meta: { ...world.meta, updatedAt: now() } };
  void saveWorldToDb(stamped);
  return stamped;
}

export const useWorld = create<WorldState>((setState, getState) => ({
  world: null,
  summaries: [],
  issues: [],
  past: [],
  future: [],
  dirty: false,

  refreshList: async () => {
    setState({ summaries: await listWorlds() });
  },

  newWorld: async (id, name) => {
    const w = commit(emptyWorld(id, name, now()));
    setState({ world: w, issues: validateWorld(w), past: [], future: [] });
    await getState().refreshList();
  },

  loadSampleWorld: async (sample) => {
    const w = commit({ ...sample, meta: { ...sample.meta, updatedAt: now() } });
    setState({ world: w, issues: validateWorld(w), past: [], future: [] });
    await getState().refreshList();
  },

  duplicate: async (id, name) => {
    const cur = getState().world;
    if (!cur) return;
    const w = commit({ ...cur, meta: { ...cur.meta, id, name, createdAt: now(), updatedAt: now() } });
    setState({ world: w, issues: validateWorld(w), past: [], future: [] });
    await getState().refreshList();
  },

  open: async (id) => {
    const w = await loadWorldFromDb(id);
    if (w) setState({ world: w, issues: validateWorld(w), past: [], future: [] });
  },

  remove: async (id) => {
    await deleteWorldFromDb(id);
    const { world } = getState();
    if (world?.meta.id === id) setState({ world: null, issues: [] });
    await getState().refreshList();
  },

  update: (fn, opts) => {
    const { world, past } = getState();
    if (!world) return;
    const next = commit(fn(world));
    const history = opts?.history !== false;
    setState({
      world: next,
      issues: validateWorld(next),
      past: history ? [...past, world].slice(-HISTORY_LIMIT) : past,
      future: [],
      dirty: false,
    });
  },

  undo: () => {
    const { world, past, future } = getState();
    if (!world || past.length === 0) return;
    const prev = past[past.length - 1] as World;
    void saveWorldToDb(prev);
    setState({
      world: prev,
      issues: validateWorld(prev),
      past: past.slice(0, -1),
      future: [world, ...future].slice(0, HISTORY_LIMIT),
    });
  },

  redo: () => {
    const { world, past, future } = getState();
    if (!world || future.length === 0) return;
    const next = future[0] as World;
    void saveWorldToDb(next);
    setState({
      world: next,
      issues: validateWorld(next),
      past: [...past, world].slice(-HISTORY_LIMIT),
      future: future.slice(1),
    });
  },

  importJson: (text) => {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, error: 'not valid JSON' };
    }
    const res = parseWorld(data);
    if (!res.ok) return { ok: false, error: res.error };
    const w = commit({ ...res.world, meta: { ...res.world.meta, updatedAt: now() } });
    setState({ world: w, issues: validateWorld(w), past: [], future: [] });
    void getState().refreshList();
    return { ok: true };
  },

  exportJson: () => {
    const { world } = getState();
    return world ? JSON.stringify(world, null, 2) : '';
  },
}));
