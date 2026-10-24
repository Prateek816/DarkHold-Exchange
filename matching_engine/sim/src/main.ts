import { pathToFileURL } from 'node:url';
import { Accounts } from './accounts';
import { ApiClient } from './apiClient';
import { AssetCatalog, loadAssetProfile } from './assets';
import { RealClock, type Clock } from './clock';
import { loadConfig, type Config } from './config';
import { log } from './log';
import { MarketFeed } from './marketFeed';
import { Metrics } from './metrics';
import { OwnStateStore } from './ownState';
import { PARAMS } from './params';
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
  startedAt: number;
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

  return { config, rng, clock, metrics, accounts, api, catalog, feed, own, scheduler, startedAt: clock.now() };
}

async function main(): Promise<void> {
  const config = loadConfig();
  log.level = config.logLevel;
  const rt = await buildRuntime(config);

  // STEP 13: register personas (market maker, noise, momentum, profit taker, canceler) on rt.scheduler here.
  // STEP 14: start the control server and wire the scenario director here.

  rt.scheduler.start();
  if (config.mode === 'demo') rt.scheduler.pause(); // demo mode starts paused
  log.info({ mode: config.mode, seed: config.seed, rps: config.globalRps }, 'sim foundations ready');

  const shutdown = (signal: string): void => {
    log.info({ signal }, 'shutting down');
    rt.scheduler.stop();
    rt.feed.stop();
    rt.catalog.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main().catch((err: unknown) => {
    log.fatal({ err }, 'sim failed to start');
    process.exit(1);
  });
}
