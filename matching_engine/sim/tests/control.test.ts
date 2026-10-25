import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ManualClock } from '../src/clock';
import { ControlServer } from '../src/control/server';
import { ScenarioDirector } from '../src/director/director';
import { Scheduler } from '../src/scheduler';
import { createTestPersonaContext } from './fakes';

describe('ControlServer', () => {
  let server: ControlServer;
  const testPort = 17123;
  const token = 'secret-test-token';
  const baseUrl = `http://localhost:${testPort}`;
  const clock = new ManualClock(1000);
  let scheduler: Scheduler;

  beforeAll(async () => {
    const { ctx, feed, catalog } = createTestPersonaContext(clock);
    scheduler = new Scheduler({ clock, rps: 100 });
    const director = new ScenarioDirector({ ctx, scheduler });

    const config: any = {
      controlPort: testPort,
      controlToken: token,
      mode: 'demo',
      seed: 'test-seed',
    };

    server = new ControlServer({
      config,
      clock,
      scheduler,
      regime: ctx.regime,
      catalog: catalog as any,
      feed: feed as any,
      accounts: ctx.accounts,
      metrics: ctx.metrics,
      director,
      startedAt: 1000,
    });

    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('GET /healthz is public and returns ok', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('rejects /control/* requests without valid X-Sim-Token', async () => {
    const resNoToken = await fetch(`${baseUrl}/control/status`);
    expect(resNoToken.status).toBe(401);

    const resBadToken = await fetch(`${baseUrl}/control/status`, {
      headers: { 'X-Sim-Token': 'wrong-token' },
    });
    expect(resBadToken.status).toBe(401);
  });

  it('GET /control/status returns complete operational state', async () => {
    const res = await fetch(`${baseUrl}/control/status`, {
      headers: { 'X-Sim-Token': token },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mode).toBe('demo');
    expect(body.bots).toBeDefined();
    expect(body.assets).toBeDefined();
    expect(body.counters).toBeDefined();
  });

  it('POST /control/regime updates the asset regime', async () => {
    const res = await fetch(`${baseUrl}/control/regime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sim-Token': token,
      },
      body: JSON.stringify({ asset: 'DFEST-WKND', regime: 'VOLATILE' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.regime).toBe('VOLATILE');

    // Verify in status
    const statusRes = await fetch(`${baseUrl}/control/status`, {
      headers: { 'X-Sim-Token': token },
    });
    const statusBody = await statusRes.json();
    const asset = statusBody.assets.find((a: any) => a.asset === 'DFEST-WKND');
    expect(asset.regime).toBe('VOLATILE');
  });

  it('POST /control/pause and /control/resume control scheduler state', async () => {
    scheduler.start();
    expect(scheduler.state).toBe('running');

    const pauseRes = await fetch(`${baseUrl}/control/pause`, {
      method: 'POST',
      headers: { 'X-Sim-Token': token },
    });
    expect(pauseRes.status).toBe(200);
    expect(scheduler.state).toBe('paused');

    const resumeRes = await fetch(`${baseUrl}/control/resume`, {
      method: 'POST',
      headers: { 'X-Sim-Token': token },
    });
    expect(resumeRes.status).toBe(200);
    expect(scheduler.state).toBe('running');
  });
});
