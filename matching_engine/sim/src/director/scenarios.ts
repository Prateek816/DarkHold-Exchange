import { ceilToTick, floorToTick, roundToTick } from '../assets';
import { log } from '../log';
import { MarketMakerBot } from '../personas/marketMaker';
import type { PersonaContext } from '../personas/base';
import type { Scheduler } from '../scheduler';

export interface ScenarioRuntimeContext {
  ctx: PersonaContext;
  scheduler: Scheduler;
}

export interface ScenarioDefinition {
  name: string;
  run(rt: ScenarioRuntimeContext, params?: any): Promise<any>;
}

export const SCENARIOS: Record<string, ScenarioDefinition> = {
  wakeMarket: {
    name: 'wakeMarket',
    async run({ ctx, scheduler }, params?: { assets?: string[] }) {
      log.info('Running scenario: wakeMarket');
      const tradable = ctx.catalog.tradable();
      const assets = params?.assets && params.assets.length > 0
        ? params.assets
        : tradable.map((a) => a.asset);

      const mmBots = ctx.accounts.list({ role: 'market_maker' });

      // 1. Ensure logins for MM bots
      for (const bot of mmBots) {
        try {
          await ctx.accounts.login(bot.key);
        } catch (err) {
          log.warn({ err, bot: bot.key }, 'wakeMarket: failed to login MM bot');
        }
      }

      // 2. Immediately run one market maker tick for each MM bot so an opening book exists
      for (const asset of assets) {
        for (const bot of mmBots) {
          if (bot.quotes.includes(asset)) {
            const mm = new MarketMakerBot(bot.key, asset, ctx);
            try {
              await mm.tick();
            } catch (err) {
              log.warn({ err, bot: bot.key, asset }, 'wakeMarket: MM tick error');
            }
          }
        }
      }

      // 3. Resume scheduler
      scheduler.resume();

      // Collect resulting book state
      const assetResults = assets.map((asset) => {
        const view = ctx.feed.getView(asset);
        return {
          asset,
          bestBid: view?.bestBid ?? null,
          bestAsk: view?.bestAsk ?? null,
        };
      });

      return {
        started: true,
        assets: assetResults,
      };
    },
  },

  sellWall: {
    name: 'sellWall',
    async run({ ctx }, params?: { asset?: string; qty?: number; price?: number }) {
      log.info({ params }, 'Running scenario: sellWall');
      const asset = params?.asset ?? 'DFEST-WKND';
      const qty = params?.qty ?? 20;

      const info = ctx.catalog.get(asset);
      if (!info) throw new Error(`Unknown asset: ${asset}`);

      // Ensure demo-seller is logged in
      const sellerKey = 'demo-seller';
      await ctx.accounts.login(sellerKey);

      let price = params?.price;
      if (price === undefined) {
        const view = ctx.feed.getView(asset);
        const ref = view?.bestAsk ?? view?.lastPrice ?? view?.referencePrice ?? info.faceValue;
        price = ceilToTick(ref, info.tickSize);
      }
      price = Math.min(info.ceiling, Math.max(info.tickSize, price));

      const placed = await ctx.api.placeLimit(sellerKey, {
        asset,
        side: 'SELL',
        price,
        qty,
      });

      // Poll until the order is open (max 5 s)
      const start = ctx.clock.now();
      let isOpen = false;
      while (ctx.clock.now() - start < 5000) {
        try {
          const openOrders = await ctx.api.getOpenOrders(sellerKey);
          if (openOrders.some((o) => o.orderId === placed.orderId)) {
            isOpen = true;
            break;
          }
        } catch {
          // ignore transient poll error
        }
        await new Promise((resolve) => ctx.clock.setTimeout(() => resolve(undefined), 200));
      }

      return {
        orderId: placed.orderId,
        price,
        qty,
        isOpen,
        judgeHint: { buyAtOrAbove: price, maxQty: qty },
      };
    },
  },

  pump: {
    name: 'pump',
    async run({ ctx }, params?: { asset?: string; durationSec?: number; intensity?: number }) {
      log.info({ params }, 'Running scenario: pump');
      const asset = params?.asset ?? 'DFEST-WKND';
      const durationSec = params?.durationSec ?? 20;
      const intensity = Math.max(0.1, params?.intensity ?? 1);

      const info = ctx.catalog.get(asset);
      if (!info) throw new Error(`Unknown asset: ${asset}`);

      const pumpBots = ['pump-1', 'pump-2', 'pump-3'];
      for (const key of pumpBots) {
        try {
          await ctx.accounts.login(key);
        } catch (err) {
          log.warn({ err, bot: key }, 'pump scenario: bot login failed');
        }
      }

      const initialView = ctx.feed.getView(asset);
      const startPrice = initialView?.lastPrice ?? initialView?.mid ?? info.faceValue;

      const intervalMs = Math.round(1500 / intensity);
      const endTime = ctx.clock.now() + durationSec * 1000;
      let botIdx = 0;
      let tradesSent = 0;

      while (ctx.clock.now() < endTime) {
        const botKey = pumpBots[botIdx % pumpBots.length]!;
        botIdx++;

        const currentView = ctx.feed.getView(asset);
        const bestAsk = currentView?.bestAsk ?? currentView?.lastPrice ?? info.faceValue;
        const protectionPrice = Math.min(
          info.ceiling,
          roundToTick(bestAsk * 1.02, info.tickSize),
        );
        const qty = ctx.rng.int(1, 3);

        try {
          await ctx.api.placeMarket(botKey, {
            asset,
            side: 'BUY',
            qty,
            protectionPrice,
          });
          tradesSent++;
        } catch (err) {
          log.warn({ err, bot: botKey, asset }, 'pump buy failed');
        }

        await new Promise((resolve) => ctx.clock.setTimeout(() => resolve(undefined), intervalMs));
      }

      const finalView = ctx.feed.getView(asset);
      const endPrice = finalView?.lastPrice ?? finalView?.mid ?? startPrice;

      return {
        trades: tradesSent,
        startPrice,
        endPrice,
      };
    },
  },

  scalperAttempt: {
    name: 'scalperAttempt',
    async run({ ctx }, params?: { asset?: string; multiplier?: number }) {
      log.info({ params }, 'Running scenario: scalperAttempt');
      const asset = params?.asset ?? 'DFEST-WKND';
      const multiplier = params?.multiplier ?? 1.25;

      const info = ctx.catalog.get(asset);
      if (!info) throw new Error(`Unknown asset: ${asset}`);

      const scalperKey = 'scalper-1';
      await ctx.accounts.login(scalperKey);

      const attemptedPrice = ceilToTick(info.ceiling * multiplier, info.tickSize);

      try {
        const placed = await ctx.api.placeLimit(scalperKey, {
          asset,
          side: 'SELL',
          price: attemptedPrice,
          qty: 1,
        });

        // If the API accepted it, that's unexpected according to ceiling policy
        log.error({ placed, attemptedPrice, ceiling: info.ceiling }, 'BUG: API accepted above-ceiling order');
        return {
          accepted: true,
          orderId: placed.orderId,
          ceiling: info.ceiling,
          attemptedPrice,
          message: 'Order was unexpectedly accepted above ceiling',
        };
      } catch (err: any) {
        return {
          accepted: false,
          code: err?.code ?? 'REJECTED',
          ceiling: info.ceiling,
          attemptedPrice,
          message: err?.message ?? 'Rejected above ceiling as expected',
        };
      }
    },
  },

  auctionDrop: {
    name: 'auctionDrop',
    async run(
      { ctx },
      params?: {
        asset?: string;
        qty?: number;
        startPrice?: number;
        floorPrice?: number;
        stepSeconds?: number;
        durationSec?: number;
      },
    ) {
      log.info({ params }, 'Running scenario: auctionDrop');
      const asset = params?.asset ?? 'DFEST-WKND';
      const qty = params?.qty ?? 5;

      const info = ctx.catalog.get(asset);
      if (!info) throw new Error(`Unknown asset: ${asset}`);

      const issuerKey = 'issuer';
      await ctx.accounts.login(issuerKey);

      const startPrice = params?.startPrice ?? info.ceiling;
      const floorPrice = params?.floorPrice ?? floorToTick(info.faceValue * 0.9, info.tickSize);
      const stepSeconds = params?.stepSeconds ?? 5;
      const durationSec = params?.durationSec ?? 60;

      const res = await ctx.api.createAuction(issuerKey, {
        asset,
        qty,
        startPrice,
        floorPrice,
        stepSeconds,
        durationSec,
      });

      return {
        auctionId: res.auctionId,
        startPrice: res.startPrice,
        floorPrice: res.floorPrice,
        endsAt: res.endsAt,
      };
    },
  },
};
