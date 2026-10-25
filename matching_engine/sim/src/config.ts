import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { PARAMS } from './params';

const Schema = z.object({
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  WS_URL: z.string().min(1).default('ws://localhost:4000/ws'),
  SIM_SEED: z.string().min(1).default('darkhold-demo-1'),
  SIM_MODE: z.enum(['demo', 'continuous']).default('demo'),
  SIM_CONTROL_PORT: z.coerce.number().int().min(1).max(65535).default(7100),
  SIM_CONTROL_TOKEN: z.string().min(1).default('change-me-dev-only'),
  SIM_ACCOUNTS_FILE: z.string().min(1).default('/app/ops/seed/accounts.json'),
  SIM_BENCH_ACCOUNTS_FILE: z.string().min(1).optional(),
  SIM_CANDLES_FILE: z.string().min(1).default('/app/ops/seed/candles.seeded.json'),
  SIM_ASSET_PROFILE_FILE: z.string().min(1).default('./assets.profile.json'),
  SIM_GLOBAL_RPS: z.coerce.number().positive().optional(),
  LOG_LEVEL: z.string().min(1).default('info'),
});

export type SimMode = 'demo' | 'continuous';

export interface Config {
  apiBaseUrl: string;
  wsUrl: string;
  seed: string;
  mode: SimMode;
  controlPort: number;
  controlToken: string;
  accountsFile: string;
  benchAccountsFile?: string;
  candlesFile: string;
  assetProfileFile: string;
  globalRps: number;
  logLevel: string;
}

function resolveFile(candidate: string, alternatives: string[]): string {
  if (existsSync(candidate)) return candidate;
  for (const alt of alternatives) {
    if (existsSync(alt)) return alt;
  }
  return candidate;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Treat empty strings as unset so `.env` lines like `FOO=` fall back to defaults.
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === 'string' && v !== '') cleaned[k] = v;
  }
  const parsed = Schema.safeParse(cleaned);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid sim configuration: ${msg}`);
  }
  const e = parsed.data;

  const accountsFile = resolveFile(e.SIM_ACCOUNTS_FILE, [
    resolve(process.cwd(), e.SIM_ACCOUNTS_FILE),
    resolve('/app/ops/seed/accounts.json'),
    resolve(process.cwd(), '../../ops/seed/accounts.json'),
    resolve(process.cwd(), 'ops/seed/accounts.json'),
  ]);

  const candlesFile = resolveFile(e.SIM_CANDLES_FILE, [
    resolve(process.cwd(), e.SIM_CANDLES_FILE),
    resolve('/app/ops/seed/candles.seeded.json'),
    resolve(process.cwd(), '../../ops/seed/candles.seeded.json'),
    resolve(process.cwd(), 'ops/seed/candles.seeded.json'),
  ]);

  const assetProfileFile = resolveFile(e.SIM_ASSET_PROFILE_FILE, [
    resolve(process.cwd(), e.SIM_ASSET_PROFILE_FILE),
    resolve('/app/matching_engine/sim/assets.profile.json'),
    resolve(process.cwd(), 'matching_engine/sim/assets.profile.json'),
    resolve(process.cwd(), 'assets.profile.json'),
  ]);

  return {
    apiBaseUrl: e.API_BASE_URL.replace(/\/+$/, ''),
    wsUrl: e.WS_URL,
    seed: e.SIM_SEED,
    mode: e.SIM_MODE,
    controlPort: e.SIM_CONTROL_PORT,
    controlToken: e.SIM_CONTROL_TOKEN,
    accountsFile,
    benchAccountsFile: e.SIM_BENCH_ACCOUNTS_FILE,
    candlesFile,
    assetProfileFile,
    globalRps: e.SIM_GLOBAL_RPS ?? PARAMS.globalRps[e.SIM_MODE],
    logLevel: e.LOG_LEVEL,
  };
}
