// Seeded PRNG: string seed -> FNV-1a 32-bit hash -> splitmix32 expansion -> xoshiro128**.
function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function splitmix32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return t >>> 0;
  };
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

export class Rng {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(readonly seed: string) {
    const sm = splitmix32(fnv1a32(seed));
    this.s0 = sm();
    this.s1 = sm();
    this.s2 = sm();
    this.s3 = sm();
    if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) this.s0 = 1;
  }

  /** Raw xoshiro128** output as an unsigned 32-bit integer. */
  nextU32(): number {
    const result = Math.imul(rotl(Math.imul(this.s1, 5), 7), 9) >>> 0;
    const t = (this.s1 << 9) >>> 0;
    this.s2 = (this.s2 ^ this.s0) >>> 0;
    this.s3 = (this.s3 ^ this.s1) >>> 0;
    this.s1 = (this.s1 ^ this.s2) >>> 0;
    this.s0 = (this.s0 ^ this.s3) >>> 0;
    this.s2 = (this.s2 ^ t) >>> 0;
    this.s3 = rotl(this.s3, 11);
    return result;
  }

  /** Uniform in [0, 1). */
  next(): number {
    return this.nextU32() / 4294967296;
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (max < min) throw new Error(`rng.int: max (${max}) < min (${min})`);
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Standard normal via Box-Muller. */
  normal(): number {
    const u1 = 1 - this.next(); // (0, 1]
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  lognormal(mu: number, sigma: number): number {
    return Math.exp(mu + sigma * this.normal());
  }

  exponential(mean: number): number {
    return -mean * Math.log(1 - this.next());
  }

  poisson(lambda: number): number {
    if (!(lambda > 0)) return 0;
    if (lambda < 30) {
      const limit = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= this.next();
      } while (p > limit);
      return k - 1;
    }
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * this.normal()));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('rng.pick: empty array');
    return items[this.int(0, items.length - 1)] as T;
  }

  weighted<T>(items: ReadonlyArray<{ value: T; weight: number }>): T {
    let total = 0;
    for (const it of items) total += Math.max(0, it.weight);
    if (!(total > 0)) throw new Error('rng.weighted: total weight must be positive');
    let r = this.next() * total;
    for (const it of items) {
      const w = Math.max(0, it.weight);
      if (r < w) return it.value;
      r -= w;
    }
    return items[items.length - 1]!.value;
  }

  /** Independent generator derived from this seed and a label. Does not consume state. */
  child(label: string): Rng {
    return new Rng(`${this.seed}/${label}`);
  }

  /** v4-formatted UUID drawn from this generator. */
  uuid(): string {
    const b = new Uint8Array(16);
    for (let i = 0; i < 4; i++) {
      const v = this.nextU32();
      b[i * 4] = v & 0xff;
      b[i * 4 + 1] = (v >>> 8) & 0xff;
      b[i * 4 + 2] = (v >>> 16) & 0xff;
      b[i * 4 + 3] = (v >>> 24) & 0xff;
    }
    b[6] = (b[6]! & 0x0f) | 0x40;
    b[8] = (b[8]! & 0x3f) | 0x80;
    const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}
