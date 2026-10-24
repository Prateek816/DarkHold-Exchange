import { z } from 'zod';
import { PARAMS } from './params';

const Schema = z.object({
  API_BASE_URL: z.string().url().default('http://api:4000'),
  WS_URL: z.string().min(1).default('ws://api:4000/ws'),
  SIM_SEED: z.string().min(1).default('darkhold-demo-1'),
  SIM_MODE: z.enum(['demo', 'continuous']).default('demo'),
  SIM_CONTROL_PORT: z.coerce.number().int().min(1).max(65535).default(7100),
  SIM_CONTROL_TOKEN: z.string().min(1),
  SIM_ACCOUNTS_FILE: z.string().min(1).default('/seed/accounts.json'),
  SIM_BENCH_ACCOUNTS_FILE: z.string().min(1).optional(),
  SIM_CANDLES_FILE: z.string().min(1).default('/seed/candles.seeded.json'),
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
  return {
    apiBaseUrl: e.API_BASE_URL.replace(/\/+$/, ''),
    wsUrl: e.WS_URL,
    seed: e.SIM_SEED,
    mode: e.SIM_MODE,
    controlPort: e.SIM_CONTROL_PORT,
    controlToken: e.SIM_CONTROL_TOKEN,
    accountsFile: e.SIM_ACCOUNTS_FILE,
    benchAccountsFile: e.SIM_BENCH_ACCOUNTS_FILE,
    candlesFile: e.SIM_CANDLES_FILE,
    assetProfileFile: e.SIM_ASSET_PROFILE_FILE,
    globalRps: e.SIM_GLOBAL_RPS ?? PARAMS.globalRps[e.SIM_MODE],
    logLevel: e.LOG_LEVEL,
  };
}
