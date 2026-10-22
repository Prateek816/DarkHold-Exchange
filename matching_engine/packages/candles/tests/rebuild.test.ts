import { describe, expect, it } from 'vitest';
import { CandleAggregator, rebuildActive, type Tick } from '../src';

const tick = (seq: number, ts: number, price: number, qty = 1): Tick => ({ seq, ts, price, qty });

describe('rebuildActive', () => {
  it('rebuilds the active candle from trades of the current bucket', () => {
    const trades = [tick(3, 6500, 99, 2), tick(2, 6000, 100, 1), tick(4, 7000, 103, 1)]; // unsorted on purpose
    const r = rebuildActive(trades, ['5s'], 'ENGINE');
    expect(r.lastSeq).toBe(4);
    expect(r.closed).toEqual([]);
    expect(r.active).toEqual([
      { interval: '5s', openTime: 5000, open: 100, high: 103, low: 99, close: 103, volume: 4, tradeCount: 3, origin: 'ENGINE' },
    ]);
  });

  it('skips buckets already persisted as closed, per interval', () => {
    const trades = [tick(1, 1000, 100), tick(2, 6000, 101), tick(3, 7000, 102)];
    const r = rebuildActive(trades, ['5s', '1m'], 'ENGINE', { '5s': 0 });
    const s5 = r.active.find((c) => c.interval === '5s')!;
    const m1 = r.active.find((c) => c.interval === '1m')!;
    expect(s5).toMatchObject({ openTime: 5000, open: 101, volume: 2 });
    expect(m1).toMatchObject({ openTime: 0, open: 100, volume: 3 });
  });

  it('result can be restored and continued like an uninterrupted run', () => {
    const trades = [tick(1, 1000, 100), tick(2, 2000, 110), tick(3, 6000, 90)];
    const r = rebuildActive(trades, ['5s'], 'SEEDED_SIM');
    const a = new CandleAggregator({ intervals: ['5s'], origin: 'SEEDED_SIM' });
    a.restore({ active: r.active, lastSeq: r.lastSeq });
    const next = a.applyTick(tick(4, 11000, 95));

    const full = new CandleAggregator({ intervals: ['5s'], origin: 'SEEDED_SIM' });
    const closedFull = [...trades, tick(4, 11000, 95)].flatMap((t) => full.applyTick(t).closed);
    expect([...r.closed, ...next.closed]).toEqual(closedFull);
    expect(a.getActive()).toEqual(full.getActive());
  });

  it('handles an empty trade list', () => {
    expect(rebuildActive([], ['5s', '1m'], 'ENGINE')).toEqual({ active: [], closed: [], lastSeq: 0 });
  });
});
