import { describe, expect, it } from 'vitest';
import { ManualClock } from '../src/clock';
import { NoiseTraderStream } from '../src/personas/noiseTrader';
import { createTestPersonaContext } from './fakes';

describe('NoiseTraderStream', () => {
  it('places bounded orders and tracks limit orders with TTL', async () => {
    const clock = new ManualClock(1000);
    const { ctx, api, feed } = createTestPersonaContext(clock, 'deterministic-noise-1');

    feed.setView('DFEST-WKND', {
      bestBid: 9900,
      bestAsk: 10100,
      mid: 10000,
    });

    const stream = new NoiseTraderStream('DFEST-WKND', ctx);
    await stream.tick();

    expect(api.placedOrders.length).toBe(1);
    const placed = api.placedOrders[0]!;
    expect(placed.body.asset).toBe('DFEST-WKND');
    expect(placed.body.qty).toBeGreaterThanOrEqual(1);
    expect(placed.body.qty).toBeLessThanOrEqual(5);

    if (placed.type === 'LIMIT') {
      expect(placed.body.price).toBeGreaterThanOrEqual(100);
      expect(placed.body.price).toBeLessThanOrEqual(20000);
      const tracked = ctx.own.forBot(placed.botKey).list('DFEST-WKND');
      expect(tracked.length).toBe(1);
      expect(tracked[0]!.ttlMs).toBeGreaterThanOrEqual(ctx.params.canceler.ttlMinMs);
    }
  });

  it('respects cash balance constraints on BUY orders', async () => {
    const clock = new ManualClock(1000);
    const { ctx, api, feed } = createTestPersonaContext(clock);

    // Set zero wallet balance for all noise bots
    api.wallets.set('noise-01', { available: 0, reserved: 0 });
    api.wallets.set('noise-02', { available: 0, reserved: 0 });

    feed.setView('DFEST-WKND', {
      bestBid: 9900,
      bestAsk: 10100,
      mid: 10000,
    });

    const stream = new NoiseTraderStream('DFEST-WKND', ctx);
    // If a BUY is chosen with 0 cash, it should safely skip and not throw or submit negative qty
    for (let i = 0; i < 10; i++) {
      await stream.tick();
    }

    for (const order of api.placedOrders) {
      if (order.body.side === 'BUY') {
        expect(order.body.qty).toBeGreaterThan(0);
      }
    }
  });
});
