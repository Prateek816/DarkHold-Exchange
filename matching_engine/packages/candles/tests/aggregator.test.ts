import { describe, expect, it } from 'vitest';
import { CandleAggregator, type Tick } from '../src';

const mk = (intervals: ('5s' | '1m')[] = ['5s']) => new CandleAggregator({ intervals, origin: 'ENGINE' });
const tick = (seq: number, ts: number, price: number, qty = 1): Tick => ({ seq, ts, price, qty });

describe('CandleAggregator', () => {
  it('single tick opens a candle', () => {
    const a = mk();
    const r = a.applyTick(tick(1, 1000, 100, 3));
    expect(r.ignored).toBe(false);
    expect(r.closed).toEqual([]);
    expect(r.updated).toEqual([
      { interval: '5s', openTime: 0, open: 100, high: 100, low: 100, close: 100, volume: 3, tradeCount: 1, origin: 'ENGINE' },
    ]);
  });

  it('multiple ticks in one bucket update OHLCV', () => {
    const a = mk();
    a.applyTick(tick(1, 1000, 100, 1));
    a.applyTick(tick(2, 2000, 110, 2));
    a.applyTick(tick(3, 3000, 95, 3));
    const r = a.applyTick(tick(4, 4000, 102, 4));
    expect(r.updated[0]).toMatchObject({ open: 100, high: 110, low: 95, close: 102, volume: 10, tradeCount: 4 });
  });

  it('rollover emits exactly one closed candle', () => {
    const a = mk();
    a.applyTick(tick(1, 1000, 100));
    const r = a.applyTick(tick(2, 5000, 120));
    expect(r.closed).toHaveLength(1);
    expect(r.closed[0]).toMatchObject({ openTime: 0, close: 100 });
    expect(r.updated[0]).toMatchObject({ openTime: 5000, open: 120 });
  });

  it('a gap of empty buckets creates no candles', () => {
    const a = mk();
    a.applyTick(tick(1, 1000, 100));
    const r = a.applyTick(tick(2, 60000, 105));
    expect(r.closed).toHaveLength(1);
    expect(a.getActive()).toHaveLength(1);
    expect(a.getActive()[0]!.openTime).toBe(60000);
  });

  it('ignores duplicate and lower seq', () => {
    const a = mk();
    a.applyTick(tick(5, 1000, 100));
    expect(a.applyTick(tick(5, 1500, 999))).toEqual({ updated: [], closed: [], ignored: true });
    expect(a.applyTick(tick(4, 1500, 999)).ignored).toBe(true);
    expect(a.getActive()[0]).toMatchObject({ high: 100, volume: 1, tradeCount: 1 });
  });

  it('flush closes exactly at the bucket end, not one ms before', () => {
    const a = mk();
    a.applyTick(tick(1, 1000, 100));
    expect(a.flush(4999)).toEqual([]);
    expect(a.getActive()).toHaveLength(1);
    const closed = a.flush(5000);
    expect(closed).toHaveLength(1);
    expect(closed[0]).toMatchObject({ openTime: 0 });
    expect(a.getActive()).toEqual([]);
    expect(a.flush(999999)).toEqual([]); // never invents candles
  });

  it('clamps a timestamp regression into the active bucket', () => {
    const a = mk();
    a.applyTick(tick(1, 6000, 100));
    const r = a.applyTick(tick(2, 1000, 90));
    expect(r.closed).toEqual([]);
    expect(r.updated[0]).toMatchObject({ openTime: 5000, low: 90, close: 90, tradeCount: 2 });
  });

  it('does not reopen a bucket that was already flushed', () => {
    const a = mk();
    a.applyTick(tick(1, 1000, 100));
    a.flush(5000);
    const r = a.applyTick(tick(2, 2000, 90)); // late tick for the flushed bucket
    expect(r.updated).toEqual([]);
    expect(a.getActive()).toEqual([]);
  });

  it('restore then continue equals an uninterrupted run', () => {
    const ticks = [tick(1, 1000, 100), tick(2, 2000, 105), tick(3, 6000, 99), tick(4, 7000, 101), tick(5, 12000, 120)];
    const full = mk();
    const fullClosed = ticks.flatMap((t) => full.applyTick(t).closed);

    const first = mk();
    const part1 = ticks.slice(0, 3).flatMap((t) => first.applyTick(t).closed);
    const second = mk();
    second.restore({ active: first.getActive(), lastSeq: 3 });
    const part2 = ticks.slice(3).flatMap((t) => second.applyTick(t).closed);

    expect([...part1, ...part2]).toEqual(fullClosed);
    expect(second.getActive()).toEqual(full.getActive());
    expect(second.applyTick(tick(3, 6000, 1)).ignored).toBe(true);
  });

  it('two intervals stay consistent with each other', () => {
    const ticks = [tick(1, 1000, 100, 2), tick(2, 7000, 110, 3), tick(3, 30000, 90, 1), tick(4, 61000, 95, 4)];
    const b = mk(['5s', '1m']);
    const all = ticks.flatMap((t) => b.applyTick(t).closed).concat(b.flush(10 ** 9));
    const m1 = all.filter((c) => c.interval === '1m');
    const s5 = all.filter((c) => c.interval === '5s');
    expect(m1).toHaveLength(2);
    expect(m1[0]).toMatchObject({ openTime: 0, open: 100, high: 110, low: 90, close: 90, volume: 6, tradeCount: 3 });
    expect(m1[1]).toMatchObject({ openTime: 60000, volume: 4 });
    expect(s5.reduce((n, c) => n + c.volume, 0)).toBe(m1.reduce((n, c) => n + c.volume, 0));
    expect(s5.reduce((n, c) => n + c.tradeCount, 0)).toBe(4);
  });

  it('is deterministic and returns copies', () => {
    const run = () => {
      const a = mk(['5s', '1m']);
      const out: unknown[] = [];
      for (let i = 1; i <= 50; i++) out.push(a.applyTick(tick(i, i * 777, 100 + (i % 7), 1 + (i % 3))));
      out.push(a.flush(10 ** 9));
      return out;
    };
    expect(run()).toEqual(run());

    const a = mk();
    const r = a.applyTick(tick(1, 1000, 100));
    r.updated[0]!.close = 12345;
    a.getActive()[0]!.high = 777;
    expect(a.getActive()[0]).toMatchObject({ close: 100, high: 100 });
  });

  it('rejects unknown intervals at construction', () => {
    expect(() => new CandleAggregator({ intervals: ['1h' as never], origin: 'ENGINE' })).toThrow();
  });
});
