export type TimerHandle = number;

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): TimerHandle;
  clear(handle: TimerHandle): void;
}

export class RealClock implements Clock {
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  now(): number {
    return Date.now();
  }

  setTimeout(fn: () => void, ms: number): TimerHandle {
    const id = this.nextId++;
    const t = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, Math.max(0, ms));
    this.timers.set(id, t);
    return id;
  }

  clear(handle: TimerHandle): void {
    const t = this.timers.get(handle);
    if (t !== undefined) {
      clearTimeout(t);
      this.timers.delete(handle);
    }
  }
}

interface ManualTimer {
  due: number;
  id: number;
  fn: () => void;
}

/** Deterministic clock for tests and history generation. Timers fire only inside advance(). */
export class ManualClock implements Clock {
  private t: number;
  private seq = 0;
  private timers = new Map<number, ManualTimer>();

  constructor(start = 0) {
    this.t = start;
  }

  now(): number {
    return this.t;
  }

  setTimeout(fn: () => void, ms: number): TimerHandle {
    const id = ++this.seq;
    this.timers.set(id, { due: this.t + Math.max(0, ms), id, fn });
    return id;
  }

  clear(handle: TimerHandle): void {
    this.timers.delete(handle);
  }

  pending(): number {
    return this.timers.size;
  }

  /** Move time forward, firing due timers in (due, creation) order. Timers created while firing are honored. */
  advance(ms: number): void {
    const target = this.t + ms;
    for (;;) {
      let next: ManualTimer | undefined;
      for (const tm of this.timers.values()) {
        if (tm.due > target) continue;
        if (!next || tm.due < next.due || (tm.due === next.due && tm.id < next.id)) next = tm;
      }
      if (!next) break;
      this.timers.delete(next.id);
      if (next.due > this.t) this.t = next.due;
      next.fn();
    }
    this.t = target;
  }
}

export function sleep(clock: Clock, ms: number): Promise<void> {
  return new Promise((resolve) => {
    clock.setTimeout(resolve, ms);
  });
}
