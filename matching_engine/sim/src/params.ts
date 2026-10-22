// All tunable simulator constants live here (plan section 8.4). Nothing else hard-codes them.
export type RegimeName = 'CALM' | 'ACTIVE' | 'VOLATILE';
export type LiquidityName = 'HIGH' | 'MEDIUM' | 'THIN';

export const PARAMS = {
  globalRps: { demo: 40, continuous: 150 },
  minBotIntervalMs: 250,
  schedulerRetryDelayMs: 50,

  regimes: {
    CALM: { arrival: 0.4, spread: 1.0 },
    ACTIVE: { arrival: 1.0, spread: 1.0 },
    VOLATILE: { arrival: 2.5, spread: 1.8 },
  },
  regimeChange: {
    minSec: 60,
    maxSec: 180,
    // From ACTIVE is pinned by the plan. CALM and VOLATILE rows are decisions recorded in DECISIONS.md.
    transitions: {
      ACTIVE: { ACTIVE: 0.6, CALM: 0.25, VOLATILE: 0.15 },
      CALM: { CALM: 0.5, ACTIVE: 0.5, VOLATILE: 0 },
      VOLATILE: { VOLATILE: 0.4, ACTIVE: 0.6, CALM: 0 },
    },
  },

  noise: {
    ratePerSec: { HIGH: 4.0, MEDIUM: 1.5, THIN: 0.15 },
    pMarketable: 0.35,
    offsetMeanHalfSpreadMultiple: 1.5,
    qtyLognormal: { mu: 0.4, sigma: 0.6 },
    qtyMin: 1,
    qtyMax: 5,
    protectionBand: 0.02,
  },

  marketMaker: {
    halfSpreadBps: { HIGH: 60, MEDIUM: 100, THIN: 200 },
    baseQty: { HIGH: 4, MEDIUM: 3, THIN: 2 },
    refreshMs: 3000,
    refreshJitterMs: 1000,
    targetInventory: 100,
    maxInventory: 200,
    skewClamp: 0.8,
    requoteMoveFraction: 0.3,
  },

  momentum: {
    evalMs: 2000,
    windowTrades: 20,
    windowMs: 30000,
    minTrades: 8,
    imbalanceThreshold: 0.4,
    cooldownMs: 10000,
    qtyMin: 1,
    qtyMax: 3,
    protectionBand: 0.015,
  },

  profitTaker: {
    evalMs: 5000,
    targetGainBps: 500,
    maxQty: 2,
    ttlMs: 60000,
  },

  canceler: {
    scanMs: 1000,
    ttlMinMs: 5000,
    ttlMaxMs: 60000,
    maxCancelsPerScan: 5,
  },

  ownState: {
    balanceRefreshMs: 10000,
    reconcileMs: 15000,
    reconcileJitterMs: 3000,
    reconcileGraceMs: 5000,
  },

  marketFeed: {
    recentTradesCap: 200,
    reconnectBaseMs: 500,
    reconnectMaxMs: 10000,
    pollMs: 2000,
  },

  assetsRefreshMs: 60000,
  api: { retryDelaysMs: [200, 600], timeoutMs: 10000, bookDepth: 15 },
} as const;
