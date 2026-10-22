#!/usr/bin/env node
import { Command } from 'commander';
import {
  ArgError,
  buildCancel,
  buildConfigure,
  buildEventsQuery,
  buildHalt,
  buildQuery,
  buildResume,
  buildSubmit,
  checkAsset,
  checkUuid,
  parseUInt,
} from './args.js';
import { EngineClient, configFromEnv, type HttpResult } from './client.js';
import { formatFrame } from './format.js';

const client = new EngineClient(configFromEnv());

function show(r: HttpResult): void {
  console.log(JSON.stringify(r.body, null, 2));
  if (r.status >= 400) {
    console.error(`HTTP ${r.status}`);
    process.exitCode = 1;
  }
}

const program = new Command();
program
  .name('engine-cli')
  .description('Poke the Darkhold engine by hand. Env: ENGINE_URL (default http://127.0.0.1:7000), ENGINE_TOKEN')
  .showHelpAfterError();

program
  .command('configure <asset>')
  .description('Create or reconfigure an asset')
  .requiredOption('--tick <n>', 'tick size')
  .requiredOption('--min <n>', 'minimum quantity')
  .requiredOption('--max <n>', 'maximum quantity')
  .option('--collar <n>', 'collar max price')
  .option('--halted', 'configure as HALTED')
  .action(async (asset: string, o) => show(await client.command(buildConfigure(asset, o))));

program
  .command('submit')
  .description('Submit an order')
  .requiredOption('--asset <a>')
  .requiredOption('--user <u>')
  .requiredOption('--side <s>', 'BUY or SELL')
  .option('--type <t>', 'LIMIT or MARKET (default LIMIT)')
  .option('--tif <t>', 'GTC or IOC (default GTC, IOC for MARKET)')
  .requiredOption('--qty <n>')
  .requiredOption('--price <n>', 'limit price, or protection price for MARKET')
  .option('--id <uuid>', 'order id (generated when absent)')
  .action(async (o) => {
    const cmd = buildSubmit(o);
    console.error(`order_id ${cmd.order_id}`);
    show(await client.command(cmd));
  });

program
  .command('cancel <order_id>')
  .description('Cancel an order')
  .option('--reason <r>', 'USER, POLICY_BREACH or ADMIN (default USER)')
  .action(async (id: string, o) => show(await client.command(buildCancel(id, o.reason))));

program.command('halt <asset>').description('Halt an asset').action(async (a: string) => show(await client.command(buildHalt(a))));
program.command('resume <asset>').description('Resume an asset').action(async (a: string) => show(await client.command(buildResume(a))));

program
  .command('book <asset>')
  .description('Book snapshot')
  .option('--depth <n>', 'levels per side')
  .action(async (asset: string, o) => {
    const depth = o.depth === undefined ? undefined : String(parseUInt('depth', o.depth));
    show(await client.get(buildQuery(`/v1/books/${checkAsset(asset)}`, { depth })));
  });

program.command('order <order_id>').description('Order outcome').action(async (id: string) => show(await client.get(`/v1/orders/${checkUuid(id)}`)));

program
  .command('open-orders')
  .description('Resting orders')
  .option('--asset <a>')
  .action(async (o) => show(await client.get(buildQuery('/v1/open-orders', { asset: o.asset === undefined ? undefined : checkAsset(o.asset) }))));

program
  .command('tail')
  .description('Print events as they arrive, one line each')
  .option('--after <seq>', 'resume after this seq')
  .option('--epoch <e>', 'require this engine epoch')
  .action(async (o) => {
    const ac = new AbortController();
    process.on('SIGINT', () => ac.abort());
    try {
      const r = await client.tail(buildEventsQuery(o.after, o.epoch), (f) => console.log(formatFrame(f)), ac.signal);
      if (r.status !== 200) {
        console.error(`HTTP ${r.status}`);
        console.error(JSON.stringify(r.error, null, 2));
        process.exitCode = 1;
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') throw e;
    }
  });

program.command('health').description('GET /healthz (no auth)').action(async () => show(await client.get('/healthz', false)));
program.command('metrics').description('GET /metrics').action(async () => show(await client.get('/metrics')));

program.parseAsync(process.argv).catch((e: unknown) => {
  if (e instanceof ArgError) {
    console.error(`error: ${e.message}`);
    process.exit(2);
  }
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
