import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CandleAggregator, type Candle } from '@darkhold/candles';
import { Rng } from '../rng';
import { generateTicks, roundToTickInt, type AssetSpec } from './generator';
import { HISTORY_PROFILES } from './profiles';

export const HORIZON_MS = 6 * 60 * 60 * 1000;
export const FIVE_SECOND_WINDOW_MS = 30 * 60 * 1000;

export interface SeededAsset {
  reference_price: number;
  candles: { '1m': Candle[]; '5s': Candle[] };
}

export interface SeededHistory {
  schema_version: 1;
  seed: string;
  end_ts: number;
  assets: Record<string, SeededAsset>;
}

export function buildSeededHistory(opts: { seed: string; endMs: number; assets: AssetSpec[] }): SeededHistory {
  const root = new Rng(opts.seed);
  const startMs = opts.endMs - HORIZON_MS;
  const fiveSecondFrom = opts.endMs - FIVE_SECOND_WINDOW_MS;
  const assets: Record<string, SeededAsset> = {};

  for (const spec of opts.assets) {
    const profile = HISTORY_PROFILES[spec.symbol];
    if (!profile) throw new Error(`no history profile for asset ${spec.symbol}`);
    const rng = root.child(spec.symbol);
    const { ticks, lastPrice } = generateTicks(spec, profile, rng, startMs, opts.endMs);

    const agg = new CandleAggregator({ intervals: ['1m', '5s'], origin: 'SEEDED_SIM' });
    const closed: Candle[] = [];
    for (const t of ticks) closed.push(...agg.applyTick(t).closed);
    closed.push(...agg.flush(opts.endMs));

    const oneMinute = closed.filter((c) => c.interval === '1m').sort((a, b) => a.openTime - b.openTime);
    const fiveSecond = closed
      .filter((c) => c.interval === '5s' && c.openTime >= fiveSecondFrom)
      .sort((a, b) => a.openTime - b.openTime);

    const ceilingTick = Math.floor(spec.ceiling / spec.tickSize) * spec.tickSize;
    const fallback = Math.min(
      ceilingTick,
      Math.max(spec.tickSize, roundToTickInt(profile.startRatio * spec.faceValue, spec.tickSize)),
    );
    assets[spec.symbol] = {
      reference_price: lastPrice ?? fallback,
      candles: { '1m': oneMinute, '5s': fiveSecond },
    };
  }

  return { schema_version: 1, seed: opts.seed, end_ts: opts.endMs, assets };
}

export async function writeSeededHistory(outPath: string, history: SeededHistory): Promise<void> {
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(history, null, 2)}\n`, 'utf8');
}

/** Reads the demo assets from ops/seed/assets.json (shape: { schema_version, demo: [...], bench: [...] }). */
export async function loadAssetSpecs(file: string): Promise<AssetSpec[]> {
  const raw: unknown = JSON.parse(await readFile(file, 'utf8'));
  const demo = (raw as { demo?: unknown }).demo;
  if (!Array.isArray(demo)) throw new Error(`${file}: expected a "demo" array`);
  return demo.map((a: Record<string, unknown>) => {
    const symbol = a.symbol;
    const faceValue = a.face_value_minor;
    const ceiling = a.ceiling_minor;
    const tickSize = a.tick_size;
    if (
      typeof symbol !== 'string' ||
      typeof faceValue !== 'number' ||
      typeof ceiling !== 'number' ||
      typeof tickSize !== 'number'
    ) {
      throw new Error(`${file}: invalid asset entry ${JSON.stringify(a)}`);
    }
    return { symbol, faceValue, ceiling, tickSize };
  });
}
