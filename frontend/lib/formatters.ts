// Price is stored in minor units (cents). $120.00 → 12000
export const fmt = {
  price: (cents: number) =>
    (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }),

  priceNum: (cents: number) =>
    (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),

  qty: (n: number) => n.toLocaleString('en-US'),

  pct: (n: number) => {
    const sign = n >= 0 ? '+' : '';
    return `${sign}${n.toFixed(1)}%`;
  },

  pctAbs: (n: number) => `${n.toFixed(1)}%`,

  time: (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  },

  timeShort: (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  },

  date: (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  /** Human-readable data age: "3m ago", "just now" etc */
  age: (ts: number) => {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 10) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ago`;
  },

  /** Countdown: "2:34" */
  countdown: (endsAt: number) => {
    const sec = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  },

  /** Short ID e.g. "ord-a1b2c3" → "a1b2c3" */
  shortId: (id: string) => id.split('-').slice(-1)[0] ?? id,
};

// Aliases for compatibility
export const formatCurrency = fmt.price;
export const formatPercent = fmt.pct;
export const formatQuantity = fmt.qty;
export const formatTime = fmt.time;
export const formatDate = fmt.date;

/** Error code → user-facing message (may include {placeholders}) */
export const ERROR_MAP: Record<string, string> = {
  VALIDATION_FAILED:    'Please check your input.',
  UNAUTHENTICATED:      'Please sign in again.',
  FORBIDDEN:            'You do not have access to this action.',
  RATE_LIMITED:         'Too many requests. Try again in {n} seconds.',
  INSUFFICIENT_FUNDS:   'You need {needed} but have {available} available.',
  INSUFFICIENT_HOLDINGS:'You have {available} units available.',
  PRICE_ABOVE_CEILING:  'Resale cap is {ceiling} ({pct}% of face value {face}).',
  ASSET_NOT_TRADABLE:   'Trading is halted for this asset.',
  HOLDING_CAP_EXCEEDED: 'Limit of {cap} units per account for this asset.',
  MAX_OPEN_ORDERS:      'You have reached the open-order limit ({n}).',
  SELF_TRADE_PREVENTED: 'This order would trade against your own order.',
  NO_LIQUIDITY:         'No liquidity within your price limit.',
  ORDER_NOT_CANCELABLE: 'This order is already filled or completed.',
  ENGINE_BUSY:          'The market is busy. Retrying shortly.',
  ENGINE_UNAVAILABLE:   'Trading is temporarily unavailable.',
  AUCTION_NOT_ACTIVE:   'This auction has ended.',
  AUCTION_ALREADY_SOLD: 'Another buyer accepted just before you.',
  PRICE_MOVED:          'The price changed. Review and try again.',
  IDEMPOTENCY_CONFLICT: 'This request conflicts with an earlier one. Refresh and try again.',
};

export function mapError(code: string, params?: Record<string, string>): string {
  let msg = ERROR_MAP[code] ?? `Something went wrong. Reference {request_id}.`;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, v);
    }
  }
  return msg;
}
