import type { Clock, TimerHandle } from './clock';
import { log } from './log';
import { PARAMS } from './params';

export type SchedulerState = 'stopped' | 'running' | 'paused';

export interface TaskSpec {
  key: string;
  /** Delay until the next run, evaluated each time the task is dispatched. */
  nextDelayMs(): number;
  run(): Promise<void> | void;
  /** Tokens consumed from the global API budget per dispatch (default 1). */
  cost?: number;
  /** Delay before the very first run (default: nextDelayMs()). */
  firstDelayMs?: number;
}

export interface SchedulerLogger {
  error(obj: unknown, msg?: string): void;
}

/** Token bucket in integer milli-tokens so refill arithmetic is exact for integer rates. */
export class TokenBucket {
  private milli: number;
  private last: number;
  private capacityMilli: number;
  private rate: number;

  constructor(private readonly clock: Clock, ratePerSec: number) {
    this.rate = ratePerSec;
    this.capacityMilli = Math.max(1, ratePerSec) * 1000;
    this.milli = this.capacityMilli;
    this.last = clock.now();
  }

  private refill(): void {
    const now = this.clock.now();
    const dt = now - this.last;
    if (dt > 0) {
      this.milli = Math.min(this.capacityMilli, this.milli + dt * this.rate);
      this.last = now;
    }
  }

  setRate(ratePerSec: number): void {
    this.refill();
    this.rate = ratePerSec;
    this.capacityMilli = Math.max(1, ratePerSec) * 1000;
    this.milli = Math.min(this.milli, this.capacityMilli);
  }

  capacity(): number {
    return this.capacityMilli / 1000;
  }

  tryTake(n = 1): boolean {
    this.refill();
    const need = Math.min(n, this.capacity()) * 1000;
    if (this.milli >= need) {
      this.milli -= need;
      return true;
    }
    return false;
  }

  available(): number {
    this.refill();
    return this.milli / 1000;
  }
}

interface TaskEntry {
  spec: TaskSpec;
  nextDue: number;
  inFlight: boolean;
  /** Original due time while the task is being held back by the API budget (keeps its priority, avoids starvation). */
  waitingSince?: number;
}

export class Scheduler {
  private readonly clock: Clock;
  private readonly bucket: TokenBucket;
  private readonly minIntervalMs: number;
  private readonly logger: SchedulerLogger;
  private tasks = new Map<string, TaskEntry>();
  private timer: TimerHandle | undefined;
  private _state: SchedulerState = 'stopped';
  readonly stats = { dispatched: 0, delayedByBudget: 0, skippedBusy: 0, errors: 0 };

  constructor(opts: { clock: Clock; rps: number; minIntervalMs?: number; logger?: SchedulerLogger }) {
    this.clock = opts.clock;
    this.bucket = new TokenBucket(opts.clock, opts.rps);
    this.minIntervalMs = Math.max(1, opts.minIntervalMs ?? PARAMS.minBotIntervalMs);
    this.logger = opts.logger ?? log;
  }

  get state(): SchedulerState {
    return this._state;
  }

  setRps(rps: number): void {
    this.bucket.setRate(rps);
  }

  taskCount(): number {
    return this.tasks.size;
  }

  register(spec: TaskSpec): void {
    if (this.tasks.has(spec.key)) throw new Error(`task already registered: ${spec.key}`);
    const entry: TaskEntry = { spec, nextDue: 0, inFlight: false };
    if (this._state === 'running') entry.nextDue = this.clock.now() + this.initialDelay(spec);
    this.tasks.set(spec.key, entry);
    if (this._state === 'running') this.arm();
  }

  unregister(key: string): void {
    this.tasks.delete(key);
    if (this._state === 'running') this.arm();
  }

  start(): void {
    if (this._state === 'running') return;
    this._state = 'running';
    const now = this.clock.now();
    const ordered = [...this.tasks.values()].sort((a, b) => cmp(a.spec.key, b.spec.key));
    for (const e of ordered) e.nextDue = now + this.initialDelay(e.spec);
    this.arm();
  }

  pause(): void {
    if (this._state !== 'running') return;
    this._state = 'paused';
    this.clearTimer();
  }

  resume(): void {
    if (this._state !== 'paused') return;
    this._state = 'running';
    const now = this.clock.now();
    for (const e of this.tasks.values()) e.nextDue = Math.max(e.nextDue, now);
    this.arm();
  }

  stop(): void {
    this._state = 'stopped';
    this.clearTimer();
  }

  private initialDelay(spec: TaskSpec): number {
    return Math.max(this.minIntervalMs, spec.firstDelayMs ?? spec.nextDelayMs());
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      this.clock.clear(this.timer);
      this.timer = undefined;
    }
  }

  private arm(): void {
    this.clearTimer();
    if (this._state !== 'running') return;
    let min = Infinity;
    for (const e of this.tasks.values()) if (e.nextDue < min) min = e.nextDue;
    if (min === Infinity) return;
    this.timer = this.clock.setTimeout(() => this.fire(), Math.max(0, min - this.clock.now()));
  }

  private fire(): void {
    this.timer = undefined;
    if (this._state !== 'running') return;
    const now = this.clock.now();
    const due = [...this.tasks.values()]
      .filter((e) => e.nextDue <= now)
      .sort((a, b) => (a.waitingSince ?? a.nextDue) - (b.waitingSince ?? b.nextDue) || cmp(a.spec.key, b.spec.key));
    for (const e of due) {
      if (this._state !== 'running') break;
      if (this.tasks.get(e.spec.key) !== e) continue;
      this.dispatch(e, now);
    }
    this.arm();
  }

  private nextDelay(e: TaskEntry): number {
    return Math.max(this.minIntervalMs, e.spec.nextDelayMs());
  }

  private dispatch(e: TaskEntry, now: number): void {
    if (e.inFlight) {
      this.stats.skippedBusy++;
      e.nextDue = now + this.nextDelay(e);
      return;
    }
    if (!this.bucket.tryTake(e.spec.cost ?? 1)) {
      this.stats.delayedByBudget++;
      if (e.waitingSince === undefined) e.waitingSince = e.nextDue;
      e.nextDue = now + PARAMS.schedulerRetryDelayMs;
      return;
    }
    e.waitingSince = undefined;
    e.nextDue = now + this.nextDelay(e);
    this.stats.dispatched++;
    const onError = (err: unknown): void => {
      this.stats.errors++;
      this.logger.error({ err, task: e.spec.key }, 'scheduled task failed');
    };
    let result: Promise<void> | void;
    e.inFlight = true;
    try {
      result = e.spec.run();
    } catch (err) {
      onError(err);
      e.inFlight = false;
      return;
    }
    if (result && typeof (result as Promise<void>).then === 'function') {
      void Promise.resolve(result)
        .catch(onError)
        .finally(() => {
          e.inFlight = false;
        });
    } else {
      e.inFlight = false;
    }
  }
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
