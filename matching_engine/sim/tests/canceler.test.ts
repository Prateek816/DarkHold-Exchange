import { describe, expect, it } from 'vitest';
import { ManualClock } from '../src/clock';
import { CancelerBot } from '../src/personas/canceler';
import { createTestPersonaContext } from './fakes';

describe('CancelerBot', () => {
  it('cancels expired tracked orders with TTL and never cancels market maker orders', async () => {
    const clock = new ManualClock(1000);
    const { ctx, api } = createTestPersonaContext(clock);

    const own = ctx.own.forBot('noise-01');

    // 1. Expired noise order (ttl = 5000, placed at 1000 -> expires at 6000)
    own.track({
      id: 'noise-exp-1',
      asset: 'DFEST-WKND',
      side: 'BUY',
      price: 9900,
      qty: 1,
      placedAt: 1000,
      ttlMs: 5000,
      managedBy: 'noise',
    });

    // 2. Non-expired noise order (ttl = 60000, placed at 1000 -> expires at 61000)
    own.track({
      id: 'noise-live-2',
      asset: 'DFEST-WKND',
      side: 'BUY',
      price: 9800,
      qty: 1,
      placedAt: 1000,
      ttlMs: 60000,
      managedBy: 'noise',
    });

    // 3. Market maker quote (ttl = null, managedBy = marketMaker)
    ctx.own.forBot('mm-01').track({
      id: 'mm-quote-1',
      asset: 'DFEST-WKND',
      side: 'BUY',
      price: 9900,
      qty: 3,
      placedAt: 1000,
      ttlMs: null,
      managedBy: 'marketMaker',
    });

    // Advance clock past expiration of noise-exp-1 (to 7000)
    clock.advance(6000);

    const canceler = new CancelerBot(ctx);
    await canceler.tick();

    expect(api.canceledOrders.length).toBe(1);
    expect(api.canceledOrders[0]!.orderId).toBe('noise-exp-1');
    expect(own.has('noise-exp-1')).toBe(false);
    expect(own.has('noise-live-2')).toBe(true);
    expect(ctx.own.forBot('mm-01').has('mm-quote-1')).toBe(true);
  });

  it('caps cancels per scan at maxCancelsPerScan (5)', async () => {
    const clock = new ManualClock(1000);
    const { ctx, api } = createTestPersonaContext(clock);

    const own = ctx.own.forBot('noise-01');
    for (let i = 0; i < 10; i++) {
      own.track({
        id: `noise-bulk-${i}`,
        asset: 'DFEST-WKND',
        side: 'BUY',
        price: 9000,
        qty: 1,
        placedAt: 1000,
        ttlMs: 1000,
        managedBy: 'noise',
      });
    }

    clock.advance(5000);

    const canceler = new CancelerBot(ctx);
    await canceler.tick();

    expect(api.canceledOrders.length).toBe(5);
    expect(own.expired(clock.now()).length).toBe(5); // 5 remain for next scan
  });
});
