import { describe, expect, it } from 'vitest';
import { ManualClock } from '../src/clock';
import { MarketMakerBot } from '../src/personas/marketMaker';
import { createTestPersonaContext } from './fakes';

describe('MarketMakerBot', () => {
  it('places bid and ask around mid price within spread and tick bounds', async () => {
    const clock = new ManualClock(1000);
    const { ctx, api, feed } = createTestPersonaContext(clock);

    feed.setView('DFEST-WKND', {
      bestBid: 9900,
      bestAsk: 10100,
      mid: 10000,
    });

    const bot = new MarketMakerBot('mm-01', 'DFEST-WKND', ctx);
    await bot.tick();

    expect(api.placedOrders.length).toBe(2);
    const buyOrder = api.placedOrders.find((o) => o.body.side === 'BUY');
    const sellOrder = api.placedOrders.find((o) => o.body.side === 'SELL');

    expect(buyOrder).toBeDefined();
    expect(sellOrder).toBeDefined();
    expect(buyOrder!.body.price).toBeLessThan(10000);
    expect(sellOrder!.body.price).toBeGreaterThan(10000);
    expect(buyOrder!.body.price % 100).toBe(0); // Tick size is 100
    expect(sellOrder!.body.price % 100).toBe(0);
  });

  it('clamps quote prices within tick and ceiling', async () => {
    const clock = new ManualClock(1000);
    const { ctx, api, feed, catalog } = createTestPersonaContext(clock);

    // Ceiling is 20000. Set market near ceiling.
    feed.setView('DFEST-WKND', {
      bestBid: 19800,
      bestAsk: 20000,
      mid: 19900,
    });

    const bot = new MarketMakerBot('mm-01', 'DFEST-WKND', ctx);
    await bot.tick();

    const sellOrder = api.placedOrders.find((o) => o.body.side === 'SELL');
    expect(sellOrder).toBeDefined();
    expect(sellOrder!.body.price).toBeLessThanOrEqual(20000);
  });

  it('skips requoting if quotes are fresh and price has not moved', async () => {
    const clock = new ManualClock(1000);
    const { ctx, api, feed } = createTestPersonaContext(clock);

    feed.setView('DFEST-WKND', {
      bestBid: 9900,
      bestAsk: 10100,
      mid: 10000,
    });

    const bot = new MarketMakerBot('mm-01', 'DFEST-WKND', ctx);
    await bot.tick();
    expect(api.placedOrders.length).toBe(2);

    // Immediate second tick with same price and fresh quote age should skip
    await bot.tick();
    expect(api.placedOrders.length).toBe(2);
  });

  it('requotes and cancels old quotes after refresh interval', async () => {
    const clock = new ManualClock(1000);
    const { ctx, api, feed } = createTestPersonaContext(clock);

    feed.setView('DFEST-WKND', {
      bestBid: 9900,
      bestAsk: 10100,
      mid: 10000,
    });

    const bot = new MarketMakerBot('mm-01', 'DFEST-WKND', ctx);
    await bot.tick();
    expect(api.placedOrders.length).toBe(2);

    // Advance clock past refresh interval (3000ms)
    clock.advance(3500);
    await bot.tick();

    expect(api.canceledOrders.length).toBe(2);
    expect(api.placedOrders.length).toBe(4);
  });
});
