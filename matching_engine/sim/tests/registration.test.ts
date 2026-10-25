import { describe, expect, it } from 'vitest';
import { ManualClock } from '../src/clock';
import { registerPersonas, type Runtime } from '../src/main';
import { Scheduler } from '../src/scheduler';
import { createTestPersonaContext } from './fakes';

describe('registerPersonas', () => {
  it('registers all personas on the scheduler and prevents duplicate registration', () => {
    const clock = new ManualClock(1000);
    const { ctx, catalog } = createTestPersonaContext(clock);
    const scheduler = new Scheduler({ clock, rps: 100 });

    const rt: Runtime = {
      config: {
        apiBaseUrl: 'http://localhost:4000',
        wsUrl: 'ws://localhost:4000/ws',
        seed: 'test',
        mode: 'demo',
        controlPort: 7100,
        controlToken: 'token',
        accountsFile: 'acc.json',
        candlesFile: 'candles.json',
        assetProfileFile: 'prof.json',
        globalRps: 40,
        logLevel: 'info',
      },
      rng: ctx.rng,
      clock,
      metrics: ctx.metrics,
      accounts: ctx.accounts,
      api: ctx.api,
      catalog: catalog as any,
      feed: ctx.feed,
      own: ctx.own,
      scheduler,
      regime: ctx.regime,
      personaCtx: ctx,
      startedAt: 1000,
    };

    const result = registerPersonas(rt);
    expect(result.registeredCount).toBeGreaterThan(0);
    expect(scheduler.taskCount()).toBe(result.registeredCount);

    // Attempting to register again should throw duplicate task error
    expect(() => registerPersonas(rt)).toThrow(/task already registered/);
  });
});
