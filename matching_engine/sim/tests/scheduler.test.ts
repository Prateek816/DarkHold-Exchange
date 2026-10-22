import { describe, expect, it } from 'vitest';
import { ManualClock } from '../src/clock';
import { Scheduler, TokenBucket } from '../src/scheduler';

const silent = { error: () => undefined };

function setup(rps = 1000) {
  const clock = new ManualClock(0);
  const scheduler = new Scheduler({ clock, rps, minIntervalMs: 1, logger: silent });
  return { clock, scheduler };
}

describe('TokenBucket', () => {
  it('starts full, drains, and refills with time', () => {
    const clock = new ManualClock(0);
    const bucket = new TokenBucket(clock, 10);
    for (let i = 0; i < 10; i++) expect(bucket.tryTake()).toBe(true);
    expect(bucket.tryTake()).toBe(false);
    clock.advance(100); // 10 tokens/s -> 1 token
    expect(bucket.tryTake()).toBe(true);
    expect(bucket.tryTake()).toBe(false);
  });

  it('never exceeds capacity', () => {
    const clock = new ManualClock(0);
    const bucket = new TokenBucket(clock, 5);
    clock.advance(60000);
    expect(bucket.available()).toBe(5);
  });
});

describe('Scheduler', () => {
  it('runs a task at its delay', () => {
    const { clock, scheduler } = setup();
    const calls: number[] = [];
    scheduler.register({ key: 'a', nextDelayMs: () => 1000, run: () => void calls.push(clock.now()) });
    scheduler.start();
    clock.advance(3500);
    expect(calls).toEqual([1000, 2000, 3000]);
  });

  it('runs tasks due at the same millisecond in key order', () => {
    const { clock, scheduler } = setup();
    const order: string[] = [];
    scheduler.register({ key: 'b', nextDelayMs: () => 1000, run: () => void order.push('b') });
    scheduler.register({ key: 'a', nextDelayMs: () => 1000, run: () => void order.push('a') });
    scheduler.start();
    clock.advance(2000);
    expect(order).toEqual(['a', 'b', 'a', 'b']);
  });

  it('pause stops scheduling and resume continues', () => {
    const { clock, scheduler } = setup();
    const calls: number[] = [];
    scheduler.register({ key: 'a', nextDelayMs: () => 1000, run: () => void calls.push(clock.now()) });
    scheduler.start();
    clock.advance(1500);
    expect(calls).toEqual([1000]);
    scheduler.pause();
    expect(scheduler.state).toBe('paused');
    clock.advance(5000);
    expect(calls).toEqual([1000]);
    scheduler.resume();
    clock.advance(0);
    expect(calls).toEqual([1000, 6500]);
    clock.advance(1000);
    expect(calls).toEqual([1000, 6500, 7500]);
  });

  it('stop halts everything', () => {
    const { clock, scheduler } = setup();
    let n = 0;
    scheduler.register({ key: 'a', nextDelayMs: () => 100, run: () => void n++ });
    scheduler.start();
    clock.advance(350);
    expect(n).toBe(3);
    scheduler.stop();
    clock.advance(1000);
    expect(n).toBe(3);
    expect(scheduler.state).toBe('stopped');
  });

  it('delays tasks when the global budget is empty and still runs them later', () => {
    const { clock, scheduler } = setup(1); // 1 request per second
    const ran: string[] = [];
    scheduler.register({ key: 'a', nextDelayMs: () => 1000, run: () => void ran.push('a') });
    scheduler.register({ key: 'b', nextDelayMs: () => 1000, run: () => void ran.push('b') });
    scheduler.start();
    clock.advance(1000);
    expect(ran).toEqual(['a']);
    expect(scheduler.stats.delayedByBudget).toBeGreaterThan(0);
    clock.advance(3000);
    expect(ran.filter((k) => k === 'b').length).toBeGreaterThanOrEqual(1);
  });

  it('counts task errors and keeps scheduling', () => {
    const { clock, scheduler } = setup();
    let n = 0;
    scheduler.register({
      key: 'bad',
      nextDelayMs: () => 100,
      run: () => {
        n++;
        throw new Error('boom');
      },
    });
    scheduler.start();
    clock.advance(350);
    expect(n).toBe(3);
    expect(scheduler.stats.errors).toBe(3);
  });

  it('unregister removes a task and duplicate keys are rejected', () => {
    const { clock, scheduler } = setup();
    let n = 0;
    scheduler.register({ key: 'a', nextDelayMs: () => 100, run: () => void n++ });
    expect(() => scheduler.register({ key: 'a', nextDelayMs: () => 100, run: () => undefined })).toThrow();
    scheduler.start();
    clock.advance(250);
    scheduler.unregister('a');
    clock.advance(1000);
    expect(n).toBe(2);
  });
});
