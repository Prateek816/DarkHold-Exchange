import { describe, expect, it } from 'vitest';
import { ManualClock } from '../src/clock';
import { ProfitTakerBot } from '../src/personas/profitTaker';
import { createTestPersonaContext } from './fakes';

describe('ProfitTakerBot', () => {
  it('places a limit sell when lastPrice exceeds target gain (5%) over cost basis', async () => {
    const clock = new ManualClock(1000);
    const { ctx, api, feed } = createTestPersonaContext(clock);

    // Cost basis = 10000, target = 10000 * 1.05 = 10500.
    feed.setView('DFEST-WKND', {
      lastPrice: 10600,
      referencePrice: 10000,
    });

    const bot = new ProfitTakerBot('profit-01', 'DFEST-WKND', ctx);
    await bot.tick();

    expect(api.placedOrders.length).toBe(1);
    const order = api.placedOrders[0]!;
    expect(order.type).toBe('LIMIT');
    expect(order.body.side).toBe('SELL');
    expect(order.body.price).toBeGreaterThanOrEqual(10500);
    expect(order.body.qty).toBeLessThanOrEqual(2);
  });

  it('skips if bot already has an open sell order for that asset', async () => {
    const clock = new ManualClock(1000);
    const { ctx, api, feed } = createTestPersonaContext(clock);

    feed.setView('DFEST-WKND', {
      lastPrice: 10600,
      referencePrice: 10000,
    });

    // Manually track an open sell
    ctx.own.forBot('profit-01').track({
      id: 'existing-sell',
      asset: 'DFEST-WKND',
      side: 'SELL',
      price: 10600,
      qty: 1,
      placedAt: 1000,
      ttlMs: 60000,
      managedBy: 'profitTaker',
    });

    const bot = new ProfitTakerBot('profit-01', 'DFEST-WKND', ctx);
    await bot.tick();

    expect(api.placedOrders.length).toBe(0);
  });
});
