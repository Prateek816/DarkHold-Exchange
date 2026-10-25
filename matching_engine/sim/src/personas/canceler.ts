import { log } from '../log';
import type { TaskSpec } from '../scheduler';
import type { PersonaContext } from './base';

export class CancelerBot {
  constructor(private readonly ctx: PersonaContext) {}

  nextDelayMs(): number {
    return this.ctx.params.canceler.scanMs;
  }

  async tick(): Promise<void> {
    const now = this.ctx.clock.now();
    const maxCancels = this.ctx.params.canceler.maxCancelsPerScan;
    let cancelsDone = 0;

    const allAccounts = this.ctx.accounts.list();

    for (const acc of allAccounts) {
      if (cancelsDone >= maxCancels) break;

      const own = this.ctx.own.forBot(acc.key);
      const expired = own.expired(now);

      for (const order of expired) {
        if (cancelsDone >= maxCancels) break;

        cancelsDone++;
        try {
          await this.ctx.api.cancel(acc.key, order.id);
        } catch (err: any) {
          log.debug({ err, bot: acc.key, orderId: order.id }, 'canceler cancel response');
        } finally {
          own.drop(order.id);
        }
      }
    }
  }
}

export function createCancelerTask(ctx: PersonaContext): TaskSpec {
  const canceler = new CancelerBot(ctx);
  return {
    key: 'canceler',
    nextDelayMs: () => canceler.nextDelayMs(),
    run: () => canceler.tick(),
    cost: 1,
  };
}
