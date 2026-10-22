import { existsSync } from 'node:fs';
import path from 'node:path';
import { buildSeededHistory, loadAssetSpecs, writeSeededHistory } from './writer';

function findRepoRoot(start: string): string {
  let dir = path.resolve(start);
  for (;;) {
    if (existsSync(path.join(dir, 'ops', 'seed'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--') continue;
    if (!a.startsWith('--')) throw new Error(`unexpected argument: ${a}`);
    const eq = a.indexOf('=');
    if (eq > 0) {
      out[a.slice(2, eq)] = a.slice(eq + 1);
    } else {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Error(`missing value for ${a}`);
      out[a.slice(2)] = v;
      i++;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  for (const k of Object.keys(args)) {
    if (!['seed', 'end', 'out'].includes(k)) throw new Error(`unknown option --${k}`);
  }
  const root = findRepoRoot(process.cwd());
  const seed = args.seed ?? 'darkhold-history-1';
  const endMs = args.end !== undefined ? Date.parse(args.end) : Math.floor(Date.now() / 60000) * 60000;
  if (!Number.isFinite(endMs)) throw new Error(`invalid --end timestamp: ${args.end}`);
  const out = args.out !== undefined ? path.resolve(process.cwd(), args.out) : path.join(root, 'ops', 'seed', 'candles.seeded.json');

  const assets = await loadAssetSpecs(path.join(root, 'ops', 'seed', 'assets.json'));
  const history = buildSeededHistory({ seed, endMs, assets });
  await writeSeededHistory(out, history);

  const summary = Object.entries(history.assets)
    .map(([sym, a]) => `${sym}: ${a.candles['1m'].length}x1m, ${a.candles['5s'].length}x5s, ref ${a.reference_price}`)
    .join('\n  ');
  console.log(`wrote ${out}\n  seed=${seed} end=${new Date(endMs).toISOString()}\n  ${summary}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
