import type { Tick } from '@darkhold/candles';
import type { Rng } from '../rng';
import type { HistoryProfile } from './profiles';

export interface AssetSpec {
  symbol: string;
  faceValue: number;
  ceiling: number;
  tickSize: number;
}

type HistRegime = 'QUIET' | 'NORMAL' | 'BUSY';
const REGIME_MULT: Record<HistRegime, number> = { QUIET: 0.15, NORMAL: 1, BUSY: 2.5 };

function nextRegime(current: HistRegime, rng: Rng): HistRegime {
  const r = rng.next();
  if (current === 'QUIET') return r < 0.8 ? 'QUIET' : 'NORMAL';
  if (current === 'NORMAL') return r < 0.7 ? 'NORMAL' : r < 0.85 ? 'QUIET' : 'BUSY';
  return r < 0.6 ? 'BUSY' : 'NORMAL';
}

export function roundToTickInt(price: number, tick: number): number {
  return Math.round(price / tick) * tick;
}

export interface GeneratedHistory {
  ticks: Tick[];
  /** Price of the final trade, or null if the asset never traded in the window. */
  lastPrice: number | null;
}

/** Simulates 1-second steps over [startMs, endMs). Pure function of its inputs. */
export function generateTicks(
  spec: AssetSpec,
  profile: HistoryProfile,
  rng: Rng,
  startMs: number,
  endMs: number,
): GeneratedHistory {
  const tick = spec.tickSize;
  const ceilingTick = Math.floor(spec.ceiling / tick) * tick;
  const clampPrice = (p: number): number => Math.min(ceilingTick, Math.max(tick, p));
  const mean = profile.meanRatio * spec.faceValue;

  let price = clampPrice(profile.startRatio * spec.faceValue);
  let regime: HistRegime = 'NORMAL';
  let seq = 0;
  let lastPrice: number | null = null;
  const ticks: Tick[] = [];

  const totalSeconds = Math.floor((endMs - startMs) / 1000);
  for (let i = 0; i < totalSeconds; i++) {
    if (i > 0 && i % 60 === 0) regime = nextRegime(regime, rng);
    const lambda = (profile.baseTradesPerMinute / 60) * REGIME_MULT[regime];
    const n = rng.poisson(lambda);
    if (n === 0) continue;

    const offsets: number[] = [];
    for (let k = 0; k < n; k++) offsets.push(rng.int(0, 999));
    offsets.sort((a, b) => a - b);

    for (const off of offsets) {
      price = clampPrice(price + 0.01 * (mean - price) + profile.sigma * price * rng.normal());
      const tradePrice = clampPrice(roundToTickInt(price, tick));
      const qty = Math.min(profile.qtyCap, Math.max(1, 1 + Math.round(rng.lognormal(0, 0.7))));
      seq += 1;
      ticks.push({ seq, ts: startMs + i * 1000 + off, price: tradePrice, qty });
      lastPrice = tradePrice;
    }
  }
  return { ticks, lastPrice };
}
