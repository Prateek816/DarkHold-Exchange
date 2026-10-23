import { describe, expect, it } from 'vitest';
import { Rng } from '../src/rng';

describe('Rng', () => {
  it('is deterministic for the same seed', () => {
    const a = new Rng('seed-1');
    const b = new Rng('seed-1');
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('differs across seeds', () => {
    const a = new Rng('seed-1');
    const b = new Rng('seed-2');
    const xs = Array.from({ length: 10 }, () => a.next());
    const ys = Array.from({ length: 10 }, () => b.next());
    expect(xs).not.toEqual(ys);
  });

  it('next() stays in [0, 1)', () => {
    const r = new Rng('range');
    for (let i = 0; i < 5000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() is inclusive and bounded', () => {
    const r = new Rng('int');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = r.int(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('normal() has mean near 0 and sd near 1', () => {
    const r = new Rng('normal');
    const n = 20000;
    let sum = 0;
    let sq = 0;
    for (let i = 0; i < n; i++) {
      const v = r.normal();
      sum += v;
      sq += v * v;
    }
    const mean = sum / n;
    const sd = Math.sqrt(sq / n - mean * mean);
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(sd - 1)).toBeLessThan(0.05);
  });

  it('exponential() has the requested mean', () => {
    const r = new Rng('exp');
    const n = 20000;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += r.exponential(5);
    expect(Math.abs(sum / n - 5)).toBeLessThan(0.3);
  });

  it('poisson() has mean near lambda, for small and large lambda', () => {
    const r = new Rng('poisson');
    for (const lambda of [0.5, 4, 50]) {
      const n = 10000;
      let sum = 0;
      for (let i = 0; i < n; i++) sum += r.poisson(lambda);
      expect(Math.abs(sum / n - lambda)).toBeLessThan(Math.max(0.1, lambda * 0.05));
    }
    expect(r.poisson(0)).toBe(0);
  });

  it('lognormal() is positive', () => {
    const r = new Rng('ln');
    for (let i = 0; i < 1000; i++) expect(r.lognormal(0, 0.7)).toBeGreaterThan(0);
  });

  it('pick() and weighted() respect inputs', () => {
    const r = new Rng('pick');
    expect(['a', 'b', 'c']).toContain(r.pick(['a', 'b', 'c']));
    expect(() => r.pick([])).toThrow();
    for (let i = 0; i < 200; i++) {
      expect(r.weighted([{ value: 'x', weight: 0 }, { value: 'y', weight: 1 }])).toBe('y');
    }
    let heavy = 0;
    for (let i = 0; i < 4000; i++) {
      if (r.weighted([{ value: 'a', weight: 9 }, { value: 'b', weight: 1 }]) === 'a') heavy++;
    }
    expect(heavy / 4000).toBeGreaterThan(0.85);
    expect(heavy / 4000).toBeLessThan(0.95);
  });

  it('child() is deterministic, label-dependent and does not consume parent state', () => {
    const parent = new Rng('parent');
    const reference = new Rng('parent');
    const c1 = parent.child('a');
    const c2 = parent.child('a');
    const c3 = parent.child('b');
    expect(c1.next()).toBe(c2.next());
    expect(new Rng('parent/a').next()).toBe(parent.child('a').next());
    expect(parent.child('a').next()).not.toBe(c3.next());
    expect(parent.next()).toBe(reference.next());
  });

  it('uuid() is v4-formatted and deterministic', () => {
    const a = new Rng('uuid');
    const b = new Rng('uuid');
    const u = a.uuid();
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(b.uuid()).toBe(u);
    expect(a.uuid()).not.toBe(u);
  });
});
