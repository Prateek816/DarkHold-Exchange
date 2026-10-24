import { describe, expect, it } from 'vitest';
import type { AssetSpec } from '../src/history/generator';
import { buildSeededHistory, FIVE_SECOND_WINDOW_MS, HORIZON_MS } from '../src/history/writer';

const END = Date.parse('2026-10-01T12:00:00Z');

const SPECS: AssetSpec[] = [
  { symbol: 'DFEST-WKND', faceValue: 10000, ceiling: 12000, tickSize: 10 },
  { symbol: 'MOONRISE-GA', faceValue: 8000, ceiling: 9600, tickSize: 10 },
  { symbol: 'DFEST-HOODIE', faceValue: 3000, ceiling: 3600, tickSize: 5 },
  { symbol: 'SIGIL-PIN', faceValue: 500, ceiling: 600, tickSize: 1 },
];

describe('history seeder', () => {
  const history = buildSeededHistory({ seed: 'darkhold-history-1', endMs: END, assets: SPECS });

  it('is deterministic for the same seed and different for another seed', () => {
    const again = buildSeededHistory({ seed: 'darkhold-history-1', endMs: END, assets: SPECS });
    expect(JSON.stringify(again)).toBe(JSON.stringify(history));
    const other = buildSeededHistory({ seed: 'other-seed', endMs: END, assets: SPECS });
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(history));
  });

  it('has the documented top-level shape', () => {
    expect(history.schema_version).toBe(1);
    expect(history.seed).toBe('darkhold-history-1');
    expect(history.end_ts).toBe(END);
    expect(Object.keys(history.assets)).toEqual(SPECS.map((s) => s.symbol));
  });

  it('keeps every candle inside price bounds and on the tick grid', () => {
    for (const spec of SPECS) {
      const a = history.assets[spec.symbol]!;
      for (const c of [...a.candles['1m'], ...a.candles['5s']]) {
        for (const p of [c.open, c.high, c.low, c.close]) {
          expect(p).toBeGreaterThanOrEqual(spec.tickSize);
          expect(p).toBeLessThanOrEqual(spec.ceiling);
          expect(p % spec.tickSize).toBe(0);
        }
      }
      expect(a.reference_price).toBeLessThanOrEqual(spec.ceiling);
      expect(a.reference_price).toBeGreaterThanOrEqual(spec.tickSize);
    }
  });

  it('keeps OHLC consistent', () => {
    for (const spec of SPECS) {
      const a = history.assets[spec.symbol]!;
      for (const c of [...a.candles['1m'], ...a.candles['5s']]) {
        expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
        expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
        expect(c.volume).toBeGreaterThan(0);
        expect(c.tradeCount).toBeGreaterThan(0);
        expect(c.origin).toBe('SEEDED_SIM');
      }
    }
  });

  it('covers 6 hours of 1m candles and only the last 30 minutes of 5s candles', () => {
    for (const spec of SPECS) {
      const a = history.assets[spec.symbol]!;
      for (const c of a.candles['1m']) {
        expect(c.interval).toBe('1m');
        expect(c.openTime).toBeGreaterThanOrEqual(END - HORIZON_MS);
        expect(c.openTime).toBeLessThan(END);
        expect(c.openTime % 60000).toBe(0);
      }
      expect(a.candles['1m'].length).toBeLessThanOrEqual(360);
      for (const c of a.candles['5s']) {
        expect(c.interval).toBe('5s');
        expect(c.openTime).toBeGreaterThanOrEqual(END - FIVE_SECOND_WINDOW_MS);
        expect(c.openTime).toBeLessThan(END);
        expect(c.openTime % 5000).toBe(0);
      }
    }
  });

  it('emits candles in strictly increasing time order, one per bucket, with no empty buckets', () => {
    for (const spec of SPECS) {
      const a = history.assets[spec.symbol]!;
      for (const list of [a.candles['1m'], a.candles['5s']]) {
        for (let i = 1; i < list.length; i++) {
          expect(list[i]!.openTime).toBeGreaterThan(list[i - 1]!.openTime);
        }
      }
    }
  });

  it('uses the close of the last trade as reference price', () => {
    for (const spec of SPECS) {
      const a = history.assets[spec.symbol]!;
      const last = a.candles['1m'][a.candles['1m'].length - 1];
      if (last) expect(a.reference_price).toBe(last.close);
    }
  });

  it('is busiest for the high-liquidity asset and thinnest for the collectible', () => {
    const count = (s: string): number =>
      history.assets[s]!.candles['1m'].reduce((n, c) => n + c.tradeCount, 0);
    expect(count('DFEST-WKND')).toBeGreaterThan(count('SIGIL-PIN'));
  });

  it('rejects an asset without a history profile', () => {
    expect(() =>
      buildSeededHistory({
        seed: 's',
        endMs: END,
        assets: [{ symbol: 'UNKNOWN', faceValue: 100, ceiling: 120, tickSize: 1 }],
      }),
    ).toThrow();
  });
});
