export type IntervalName = '5s' | '1m';
export type CandleOrigin = 'ENGINE' | 'SEEDED_SIM';

/** One executed trade. `seq` is the engine event seq (or a historical seq for seeded data). */
export interface Tick {
  seq: number;
  ts: number;
  price: number;
  qty: number;
}

export interface Candle {
  interval: IntervalName;
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number;
  origin: CandleOrigin;
}

export interface ApplyResult {
  updated: Candle[];
  closed: Candle[];
  ignored: boolean;
}

export interface AggregatorOptions {
  intervals: IntervalName[];
  origin: CandleOrigin;
}

export interface RestoreState {
  active: Candle[];
  lastSeq: number;
  /** Optional: open time of the most recently closed candle per interval, so a closed bucket is never reopened. */
  lastClosedOpenTimes?: Partial<Record<IntervalName, number>>;
}
