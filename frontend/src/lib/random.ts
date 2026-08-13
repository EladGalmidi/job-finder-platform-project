/**
 * Deterministic pseudo-randomness.
 *
 * Match scores and CV scores are derived from a seed rather than Math.random so
 * that demos are repeatable and tests can assert exact numbers. Reloading the
 * page must not reshuffle every score.
 */

/** FNV-1a. Stable across runs, unlike a hash built on object identity. */
export const hashString = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

/** mulberry32 — small, fast, good enough for fixture generation. */
export const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const seededInt = (seed: string, min: number, max: number): number => {
  const random = createRandom(hashString(seed));
  return min + Math.floor(random() * (max - min + 1));
};

export const seededPick = <T>(seed: string, items: readonly T[]): T => {
  if (items.length === 0) {
    throw new Error('seededPick requires a non-empty array');
  }
  const index = seededInt(seed, 0, items.length - 1);
  // Safe: index is clamped to the array bounds above.
  return items[index] as T;
};
