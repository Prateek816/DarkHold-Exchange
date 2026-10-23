export interface HistoryProfile {
  /** Starting price as a ratio of face value. */
  startRatio: number;
  /** Mean-reversion target as a ratio of face value. */
  meanRatio: number;
  /** Volatility per trade as a fraction of price. */
  sigma: number;
  baseTradesPerMinute: number;
  qtyCap: number;
}

export const HISTORY_PROFILES: Record<string, HistoryProfile> = {
  'DFEST-WKND': { startRatio: 1.02, meanRatio: 1.05, sigma: 0.0015, baseTradesPerMinute: 12, qtyCap: 6 },
  'MOONRISE-GA': { startRatio: 1.0, meanRatio: 1.03, sigma: 0.002, baseTradesPerMinute: 5, qtyCap: 5 },
  'DFEST-HOODIE': { startRatio: 1.04, meanRatio: 1.06, sigma: 0.0025, baseTradesPerMinute: 4, qtyCap: 4 },
  'SIGIL-PIN': { startRatio: 1.0, meanRatio: 1.02, sigma: 0.004, baseTradesPerMinute: 0.6, qtyCap: 3 },
};
