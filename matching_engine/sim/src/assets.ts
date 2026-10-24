import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { ApiAsset } from './apiClient';
import type { Clock, TimerHandle } from './clock';
import { log } from './log';
import type { LiquidityName } from './params';
import { PARAMS } from './params';

export type Liquidity = LiquidityName;

export interface AssetInfo {
  asset: string;
  faceValue: number;
  ceiling: number;
  tickSize: number;
  minQty: number;
  maxQty: number;
  status: string;
  liquidity: Liquidity;
}

const ProfileSchema = z.record(z.string(), z.enum(['HIGH', 'MEDIUM', 'THIN']));

export async function loadAssetProfile(file: string): Promise<Record<string, Liquidity>> {
  const raw: unknown = JSON.parse(await readFile(file, 'utf8'));
  return ProfileSchema.parse(raw);
}

// ---------- tick helpers (shared by personas) ----------
export function floorToTick(price: number, tick: number): number {
  return Math.floor(price / tick + 1e-9) * tick;
}
export function ceilToTick(price: number, tick: number): number {
  return Math.ceil(price / tick - 1e-9) * tick;
}
export function roundToTick(price: number, tick: number): number {
  return Math.round(price / tick) * tick;
}

function isTradable(status: string): boolean {
  return !status.toUpperCase().includes('HALT');
}

export class AssetCatalog {
  private assets = new Map<string, AssetInfo>();
  private timer: TimerHandle | undefined;
  private stopped = true;

  constructor(
    private readonly opts: {
      api: { listAssets(): Promise<ApiAsset[]> };
      profile: Record<string, Liquidity>;
      clock: Clock;
      refreshMs?: number;
    },
  ) {}

  /** Loads assets from the API. Only assets present in the liquidity profile are kept (bench assets are ignored). */
  async refresh(): Promise<void> {
    const list = await this.opts.api.listAssets();
    const next = new Map<string, AssetInfo>();
    for (const a of list) {
      const liquidity = this.opts.profile[a.asset];
      if (!liquidity) continue;
      next.set(a.asset, {
        asset: a.asset,
        faceValue: a.faceValue,
        ceiling: a.ceiling,
        tickSize: a.tickSize,
        minQty: a.minQty,
        maxQty: a.maxQty,
        status: a.status,
        liquidity,
      });
    }
    this.assets = next;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.schedule();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== undefined) {
      this.opts.clock.clear(this.timer);
      this.timer = undefined;
    }
  }

  private schedule(): void {
    if (this.stopped) return;
    this.timer = this.opts.clock.setTimeout(() => {
      this.timer = undefined;
      this.refresh()
        .catch((err: unknown) => log.warn({ err }, 'asset refresh failed, keeping previous catalog'))
        .finally(() => this.schedule());
    }, this.opts.refreshMs ?? PARAMS.assetsRefreshMs);
  }

  get(asset: string): AssetInfo | undefined {
    return this.assets.get(asset);
  }

  all(): AssetInfo[] {
    return [...this.assets.values()].sort((a, b) => (a.asset < b.asset ? -1 : a.asset > b.asset ? 1 : 0));
  }

  tradable(): AssetInfo[] {
    return this.all().filter((a) => isTradable(a.status));
  }
}
