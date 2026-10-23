import { bucketStart } from './bucket';
import { intervalMs } from './intervals';
import type { AggregatorOptions, ApplyResult, Candle, CandleOrigin, IntervalName, RestoreState, Tick } from './types';

function copy(c: Candle): Candle {
  return { ...c };
}

function checkTick(t: Tick): void {
  if (!Number.isFinite(t.seq) || !Number.isFinite(t.ts) || !Number.isFinite(t.price) || !Number.isFinite(t.qty)) {
    throw new RangeError('tick fields must be finite numbers');
  }
}

/** One aggregator per asset. Pure and deterministic: no timers, no I/O. */
export class CandleAggregator {
  private readonly intervals: IntervalName[];
  private readonly origin: CandleOrigin;
  private readonly active = new Map<IntervalName, Candle>();
  private readonly lastClosedOpen = new Map<IntervalName, number>();
  private lastSeq = 0;

  constructor(opts: AggregatorOptions) {
    const seen = new Set<IntervalName>();
    for (const name of opts.intervals) {
      intervalMs(name); // throws on unknown names
      seen.add(name);
    }
    this.intervals = [...seen];
    this.origin = opts.origin;
  }

  applyTick(tick: Tick): ApplyResult {
    checkTick(tick);
    if (tick.seq <= this.lastSeq) {
      return { updated: [], closed: [], ignored: true };
    }
    this.lastSeq = tick.seq;

    const updated: Candle[] = [];
    const closed: Candle[] = [];

    for (const name of this.intervals) {
      const ms = intervalMs(name);
      const start = bucketStart(tick.ts, ms);
      const cur = this.active.get(name);

      if (cur === undefined) {
        const lastClosed = this.lastClosedOpen.get(name);
        if (lastClosed !== undefined && start <= lastClosed) {
          // That bucket was already emitted as closed. Never reopen it or create an older candle.
          continue;
        }
        const fresh = this.newCandle(name, start, tick);
        this.active.set(name, fresh);
        updated.push(copy(fresh));
        continue;
      }

      if (start > cur.openTime) {
        closed.push(copy(cur));
        this.lastClosedOpen.set(name, cur.openTime);
        const fresh = this.newCandle(name, start, tick);
        this.active.set(name, fresh);
        updated.push(copy(fresh));
        continue;
      }

      // Same bucket, or a timestamp regression (start < openTime): clamp into the active bucket.
      cur.high = Math.max(cur.high, tick.price);
      cur.low = Math.min(cur.low, tick.price);
      cur.close = tick.price;
      cur.volume += tick.qty;
      cur.tradeCount += 1;
      updated.push(copy(cur));
    }

    return { updated, closed, ignored: false };
  }

  /** Close active candles whose bucket has ended. Never invents candles for empty buckets. */
  flush(nowMs: number): Candle[] {
    const closed: Candle[] = [];
    for (const name of this.intervals) {
      const cur = this.active.get(name);
      if (cur !== undefined && nowMs >= cur.openTime + intervalMs(name)) {
        closed.push(copy(cur));
        this.lastClosedOpen.set(name, cur.openTime);
        this.active.delete(name);
      }
    }
    return closed;
  }

  getActive(): Candle[] {
    const out: Candle[] = [];
    for (const name of this.intervals) {
      const cur = this.active.get(name);
      if (cur !== undefined) out.push(copy(cur));
    }
    return out;
  }

  restore(state: RestoreState): void {
    this.active.clear();
    this.lastClosedOpen.clear();
    for (const c of state.active) {
      if (this.intervals.includes(c.interval)) this.active.set(c.interval, copy(c));
    }
    if (state.lastClosedOpenTimes !== undefined) {
      for (const name of this.intervals) {
        const v = state.lastClosedOpenTimes[name];
        if (v !== undefined) this.lastClosedOpen.set(name, v);
      }
    }
    this.lastSeq = state.lastSeq;
  }

  private newCandle(interval: IntervalName, openTime: number, t: Tick): Candle {
    return {
      interval,
      openTime,
      open: t.price,
      high: t.price,
      low: t.price,
      close: t.price,
      volume: t.qty,
      tradeCount: 1,
      origin: this.origin,
    };
  }
}
