import { log } from '../log';
import { SCENARIOS, type ScenarioRuntimeContext } from './scenarios';

export interface ScenarioRunResult {
  scenario: string;
  success: boolean;
  result?: any;
  error?: string;
  durationMs: number;
  ts: number;
}

export class ScenarioDirector {
  private active = false;
  private last: ScenarioRunResult | null = null;

  constructor(private readonly rt: ScenarioRuntimeContext) {}

  isRunning(): boolean {
    return this.active;
  }

  lastResult(): ScenarioRunResult | null {
    return this.last;
  }

  async run(name: string, params?: any): Promise<ScenarioRunResult> {
    if (this.active) {
      throw new Error('A scenario is already running');
    }

    const def = SCENARIOS[name];
    if (!def) {
      throw new Error(`Unknown scenario: ${name}. Available: ${Object.keys(SCENARIOS).join(', ')}`);
    }

    this.active = true;
    const start = this.rt.ctx.clock.now();
    log.info({ scenario: name, params }, 'Starting scenario');

    try {
      const result = await def.run(this.rt, params);
      const durationMs = this.rt.ctx.clock.now() - start;
      const runResult: ScenarioRunResult = {
        scenario: name,
        success: true,
        result,
        durationMs,
        ts: start,
      };
      this.last = runResult;
      log.info({ scenario: name, durationMs }, 'Scenario completed successfully');
      return runResult;
    } catch (err: any) {
      const durationMs = this.rt.ctx.clock.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);
      const runResult: ScenarioRunResult = {
        scenario: name,
        success: false,
        error: errorMsg,
        durationMs,
        ts: start,
      };
      this.last = runResult;
      log.error({ err, scenario: name, durationMs }, 'Scenario failed');
      return runResult;
    } finally {
      this.active = false;
    }
  }
}
