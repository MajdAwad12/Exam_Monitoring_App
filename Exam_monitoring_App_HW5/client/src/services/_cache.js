// client/src/services/_cache.js
// Simple in-memory cache with TTL to speed up navigation between screens.
// Keeps data fresh enough for UI while avoiding repeated heavy fetches.

const _cache = new Map();

/**
 * @param {string} key
 * @returns {{value:any, exp:number}|null}
 */
function _getEntry(key) {
  const e = _cache.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) {
    _cache.delete(key);
    return null;
  }
  return e;
}

export function cacheGet(key) {
  const e = _getEntry(key);
  return e ? e.value : null;
}

export function cacheSet(key, value, ttlMs = 30_000) {
  _cache.set(key, { value, exp: Date.now() + Math.max(0, Number(ttlMs) || 0) });
}

export function cacheDel(prefixOrKey) {
  const p = String(prefixOrKey || "");
  if (!p) return;
  for (const k of _cache.keys()) {
    if (k === p || k.startsWith(p)) _cache.delete(k);
  }
}

/**
 * Fetch JSON with caching.
 * @param {string} key cache key
 * @param {() => Promise<any>} fetcher function that returns data
 * @param {{ttlMs?:number, force?:boolean}} [opts]
 */
export async function fetchWithCache(key, fetcher, opts = {}) {
  const ttlMs = Number(opts.ttlMs ?? 30_000);
  const force = Boolean(opts.force);

  if (!force) {
    const hit = cacheGet(key);
    if (hit !== null) return hit;
  }

  const data = await fetcher();
  cacheSet(key, data, ttlMs);
  return data;
}
