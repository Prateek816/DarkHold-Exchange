import { ceilToTick, floorToTick, roundToTick } from '../assets';
import { log } from '../log';
import type { TaskSpec } from '../scheduler';
import type { PersonaContext } from './base';

export class NoiseTraderStream {
  constructor(
    readonly asset: string,
    private readonly ctx: PersonaContext,
  ) {}

  nextDelayMs(): number {
    const info = this.ctx.catalog.get(this.asset);
    if (!info) return 2000;
    const baseRate = this.ctx.params.noise.ratePerSec[info.liquidity] ?? 1.5;
    const arrivalMult = this.ctx.regime.getArrivalMultiplier(this.asset);
    const rate = Math.max(0.01, baseRate * arrivalMult);
    const meanMs = 1000 / rate;
    const delay = Math.round(this.ctx.rng.exponential(meanMs));
    return Math.max(this.ctx.params.minBotIntervalMs, delay);
  }

  async tick(): Promise<void> {
    const info = this.ctx.catalog.get(this.asset);
    if (!info) return;

    const noiseBots = this.ctx.accounts.list({ role: 'noise' });
    if (noiseBots.length === 0) return;

    // 1. Pick a random noise bot (uniform) and side (uniform)
    const bot = this.ctx.rng.pick(noiseBots);
    const side: 'BUY' | 'SELL' = this.ctx.rng.next() < 0.5 ? 'BUY' : 'SELL';

    const own = this.ctx.own.forBot(bot.key);
    await own.refreshIfDue(this.ctx.api);

    const view = this.ctx.feed.getView(this.asset);
    const mid = view?.mid ?? view?.lastPrice ?? view?.referencePrice ?? info.faceValue;
    if (!mid || mid <= 0) return;

    const oppositeLiquidity = side === 'BUY' ? view?.bestAsk : view?.bestBid;
    const isMarketable =
      this.ctx.rng.next() < this.ctx.params.noise.pMarketable &&
      oppositeLiquidity !== null &&
      oppositeLiquidity !== undefined;

    // 2. Quantity calculation
    const rawQty = Math.round(this.ctx.rng.lognormal(this.ctx.params.noise.qtyLognormal.mu, this.ctx.params.noise.qtyLognormal.sigma));
    let qty = Math.max(this.ctx.params.noise.qtyMin, Math.min(this.ctx.params.noise.qtyMax, rawQty));
    qty = Math.max(info.minQty, Math.min(info.maxQty, qty));

    const now = this.ctx.clock.now();

    if (isMarketable) {
      // Market order
      let protection: number;
      if (side === 'BUY') {
        const bestOpposite = view!.bestAsk!;
        protection = Math.min(info.ceiling, roundToTick(bestOpposite * (1 + this.ctx.params.noise.protectionBand), info.tickSize));
        protection = Math.max(protection, info.tickSize);
      } else {
        const bestOpposite = view!.bestBid!;
        protection = Math.max(info.tickSize, roundToTick(bestOpposite * (1 - this.ctx.params.noise.protectionBand), info.tickSize));
        protection = Math.min(protection, info.ceiling);
      }

      // Check resource constraints
      if (side === 'BUY') {
        const availableCash = own.availableCash();
        const maxAffordable = Math.floor(availableCash / protection);
        qty = Math.min(qty, maxAffordable);
      } else {
        const availableUnits = own.availableUnits(this.asset);
        qty = Math.min(qty, availableUnits);
      }

      if (qty < info.minQty || qty <= 0) return;

      try {
        await this.ctx.api.placeMarket(bot.key, {
          asset: this.asset,
          side,
          qty,
          protectionPrice: protection,
        });
        if (side === 'BUY') {
          own.adjustCash(-protection * qty);
        } else {
          own.adjustUnits(this.asset, -qty);
        }
      } catch (err) {
        log.warn({ err, bot: bot.key, asset: this.asset, side }, 'noise market order rejected');
      }
    } else {
      // Limit order
      const halfBps = this.ctx.params.marketMaker.halfSpreadBps[info.liquidity] ?? 100;
      const spreadMultiplier = this.ctx.regime.getSpreadMultiplier(this.asset);
      const halfSpread = (halfBps * spreadMultiplier) / 10000;

      const offset = Math.max(
        info.tickSize,
        this.ctx.rng.exponential(this.ctx.params.noise.offsetMeanHalfSpreadMultiple * halfSpread * mid),
      );

      let price: number;
      if (side === 'BUY') {
        price = floorToTick(mid - offset, info.tickSize);
      } else {
        price = ceilToTick(mid + offset, info.tickSize);
      }
      price = Math.max(info.tickSize, Math.min(info.ceiling, price));

      // Check resource constraints
      if (side === 'BUY') {
        const availableCash = own.availableCash();
        const maxAffordable = Math.floor(availableCash / price);
        qty = Math.min(qty, maxAffordable);
      } else {
        const availableUnits = own.availableUnits(this.asset);
        qty = Math.min(qty, availableUnits);
      }

      if (qty < info.minQty || qty <= 0) return;

      try {
        const placed = await this.ctx.api.placeLimit(bot.key, {
          asset: this.asset,
          side,
          price,
          qty,
        });

        const ttlMs = this.ctx.rng.int(this.ctx.params.canceler.ttlMinMs, this.ctx.params.canceler.ttlMaxMs);
        own.track({
          id: placed.orderId,
          asset: this.asset,
          side,
          price,
          qty,
          placedAt: now,
          ttlMs,
          managedBy: 'noise',
        });

        if (side === 'BUY') {
          own.adjustCash(-price * qty);
        } else {
          own.adjustUnits(this.asset, -qty);
        }
      } catch (err) {
        log.warn({ err, bot: bot.key, asset: this.asset, side }, 'noise limit order rejected');
      }
    }
  }
}

export function createNoiseTraderTask(ctx: PersonaContext, asset: string): TaskSpec {
  const stream = new NoiseTraderStream(asset, ctx);
  return {
    key: `noise:${asset}`,
    nextDelayMs: () => stream.nextDelayMs(),
    run: () => stream.tick(),
    cost: 1,
  };
}
