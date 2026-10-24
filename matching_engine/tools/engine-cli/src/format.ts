// One-line rendering of SSE frames for `tail`.
import type { SseFrame } from './client.js';

export function formatFrame(f: SseFrame): string {
  if (f.comment !== undefined && f.event === undefined) return `: ${f.comment}`;
  let j: Record<string, unknown> = {};
  try {
    j = f.data ? (JSON.parse(f.data) as Record<string, unknown>) : {};
  } catch {
    return `${f.event ?? '?'} ${f.data ?? ''}`;
  }
  switch (f.event) {
    case 'hello': {
      const assets = Array.isArray(j.assets) ? (j.assets as { asset: string; status: string }[]).map((a) => `${a.asset}:${a.status}`).join(',') : '';
      return `hello epoch=${j.engine_epoch} seq=${j.current_seq} ring_start=${j.ring_start_seq} assets=[${assets}]`;
    }
    case 'book': {
      const bids = Array.isArray(j.bids) ? j.bids.length : 0;
      const asks = Array.isArray(j.asks) ? j.asks.length : 0;
      return `book ${j.asset} as_of=${j.as_of_seq} bid=${j.best_bid ?? '-'} ask=${j.best_ask ?? '-'} levels=${bids}/${asks}`;
    }
    case 'gone':
      return `gone ring_start_seq=${j.ring_start_seq}`;
    case 'TradeExecuted':
      return `#${j.seq} TradeExecuted ${j.asset} ${j.qty}@${j.price} taker=${j.taker_side} buy=${j.buy_user_id} sell=${j.sell_user_id} id=${j.trade_id}`;
    case 'OrderAccepted':
      return `#${j.seq} OrderAccepted ${j.asset} ${j.side} ${j.order_type}/${j.tif} ${j.qty}@${j.price} user=${j.user_id} order=${j.order_id}`;
    case 'OrderRejected':
      return `#${j.seq} OrderRejected ${j.asset} code=${j.code} order=${j.order_id}`;
    case 'OrderCanceled':
      return `#${j.seq} OrderCanceled ${j.asset} reason=${j.reason} filled=${j.filled_qty} remaining=${j.remaining_qty} order=${j.order_id}`;
    case 'OrderFilled':
      return `#${j.seq} OrderFilled ${j.asset} filled=${j.filled_qty} order=${j.order_id}`;
    case 'OrderPartiallyFilled':
      return `#${j.seq} OrderPartiallyFilled ${j.asset} filled=${j.filled_qty} remaining=${j.remaining_qty} order=${j.order_id}`;
    default:
      return `#${j.seq ?? f.id ?? '?'} ${f.event ?? '?'} ${j.asset ?? ''}`.trimEnd();
  }
}
