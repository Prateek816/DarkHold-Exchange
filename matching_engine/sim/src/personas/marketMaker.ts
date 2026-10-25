import { ceilToTick, floorToTick } from '../assets';
import { log } from '../log';
import type { TaskSpec } from '../scheduler';
import type { PersonaContext } from './base';

export class MarketMakerBot {
  private lastRef: number | null = null;
  private liveBidPrice: number | null = null;
  private liveAskPrice: number | null = null;
  private liveQuotesPlacedAt = 0;
  private skipSideNext: { BUY: boolean; SELL: boolean } = { BUY: false, SELL: false };

  constructor(
    readonly botKey: string,
    readonly asset: string,
    private readonly ctx: PersonaContext,
  ) {}

  nextDelayMs(): number {
    const jitter = this.ctx.rng.int(-this.ctx.params.marketMaker.refreshJitterMs, this.ctx.params.marketMaker.refreshJitterMs);
    return Math.max(this.ctx.params.minBotIntervalMs, this.ctx.params.marketMaker.refreshMs + jitter);
  }

  async tick(): Promise<void> {
    const own = this.ctx.own.forBot(this.botKey);
    await own.refreshIfDue(this.ctx.api);

    const info = this.ctx.catalog.get(this.asset);
    if (!info) return;

    const view = this.ctx.feed.getView(this.asset);
    // 1. ref = mid if both best bid and ask exist, else lastPrice, else seeded reference price
    let ref: number | null = null;
    if (view?.bestBid !== null && view?.bestBid !== undefined && view?.bestAsk !== null && view?.bestAsk !== undefined) {
      ref = (view.bestBid + view.bestAsk) / 2;
    } else if (view?.lastPrice !== null && view?.lastPrice !== undefined) {
      ref = view.lastPrice;
    } else if (view?.referencePrice !== null && view?.referencePrice !== undefined) {
      ref = view.referencePrice;
    } else {
      ref = info.faceValue;
    }
    if (!ref || ref <= 0) return;

    // 2. half = halfSpreadBps(asset) * regimeSpreadMultiplier / 10000
    const halfBps = this.ctx.params.marketMaker.halfSpreadBps[info.liquidity] ?? 100;
    const spreadMultiplier = this.ctx.regime.getSpreadMultiplier(this.asset);
    const half = (halfBps * spreadMultiplier) / 10000;

    // 3. skew = clamp((inventory - target) / maxInventory, -0.8, +0.8)
    const inventory = own.availableUnits(this.asset);
    const target = this.ctx.params.marketMaker.targetInventory;
    const maxInv = this.ctx.params.marketMaker.maxInventory;
    const rawSkew = (inventory - target) / maxInv;
    const clamp = this.ctx.params.marketMaker.skewClamp;
    const skew = Math.max(-clamp, Math.min(clamp, rawSkew));

    // 4. shift = 0.5 * half * skew
    const shift = 0.5 * half * skew;

    // 5. bid = floorToTick(ref * (1 - half - shift)), ask = ceilToTick(ref * (1 + half - shift))
    let bid = floorToTick(ref * (1 - half - shift), info.tickSize);
    let ask = ceilToTick(ref * (1 + half - shift), info.tickSize);

    // 6. Clamp: ask = min(ask, ceiling). bid = min(bid, ask - tick). bid = max(bid, tick).
    ask = Math.min(ask, info.ceiling);
    bid = Math.min(bid, ask - info.tickSize);
    bid = Math.max(bid, info.tickSize);
    if (ask - bid < info.tickSize) return;

    // 7. Quantities
    const baseQty = this.ctx.params.marketMaker.baseQty[info.liquidity] ?? 3;
    let bidQty = Math.max(1, Math.round(baseQty * (1 - skew)));
    let askQty = Math.max(1, Math.round(baseQty * (1 + skew)));
    bidQty = Math.min(bidQty, info.maxQty);
    askQty = Math.min(askQty, info.maxQty);

    // 8. Limit by resources
    const availableUnits = own.availableUnits(this.asset);
    askQty = Math.min(askQty, availableUnits);
    const availableCash = own.availableCash();
    bidQty = Math.min(bidQty, Math.floor(availableCash / bid));

    // Respect previous tick's INSUFFICIENT_* rejections
    if (this.skipSideNext.BUY) {
      bidQty = 0;
      this.skipSideNext.BUY = false;
    }
    if (this.skipSideNext.SELL) {
      askQty = 0;
      this.skipSideNext.SELL = false;
    }

    if (bidQty <= 0 && askQty <= 0) return;

    // 9. Requote rule
    const liveQuotes = own.list(this.asset).filter((o) => o.managedBy === 'marketMaker');
    const now = this.ctx.clock.now();
    if (liveQuotes.length > 0) {
      const quoteAge = now - this.liveQuotesPlacedAt;
      const ageSatisfied = quoteAge >= this.ctx.params.marketMaker.refreshMs;
      const priceDiffSatisfied =
        (this.liveBidPrice !== null && Math.abs(bid - this.liveBidPrice) >= info.tickSize) ||
        (this.liveAskPrice !== null && Math.abs(ask - this.liveAskPrice) >= info.tickSize);
      const refMovedSatisfied =
        this.lastRef !== null && Math.abs(ref - this.lastRef) >= this.ctx.params.marketMaker.requoteMoveFraction * half * ref;

      if (!ageSatisfied && !priceDiffSatisfied && !refMovedSatisfied) {
        return;
      }
    }

    // 10. Requote: cancel old quotes, then place new orders concurrently
    for (const q of liveQuotes) {
      try {
        await this.ctx.api.cancel(this.botKey, q.id);
        own.drop(q.id);
      } catch (err) {
        // If 409 ORDER_NOT_CANCELABLE or not found, drop locally
        own.drop(q.id);
      }
    }

    this.lastRef = ref;
    this.liveBidPrice = bidQty > 0 ? bid : null;
    this.liveAskPrice = askQty > 0 ? ask : null;
    this.liveQuotesPlacedAt = now;

    const ordersToPlace: Promise<void>[] = [];

    if (bidQty > 0) {
      ordersToPlace.push(
        (async () => {
          try {
            const placed = await this.ctx.api.placeLimit(this.botKey, {
              asset: this.asset,
              side: 'BUY',
              price: bid,
              qty: bidQty,
            });
            own.track({
              id: placed.orderId,
              asset: this.asset,
              side: 'BUY',
              price: bid,
              qty: bidQty,
              placedAt: now,
              ttlMs: null,
              managedBy: 'marketMaker',
            });
            own.adjustCash(-bid * bidQty);
          } catch (err: any) {
            log.warn({ err, bot: this.botKey, asset: this.asset, side: 'BUY' }, 'MM buy quote rejected');
            if (err?.code === 'INSUFFICIENT_FUNDS') {
              this.skipSideNext.BUY = true;
            }
          }
        })(),
      );
    }

    if (askQty > 0) {
      ordersToPlace.push(
        (async () => {
          try {
            const placed = await this.ctx.api.placeLimit(this.botKey, {
              asset: this.asset,
              side: 'SELL',
              price: ask,
              qty: askQty,
            });
            own.track({
              id: placed.orderId,
              asset: this.asset,
              side: 'SELL',
              price: ask,
              qty: askQty,
              placedAt: now,
              ttlMs: null,
              managedBy: 'marketMaker',
            });
            own.adjustUnits(this.asset, -askQty);
          } catch (err: any) {
            log.warn({ err, bot: this.botKey, asset: this.asset, side: 'SELL' }, 'MM sell quote rejected');
            if (err?.code === 'INSUFFICIENT_INVENTORY' || err?.code === 'INSUFFICIENT_UNITS') {
              this.skipSideNext.SELL = true;
            }
          }
        })(),
      );
    }

    await Promise.all(ordersToPlace);
  }
}

export function createMarketMakerTask(ctx: PersonaContext, botKey: string, asset: string): TaskSpec {
  const mm = new MarketMakerBot(botKey, asset, ctx);
  return {
    key: `mm:${botKey}:${asset}`,
    nextDelayMs: () => mm.nextDelayMs(),
    run: () => mm.tick(),
    cost: 2, // bid and ask quotes
  };
}
