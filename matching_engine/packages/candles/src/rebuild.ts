import { CandleAggregator } from './aggregator';
import { bucketStart } from './bucket';
import { intervalMs } from './intervals';
import type { Candle, CandleOrigin, IntervalName, Tick } from './types';

export interface RebuildResult {
  /** Active candle per interval, ready for `CandleAggregator.restore`. */
  active: Candle[];
  /** Candles that closed during the replay and fall after the last persisted close. */
  closed: Candle[];
  /** Highest seq among the supplied trades (0 if none). */
  lastSeq: number;
}

/**
 * Rebuild active candles after a restart from trade rows.
 * `lastClosedOpenTimes` holds, per interval, the open time of the newest candle already persisted as closed;
 * trades that fall in or before that bucket are skipped for that interval.
 */
export function rebuildActive(
  trades: Tick[],
  intervals: IntervalName[],
  origin: CandleOrigin,
  lastClosedOpenTimes: Partial<Record<IntervalName, number>> = {},
): RebuildResult {
  const sorted = [...trades].sort((a, b) => a.seq - b.seq);
  // One single-interval aggregator per interval so each can skip its already-persisted buckets independently.
  const parts = [...new Set(intervals)].map((name) => ({
    ms: intervalMs(name),
    skipUpTo: lastClosedOpenTimes[name],
    agg: new CandleAggregator({ intervals: [name], origin }),
  }));

  const closed: Candle[] = [];
  for (const t of sorted) {
    for (const p of parts) {
      if (p.skipUpTo !== undefined && bucketStart(t.ts, p.ms) <= p.skipUpTo) continue;
      closed.push(...p.agg.applyTick(t).closed);
    }
  }

  const active: Candle[] = [];
  for (const p of parts) active.push(...p.agg.getActive());

  const last = sorted[sorted.length - 1];
  return { active, closed, lastSeq: last === undefined ? 0 : last.seq };
}
