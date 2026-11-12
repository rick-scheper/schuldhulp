/**
 * Seeded randomness for the Monte Carlo (#25). Pure JavaScript, so the same seed gives the same
 * draws on every run in the same engine (#16 check e: exact).
 *
 * Each toekomst gets its own generator per source of risk, derived from (seed, stream, index).
 * So toekomst i is reproducible on its own (the paired run and the tests regenerate it), and
 * switching the rentepad to "rente blijft gelijk" leaves the equity draws unchanged.
 */

/** The seed baked into the app (#18): every visitor sees the same toekomsten for the same inputs. */
export const MONTE_CARLO_SEED = 20261030;

/** Independent streams of draws per toekomst. */
export const STREAM = { rente: 1, aandelen: 2 } as const;
export type Stream = (typeof STREAM)[keyof typeof STREAM];

export interface Rng {
  /** Uniform on [0, 1). */
  uniform(): number;
  /** Standard normal. */
  normal(): number;
}

/** MurmurHash3's 32-bit finaliser: spreads a 32-bit integer over all bits. */
function fmix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * The generator for one toekomst and stream: sfc32 (Chris Doty-Humphrey's small fast counter
 * generator, passes PractRand), seeded by hashing (seed, stream, index), with Box–Muller normals.
 */
export function createRng(seed: number, stream: number, index: number): Rng {
  let a = fmix32((seed ^ 0x9e3779b9) >>> 0);
  let b = fmix32((a ^ Math.imul(stream + 1, 0x85ebca6b)) >>> 0);
  let c = fmix32((b ^ Math.imul(index + 1, 0xc2b2ae35)) >>> 0);
  let d = fmix32((c ^ 0x27d4eb2f) >>> 0) | 1;

  const next = (): number => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 12; i++) next(); // warm up away from the seeding pattern

  let spare: number | null = null;
  return {
    uniform: next,
    normal() {
      if (spare !== null) {
        const z = spare;
        spare = null;
        return z;
      }
      const u1 = 1 - next(); // (0, 1]: log stays finite
      const u2 = next();
      const r = Math.sqrt(-2 * Math.log(u1));
      const phi = 2 * Math.PI * u2;
      spare = r * Math.sin(phi);
      return r * Math.cos(phi);
    },
  };
}
