/**
 * Small immutable array helpers for editing World collections. Panels combine
 * these with the store's `update(fn)` to add/edit/remove defs, e.g.
 *   update((w) => ({ ...w, sprites: upsert(w.sprites, sprite) }))
 */

export function upsert<T extends { id: string }>(arr: readonly T[], item: T): T[] {
  const i = arr.findIndex((d) => d.id === item.id);
  if (i === -1) return [...arr, item];
  const next = arr.slice();
  next[i] = item;
  return next;
}

export function removeById<T extends { id: string }>(arr: readonly T[], id: string): T[] {
  return arr.filter((d) => d.id !== id);
}

export function patchById<T extends { id: string }>(
  arr: readonly T[],
  id: string,
  patch: Partial<T>,
): T[] {
  return arr.map((d) => (d.id === id ? { ...d, ...patch } : d));
}

/** True if `id` is free (not already used) in the collection. */
export function idAvailable(arr: readonly { id: string }[], id: string): boolean {
  return !arr.some((d) => d.id === id);
}
