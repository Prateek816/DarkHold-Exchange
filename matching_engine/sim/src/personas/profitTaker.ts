import { ceilToTick } from '../assets';
import { log } from '../log';
import type { TaskSpec } from '../scheduler';
import type { PersonaContext } from './base';

export class ProfitTakerBot {
  constructor(
    readonly botKey: string,
    readonly asset: string,
    private readonly ctx: PersonaContext,
  ) {}

  nextDelayMs(): number {
    return this.ctx.params.profitTaker.evalMs;
  }

  async tick(): Promise<void> {
    const own = this.ctx.own.forBot(this.botKey);
    await own.refreshIfDue(this.ctx.api);

    const available = own.availableUnits(this.asset);
    if (available <= 0) return;

    // Must have no open sell
    const hasOpenSell = own.list(this.asset).some((o) => o.side === 'SELL');
    if (hasOpenSell) return;

    const info = this.ctx.catalog.get(this.asset);
    if (!info) return;

    const view = this.ctx.feed.getView(this.asset);
    const lastPrice = view?.lastPrice ?? view?.referencePrice;
    if (lastPrice === null || lastPrice === undefined) return;

    const costBasis = own.costBasis(this.asset) ?? view?.referencePrice ?? info.faceValue;
    const target = costBasis * (1 + this.ctx.params.profitTaker.targetGainBps / 10000);

    if (lastPrice >= target) {
      const price = Math.min(info.ceiling, ceilToTick(Math.max(lastPrice, target), info.tickSize));
      let qty = Math.min(available, this.ctx.params.profitTaker.maxQty);
      qty = Math.max(info.minQty, Math.min(info.maxQty, qty));

      if (qty < info.minQty || qty <= 0) return;

      try {
        const placed = await this.ctx.api.placeLimit(this.botKey, {
          asset: this.asset,
          side: 'SELL',
          price,
          qty,
        });

        const now = this.ctx.clock.now();
        own.track({
          id: placed.orderId,
          asset: this.asset,
          side: 'SELL',
          price,
          qty,
          placedAt: now,
          ttlMs: this.ctx.params.profitTaker.ttlMs,
          managedBy: 'profitTaker',
        });

        own.adjustUnits(this.asset, -qty);
      } catch (err) {
        log.warn({ err, bot: this.botKey, asset: this.asset }, 'profit taker sell order rejected');
      }
    }
  }
}

export function createProfitTakerTask(ctx: PersonaContext, botKey: string, asset: string): TaskSpec {
  const bot = new ProfitTakerBot(botKey, asset, ctx);
  return {
    key: `profit:${botKey}:${asset}`,
    nextDelayMs: () => bot.nextDelayMs(),
    run: () => bot.tick(),
    cost: 1,
  };
}
