import type { Clock } from './clock';
import { PARAMS, type RegimeName } from './params';
import type { Rng } from './rng';

export class RegimeManager {
  private regimes = new Map<string, RegimeName>();
  private nextChangeAt = 0;
  private readonly mode: 'demo' | 'continuous';
  private readonly rng: Rng;
  private readonly clock: Clock;

  constructor(opts: { mode: 'demo' | 'continuous'; rng: Rng; clock: Clock }) {
    this.mode = opts.mode;
    this.rng = opts.rng;
    this.clock = opts.clock;
    this.scheduleNextChange();
  }

  private scheduleNextChange(): void {
    if (this.mode === 'continuous') {
      const sec = this.rng.int(PARAMS.regimeChange.minSec, PARAMS.regimeChange.maxSec);
      this.nextChangeAt = this.clock.now() + sec * 1000;
    }
  }

  get(asset: string): RegimeName {
    return this.regimes.get(asset) ?? 'ACTIVE';
  }

  set(asset: string, regime: RegimeName): void {
    this.regimes.set(asset, regime);
  }

  getSpreadMultiplier(asset: string): number {
    const r = this.get(asset);
    return PARAMS.regimes[r].spread;
  }

  getArrivalMultiplier(asset: string): number {
    const r = this.get(asset);
    return PARAMS.regimes[r].arrival;
  }

  tick(assets: string[]): void {
    if (this.mode !== 'continuous') return;
    const now = this.clock.now();
    if (now < this.nextChangeAt) return;

    for (const asset of assets) {
      const current = this.get(asset);
      const trans = PARAMS.regimeChange.transitions[current];
      const items: Array<{ value: RegimeName; weight: number }> = [
        { value: 'ACTIVE', weight: trans.ACTIVE },
        { value: 'CALM', weight: trans.CALM },
        { value: 'VOLATILE', weight: trans.VOLATILE },
      ];
      const next = this.rng.weighted(items);
      this.regimes.set(asset, next);
    }

    this.scheduleNextChange();
  }
}
