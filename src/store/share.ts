import { parseWorld, type World } from '../model/index.ts';

/**
 * Share a world via the URL hash (#w=<base64 json>). Client-only sharing for
 * small worlds; large ones should use file export instead.
 */

// unicode-safe base64
function toB64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function fromB64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Build a shareable URL for a world, or null if it's too large for a hash. */
export function shareUrl(world: World): string | null {
  const data = toB64(JSON.stringify(world));
  if (data.length > 30000) return null; // keep URLs sane
  return `${location.origin}${location.pathname}#w=${data}`;
}

/** If the current URL carries a shared world, parse and return it. */
export function worldFromHash(): World | null {
  const m = /#w=([^&]+)/.exec(location.hash);
  if (!m || !m[1]) return null;
  try {
    const res = parseWorld(JSON.parse(fromB64(m[1])));
    return res.ok ? res.world : null;
  } catch {
    return null;
  }
}

export function clearHash(): void {
  history.replaceState(null, '', location.pathname + location.search);
}
