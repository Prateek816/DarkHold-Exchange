import { describe, expect, it } from 'vitest';
import { ManualClock } from '../src/clock';
import { MomentumTraderBot } from '../src/personas/momentumTrader';
import { createTestPersonaContext } from './fakes';

describe('MomentumTraderBot', () => {
  it('skips when fewer than minTrades (8) exist in the window', async () => {
    const clock = new ManualClock(100000);
    const { ctx, api, feed } = createTestPersonaContext(clock);

    feed.setView('DFEST-WKND', {
      bestBid: 9900,
      bestAsk: 10100,
      recentTrades: [
        { ts: 95000, price: 10000, qty: 1, takerSide: 'BUY' },
        { ts: 96000, price: 10000, qty: 1, takerSide: 'BUY' },
      ],
    });

    const bot = new MomentumTraderBot('momentum-01', 'DFEST-WKND', ctx);
    await bot.tick();

    expect(api.placedOrders.length).toBe(0);
  });

  it('triggers marketable BUY when buyer imbalance exceeds +0.4 threshold', async () => {
    const clock = new ManualClock(100000);
    const { ctx, api, feed } = createTestPersonaContext(clock);

    // 10 trades, 8 BUY and 2 SELL -> imbalance = (8 - 2) / 10 = 0.6 >= 0.4
    const recentTrades = [
      { ts: 91000, price: 10000, qty: 1, takerSide: 'BUY' as const },
      { ts: 92000, price: 10000, qty: 1, takerSide: 'BUY' as const },
      { ts: 93000, price: 10000, qty: 1, takerSide: 'BUY' as const },
      { ts: 94000, price: 10000, qty: 1, takerSide: 'BUY' as const },
      { ts: 95000, price: 10000, qty: 1, takerSide: 'BUY' as const },
      { ts: 96000, price: 10000, qty: 1, takerSide: 'BUY' as const },
      { ts: 97000, price: 10000, qty: 1, takerSide: 'BUY' as const },
      { ts: 98000, price: 10000, qty: 1, takerSide: 'BUY' as const },
      { ts: 99000, price: 10000, qty: 1, takerSide: 'SELL' as const },
      { ts: 99500, price: 10000, qty: 1, takerSide: 'SELL' as const },
    ];

    feed.setView('DFEST-WKND', {
      bestBid: 9900,
      bestAsk: 10100,
      recentTrades,
    });

    const bot = new MomentumTraderBot('momentum-01', 'DFEST-WKND', ctx);
    await bot.tick();

    expect(api.placedOrders.length).toBe(1);
    const order = api.placedOrders[0]!;
    expect(order.type).toBe('MARKET');
    expect(order.body.side).toBe('BUY');
    expect(order.body.protectionPrice).toBeGreaterThan(10100);

    // Should now be on cooldown (10000ms)
    clock.advance(5000);
    await bot.tick();
    expect(api.placedOrders.length).toBe(1); // No new order placed during cooldown
  });
});
