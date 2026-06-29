import { get, set, del, keys, createStore } from 'idb-keyval';
import type { World } from '../model/index.ts';

/**
 * IndexedDB persistence for worlds. Each world is stored under `world:<id>`;
 * worlds are small JSON, so we just write the whole document on save. No server.
 */

const store = createStore('worldsmith', 'worlds');
const KEY = (id: string): string => `world:${id}`;

export interface WorldSummary {
  id: string;
  name: string;
  updatedAt: number;
}

export async function saveWorldToDb(world: World): Promise<void> {
  await set(KEY(world.meta.id), world, store);
}

export async function loadWorldFromDb(id: string): Promise<World | null> {
  const w = await get<World>(KEY(id), store);
  return w ?? null;
}

export async function deleteWorldFromDb(id: string): Promise<void> {
  await del(KEY(id), store);
}

export async function listWorlds(): Promise<WorldSummary[]> {
  const all = await keys(store);
  const summaries: WorldSummary[] = [];
  for (const k of all) {
    if (typeof k !== 'string' || !k.startsWith('world:')) continue;
    const w = await get<World>(k, store);
    if (w) summaries.push({ id: w.meta.id, name: w.meta.name, updatedAt: w.meta.updatedAt });
  }
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
}
