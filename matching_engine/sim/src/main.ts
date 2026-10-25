import { pathToFileURL } from 'node:url';
import { Accounts } from './accounts';
import { ApiClient } from './apiClient';
import { AssetCatalog, loadAssetProfile } from './assets';
import { RealClock, type Clock } from './clock';
import { loadConfig, type Config } from './config';
import { ControlServer } from './control/server';
import { ScenarioDirector } from './director/director';
import { log } from './log';
import { MarketFeed } from './marketFeed';
import { Metrics } from './metrics';
import { OwnStateStore } from './ownState';
import { PARAMS } from './params';
import type { PersonaContext } from './personas/base';
import { createCancelerTask } from './personas/canceler';
import { createMarketMakerTask } from './personas/marketMaker';
import { createMomentumTraderTask } from './personas/momentumTrader';
import { createNoiseTraderTask } from './personas/noiseTrader';
import { createProfitTakerTask } from './personas/profitTaker';
import { RegimeManager } from './regime';
import { Rng } from './rng';
import { Scheduler } from './scheduler';

export interface Runtime {
  config: Config;
  rng: Rng;
  clock: Clock;
  metrics: Metrics;
  accounts: Accounts;
  api: ApiClient;
  catalog: AssetCatalog;
  feed: MarketFeed;
  own: OwnStateStore;
  scheduler: Scheduler;
  regime: RegimeManager;
  personaCtx: PersonaContext;
  director?: ScenarioDirector;
  controlServer?: ControlServer;
  startedAt: number;
}

export function registerPersonas(rt: Runtime): { registeredCount: number } {
  let count = 0;
  const { scheduler, personaCtx, catalog, accounts, regime } = rt;

  // 1. Regime manager maintenance tick
  scheduler.register({
    key: 'regime:tick',
    nextDelayMs: () => 10000,
    run: () => {
      const assets = catalog.tradable().map((a) => a.asset);
      regime.tick(assets);
    },
  });
  count++;

  const tradableAssets = catalog.tradable();

  // 2. Market makers (per MM account, per quoted asset)
  const mmBots = accounts.list({ role: 'market_maker' });
  for (const bot of mmBots) {
    for (const asset of bot.quotes) {
      if (catalog.get(asset)) {
        scheduler.register(createMarketMakerTask(personaCtx, bot.key, asset));
        count++;
      }
    }
  }

  // 3. Noise traders (shared Poisson stream per tradable asset)
  for (const a of tradableAssets) {
    scheduler.register(createNoiseTraderTask(personaCtx, a.asset));
    count++;
  }

  // 4. Momentum traders (per momentum account, per tradable asset)
  const momentumBots = accounts.list({ role: 'momentum' });
  for (const bot of momentumBots) {
    for (const a of tradableAssets) {
      scheduler.register(createMomentumTraderTask(personaCtx, bot.key, a.asset));
      count++;
    }
  }

  // 5. Profit takers (per profit_taker account, per tradable asset)
  const profitBots = accounts.list({ role: 'profit_taker' });
  for (const bot of profitBots) {
    for (const a of tradableAssets) {
      scheduler.register(createProfitTakerTask(personaCtx, bot.key, a.asset));
      count++;
    }
  }

  // 6. Order canceler
  scheduler.register(createCancelerTask(personaCtx));
  count++;

  log.info({ registeredCount: count }, 'Registered all bot personas on scheduler');
  return { registeredCount: count };
}

export async function buildRuntime(config: Config, clock: Clock = new RealClock()): Promise<Runtime> {
  const rng = new Rng(config.seed);
  const metrics = new Metrics();

  const files = [config.accountsFile];
  if (config.benchAccountsFile) files.push(config.benchAccountsFile);
  const accounts = new Accounts({ clock, files });
  await accounts.load();

  const api = new ApiClient({
    baseUrl: config.apiBaseUrl,
    accounts,
    metrics,
    rng: rng.child('api'),
    clock,
  });
  accounts.setLogin((email, password) => api.login(email, password));

  const profile = await loadAssetProfile(config.assetProfileFile);
  const catalog = new AssetCatalog({ api, profile, clock });
  try {
    await catalog.refresh();
  } catch (err) {
    log.warn({ err }, 'initial asset load failed, will retry on the refresh timer');
  }
  catalog.start();

  const feed = new MarketFeed({ wsUrl: config.wsUrl, api, clock, rng: rng.child('feed') });
  try {
    await feed.loadReferencePrices(config.candlesFile);
  } catch (err) {
    log.warn({ err, file: config.candlesFile }, 'could not load seeded reference prices');
  }
  feed.start(Object.keys(profile));

  const own = new OwnStateStore(clock, rng);
  const scheduler = new Scheduler({ clock, rps: config.globalRps, minIntervalMs: PARAMS.minBotIntervalMs });
  const regime = new RegimeManager({ mode: config.mode, rng: rng.child('regime'), clock });

  const personaCtx: PersonaContext = {
    rng,
    clock,
    metrics,
    accounts,
    api,
    catalog,
    feed,
    own,
    regime,
    params: PARAMS,
  };

  return {
    config,
    rng,
    clock,
    metrics,
    accounts,
    api,
    catalog,
    feed,
    own,
    scheduler,
    regime,
    personaCtx,
    startedAt: clock.now(),
  };
}

async function main(): Promise<void> {
  const config = loadConfig();
  log.level = config.logLevel;
  const rt = await buildRuntime(config);

  // Register all bot personas
  registerPersonas(rt);

  // Wire scenario director and start control server
  const director = new ScenarioDirector({ ctx: rt.personaCtx, scheduler: rt.scheduler });
  rt.director = director;

  const controlServer = new ControlServer({
    config: rt.config,
    clock: rt.clock,
    scheduler: rt.scheduler,
    regime: rt.regime,
    catalog: rt.catalog,
    feed: rt.feed,
    accounts: rt.accounts,
    metrics: rt.metrics,
    director,
    startedAt: rt.startedAt,
  });
  rt.controlServer = controlServer;
  await controlServer.start();

  rt.scheduler.start();
  if (config.mode === 'demo') {
    rt.scheduler.pause(); // demo mode starts paused
    log.info({ mode: config.mode }, 'Demo mode: scheduler started in paused state. Use /control/resume or wakeMarket to begin.');
  } else {
    log.info({ mode: config.mode }, 'Continuous mode: scheduler actively trading.');
  }

  log.info({ mode: config.mode, seed: config.seed, rps: config.globalRps }, 'Sim runtime ready');

  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, 'Shutting down sim');
    rt.scheduler.stop();
    await controlServer.stop();
    rt.feed.stop();
    rt.catalog.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main().catch((err: unknown) => {
    log.fatal({ err }, 'sim failed to start');
    process.exit(1);
  });
}
