import { roundToTick } from '../assets';
import { log } from '../log';
import type { TaskSpec } from '../scheduler';
import type { PersonaContext } from './base';

export class MomentumTraderBot {
  private cooldownUntil = 0;

  constructor(
    readonly botKey: string,
    readonly asset: string,
    private readonly ctx: PersonaContext,
  ) {}

  nextDelayMs(): number {
    return this.ctx.params.momentum.evalMs;
  }

  async tick(): Promise<void> {
    const now = this.ctx.clock.now();
    if (now < this.cooldownUntil) return;

    const info = this.ctx.catalog.get(this.asset);
    if (!info) return;

    const view = this.ctx.feed.getView(this.asset);
    if (!view || !view.recentTrades || view.recentTrades.length === 0) return;

    // Filter trades in window: last 30s and up to 20 trades
    const windowStart = now - this.ctx.params.momentum.windowMs;
    const trades = view.recentTrades
      .filter((t) => t.ts >= windowStart)
      .slice(-this.ctx.params.momentum.windowTrades);

    if (trades.length < this.ctx.params.momentum.minTrades) return;

    let buyTakerQty = 0;
    let sellTakerQty = 0;
    for (const t of trades) {
      if (t.takerSide === 'BUY') {
        buyTakerQty += t.qty;
      } else {
        sellTakerQty += t.qty;
      }
    }

    const totalQty = buyTakerQty + sellTakerQty;
    if (totalQty === 0) return;

    const imbalance = (buyTakerQty - sellTakerQty) / totalQty;
    if (Math.abs(imbalance) < this.ctx.params.momentum.imbalanceThreshold) return;

    const side: 'BUY' | 'SELL' = imbalance > 0 ? 'BUY' : 'SELL';
    const oppositePrice = side === 'BUY' ? view.bestAsk : view.bestBid;
    if (oppositePrice === null || oppositePrice === undefined) return;

    let protectionPrice: number;
    if (side === 'BUY') {
      protectionPrice = Math.min(
        info.ceiling,
        roundToTick(oppositePrice * (1 + this.ctx.params.momentum.protectionBand), info.tickSize),
      );
      protectionPrice = Math.max(protectionPrice, info.tickSize);
    } else {
      protectionPrice = Math.max(
        info.tickSize,
        roundToTick(oppositePrice * (1 - this.ctx.params.momentum.protectionBand), info.tickSize),
      );
      protectionPrice = Math.min(protectionPrice, info.ceiling);
    }

    const own = this.ctx.own.forBot(this.botKey);
    await own.refreshIfDue(this.ctx.api);

    let qty = this.ctx.rng.int(this.ctx.params.momentum.qtyMin, this.ctx.params.momentum.qtyMax);
    qty = Math.max(info.minQty, Math.min(info.maxQty, qty));

    if (side === 'BUY') {
      const availableCash = own.availableCash();
      const maxAffordable = Math.floor(availableCash / protectionPrice);
      qty = Math.min(qty, maxAffordable);
    } else {
      const availableUnits = own.availableUnits(this.asset);
      qty = Math.min(qty, availableUnits);
    }

    if (qty < info.minQty || qty <= 0) return;

    try {
      await this.ctx.api.placeMarket(this.botKey, {
        asset: this.asset,
        side,
        qty,
        protectionPrice,
      });

      if (side === 'BUY') {
        own.adjustCash(-protectionPrice * qty);
      } else {
        own.adjustUnits(this.asset, -qty);
      }

      this.cooldownUntil = now + this.ctx.params.momentum.cooldownMs;
    } catch (err) {
      log.warn({ err, bot: this.botKey, asset: this.asset, side }, 'momentum market order rejected');
    }
  }
}

export function createMomentumTraderTask(ctx: PersonaContext, botKey: string, asset: string): TaskSpec {
  const bot = new MomentumTraderBot(botKey, asset, ctx);
  return {
    key: `momentum:${botKey}:${asset}`,
    nextDelayMs: () => bot.nextDelayMs(),
    run: () => bot.tick(),
    cost: 1,
  };
}
