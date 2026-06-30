// Deterministic, platform-independent PRNG for reproducible randomization.
// Same seed -> bit-for-bit identical output on every device/browser/runtime.
// No dependencies. Used instead of Math.random() so an independent auditor can
// reproduce a schedule from (seed + parameters + algorithm) alone.

export const RNG_ALGO = "mulberry32";
export const RNG_VERSION = "1.0";

/** mulberry32 — 32-bit seeded PRNG. Returns a function yielding floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * xmur3 string hash -> 32-bit seed. Lets a human-readable seed (e.g. a protocol
 * code) map deterministically to a numeric seed. Not currently surfaced in the
 * UI but kept here so string seeds stay reproducible if added later.
 */
export function xmur3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** In-place Fisher-Yates shuffle driven by a seeded PRNG. Returns the same array. */
export function shuffle<T>(arr: T[], r: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
