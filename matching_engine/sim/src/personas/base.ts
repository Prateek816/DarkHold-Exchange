import type { Accounts } from '../accounts';
import type { ApiClient } from '../apiClient';
import type { AssetCatalog } from '../assets';
import type { Clock } from '../clock';
import type { MarketFeed } from '../marketFeed';
import type { Metrics } from '../metrics';
import type { OwnStateStore } from '../ownState';
import { PARAMS } from '../params';
import type { RegimeManager } from '../regime';
import type { Rng } from '../rng';

export interface PersonaContext {
  rng: Rng;
  clock: Clock;
  metrics: Metrics;
  accounts: Accounts;
  api: ApiClient;
  catalog: AssetCatalog;
  feed: MarketFeed;
  own: OwnStateStore;
  regime: RegimeManager;
  params: typeof PARAMS;
}
