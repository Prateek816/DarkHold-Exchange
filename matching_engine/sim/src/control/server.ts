import express, { type Request, type Response, type NextFunction } from 'express';
import type { Server } from 'node:http';
import type { Accounts } from '../accounts';
import type { AssetCatalog } from '../assets';
import type { Clock } from '../clock';
import type { Config } from '../config';
import type { ScenarioDirector } from '../director/director';
import { log } from '../log';
import type { MarketFeed } from '../marketFeed';
import type { Metrics } from '../metrics';
import type { RegimeName } from '../params';
import type { RegimeManager } from '../regime';
import type { Scheduler } from '../scheduler';

export interface ControlServerDeps {
  config: Config;
  clock: Clock;
  scheduler: Scheduler;
  regime: RegimeManager;
  catalog: AssetCatalog;
  feed: MarketFeed;
  accounts: Accounts;
  metrics: Metrics;
  director: ScenarioDirector;
  startedAt: number;
}

export class ControlServer {
  private app: express.Express;
  private server: Server | null = null;

  constructor(private readonly deps: ControlServerDeps) {
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // Public health check
    this.app.get('/healthz', (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    // Auth middleware for /control/*
    const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
      const token = req.headers['x-sim-token'];
      if (!token || token !== this.deps.config.controlToken) {
        res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid X-Sim-Token header' });
        return;
      }
      next();
    };

    const control = express.Router();
    control.use(authMiddleware);

    // POST /control/start { mode?: 'demo' | 'continuous' }
    control.post('/start', (req: Request, res: Response) => {
      const mode = req.body?.mode;
      if (mode && mode !== 'demo' && mode !== 'continuous') {
        res.status(400).json({ error: 'INVALID_MODE', message: "Mode must be 'demo' or 'continuous'" });
        return;
      }
      if (mode) {
        this.deps.config.mode = mode;
      }
      this.deps.scheduler.start();
      res.json({ ok: true, state: this.deps.scheduler.state, mode: this.deps.config.mode });
    });

    // POST /control/pause
    control.post('/pause', (_req: Request, res: Response) => {
      this.deps.scheduler.pause();
      res.json({ ok: true, state: this.deps.scheduler.state });
    });

    // POST /control/resume
    control.post('/resume', (_req: Request, res: Response) => {
      this.deps.scheduler.resume();
      res.json({ ok: true, state: this.deps.scheduler.state });
    });

    // POST /control/regime { asset: string, regime: RegimeName }
    control.post('/regime', (req: Request, res: Response) => {
      const { asset, regime } = req.body ?? {};
      if (!asset || typeof asset !== 'string') {
        res.status(400).json({ error: 'MISSING_ASSET', message: 'asset string is required' });
        return;
      }
      if (regime !== 'CALM' && regime !== 'ACTIVE' && regime !== 'VOLATILE') {
        res.status(400).json({ error: 'INVALID_REGIME', message: "regime must be 'CALM' | 'ACTIVE' | 'VOLATILE'" });
        return;
      }
      this.deps.regime.set(asset, regime as RegimeName);
      res.json({ ok: true, asset, regime });
    });

    // POST /control/scenario { name: string, params?: any }
    control.post('/scenario', async (req: Request, res: Response) => {
      const { name, params } = req.body ?? {};
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'MISSING_NAME', message: 'scenario name is required' });
        return;
      }
      try {
        const result = await this.deps.director.run(name, params);
        res.json(result);
      } catch (err: any) {
        res.status(400).json({ error: 'SCENARIO_ERROR', message: err?.message ?? String(err) });
      }
    });

    // GET /control/status
    control.get('/status', (_req: Request, res: Response) => {
      const now = this.deps.clock.now();
      const assetsStatus = this.deps.catalog.all().map((a) => {
        const view = this.deps.feed.getView(a.asset);
        return {
          asset: a.asset,
          lastPrice: view?.lastPrice ?? null,
          bestBid: view?.bestBid ?? null,
          bestAsk: view?.bestAsk ?? null,
          regime: this.deps.regime.get(a.asset),
        };
      });

      const allAccounts = this.deps.accounts.list();

      res.json({
        state: this.deps.scheduler.state,
        mode: this.deps.config.mode,
        seed: this.deps.config.seed,
        uptime_s: Math.floor((now - this.deps.startedAt) / 1000),
        bots: {
          total: allAccounts.length,
          byRole: {
            market_maker: this.deps.accounts.list({ role: 'market_maker' }).length,
            noise: this.deps.accounts.list({ role: 'noise' }).length,
            momentum: this.deps.accounts.list({ role: 'momentum' }).length,
            profit_taker: this.deps.accounts.list({ role: 'profit_taker' }).length,
            pump: this.deps.accounts.list({ role: 'pump' }).length,
            scalper: this.deps.accounts.list({ role: 'scalper' }).length,
          },
        },
        counters: this.deps.metrics.snapshot(),
        assets: assetsStatus,
        director: {
          running: this.deps.director.isRunning(),
          last: this.deps.director.lastResult(),
        },
      });
    });

    this.app.use('/control', control);
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      const port = this.deps.config.controlPort;
      this.server = this.app.listen(port, () => {
        log.info({ port }, 'Simulator control server listening');
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
