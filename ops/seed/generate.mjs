#!/usr/bin/env node
// Deterministic seed-data generator. Writes assets.json, accounts.json, bench-accounts.json next to this file.
// Usage: node ops/seed/generate.mjs            (write the files)
//        node ops/seed/generate.mjs --check    (exit 1 if committed files differ from generated output)
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const PASSWORD = 'darkhold-sim-dev'; // development only
const DOMAIN = 'sim.darkhold.local';

const DEMO_ASSETS = [
  { symbol: 'DFEST-WKND', name: 'Darkhold Fest Weekend Pass', category: 'FESTIVAL', face: 10000, bps: 12000, tick: 10, min: 1, max: 10, supply: 5000, liquidity: 'HIGH' },
  { symbol: 'MOONRISE-GA', name: 'Moonrise GA Pass', category: 'FESTIVAL', face: 8000, bps: 12000, tick: 10, min: 1, max: 10, supply: 4000, liquidity: 'MEDIUM' },
  { symbol: 'DFEST-HOODIE', name: 'Darkhold Hoodie Limited', category: 'MERCH', face: 3000, bps: 12000, tick: 5, min: 1, max: 10, supply: 2000, liquidity: 'MEDIUM' },
  { symbol: 'SIGIL-PIN', name: 'Sigil Collector Pin', category: 'COLLECTIBLE', face: 500, bps: 12000, tick: 1, min: 1, max: 10, supply: 1000, liquidity: 'THIN' },
];
const BENCH_SYMBOLS = ['BENCH-A', 'BENCH-B', 'BENCH-C', 'BENCH-D'];
const BENCH_SUPPLY = 50_000_000;
const BENCH_UNITS_PER_ACCOUNT = 100_000;
const BENCH_ACCOUNTS = 200;
const BENCH_CREDITS = 1_000_000_000;

const MM_ASSIGN = {
  'mm-01': ['DFEST-WKND', 'DFEST-HOODIE'],
  'mm-02': ['DFEST-WKND', 'SIGIL-PIN'],
  'mm-03': ['DFEST-WKND', 'DFEST-HOODIE'],
  'mm-04': ['MOONRISE-GA', 'SIGIL-PIN'],
  'mm-05': ['MOONRISE-GA', 'DFEST-HOODIE'],
  'mm-06': ['MOONRISE-GA', 'SIGIL-PIN'],
};

const pad = (n, w = 2) => String(n).padStart(w, '0');
const email = (key) => `${key}@${DOMAIN}`;
const symbols = DEMO_ASSETS.map((a) => a.symbol);
const allAssets = (n) => Object.fromEntries(symbols.map((s) => [s, n]));

function fail(msg) {
  console.error(`seed generation failed: ${msg}`);
  process.exit(1);
}

function buildAssets() {
  return {
    schema_version: 1,
    demo: DEMO_ASSETS.map((a) => ({
      symbol: a.symbol,
      name: a.name,
      category: a.category,
      face_value_minor: a.face,
      ceiling_bps: a.bps,
      ceiling_minor: Math.floor((a.face * a.bps) / 10000),
      tick_size: a.tick,
      min_qty: a.min,
      max_qty: a.max,
      total_supply: a.supply,
      liquidity: a.liquidity,
    })),
    bench: BENCH_SYMBOLS.map((s, i) => ({
      symbol: s,
      name: `Bench Asset ${String.fromCharCode(65 + i)}`,
      category: 'BENCH',
      face_value_minor: 10000,
      ceiling_bps: 20000,
      ceiling_minor: 20000,
      tick_size: 1,
      min_qty: 1,
      max_qty: 100,
      total_supply: BENCH_SUPPLY,
      liquidity: null,
    })),
  };
}

function buildAccounts() {
  const accounts = [];
  const add = (key, role, isSim, credits, units, quotes) => {
    const a = { key, email: email(key), role, is_simulated: isSim, starter_credits: credits, initial_units: units };
    if (quotes) a.quotes = quotes;
    accounts.push(a);
  };

  const issuerIndex = accounts.length;
  add('issuer', 'issuer', true, 0, {}); // units filled in after the supply check

  for (const [key, assets] of Object.entries(MM_ASSIGN)) {
    add(key, 'market_maker', true, 20_000_000, Object.fromEntries(assets.map((s) => [s, 100])), assets);
  }
  for (let i = 1; i <= 20; i++) add(`noise-${pad(i)}`, 'noise', true, 2_000_000, allAssets(20));
  for (let i = 1; i <= 6; i++) add(`mom-${pad(i)}`, 'momentum', true, 2_000_000, allAssets(10));
  for (let i = 1; i <= 6; i++) add(`pt-${pad(i)}`, 'profit_taker', true, 1_000_000, allAssets(30));
  for (let i = 1; i <= 3; i++) add(`pump-${i}`, 'pump', true, 5_000_000, {});
  add('scalper-1', 'scalper', true, 1_000_000, { 'DFEST-WKND': 10 });
  add('demo-seller', 'judge_seller', false, 100_000, { 'DFEST-WKND': 50 });
  add('demo-buyer', 'judge_buyer', false, 5_000_000, {});
  add('operator', 'admin', false, 0, {});

  // Each asset must have exactly 3 makers.
  for (const s of symbols) {
    const makers = Object.values(MM_ASSIGN).filter((l) => l.includes(s)).length;
    if (makers !== 3) fail(`${s} has ${makers} market makers, expected 3`);
  }

  // Supply check: the issuer holds whatever is left, and nothing may be over-allocated.
  const issuerUnits = {};
  for (const a of DEMO_ASSETS) {
    let held = 0;
    for (const acct of accounts) held += acct.initial_units[a.symbol] ?? 0;
    if (held > a.supply) fail(`${a.symbol} over-allocated: ${held} > ${a.supply}`);
    issuerUnits[a.symbol] = a.supply - held;
  }
  accounts[issuerIndex].initial_units = issuerUnits;

  return { schema_version: 1, password: PASSWORD, accounts };
}

function buildBenchAccounts() {
  const total = BENCH_ACCOUNTS * BENCH_UNITS_PER_ACCOUNT;
  if (total > BENCH_SUPPLY) fail(`bench over-allocated: ${total} > ${BENCH_SUPPLY}`);
  const accounts = [];
  for (let i = 1; i <= BENCH_ACCOUNTS; i++) {
    const key = `bench-${pad(i, 4)}`;
    accounts.push({
      key,
      email: email(key),
      role: 'bench',
      is_simulated: true,
      starter_credits: BENCH_CREDITS,
      initial_units: Object.fromEntries(BENCH_SYMBOLS.map((s) => [s, BENCH_UNITS_PER_ACCOUNT])),
    });
  }
  return { schema_version: 1, password: PASSWORD, accounts };
}

const outputs = {
  'assets.json': buildAssets(),
  'accounts.json': buildAccounts(),
  'bench-accounts.json': buildBenchAccounts(),
};

const check = process.argv.includes('--check');
let stale = false;
for (const [name, data] of Object.entries(outputs)) {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  const file = path.join(dir, name);
  if (check) {
    let current = '';
    try {
      current = await readFile(file, 'utf8');
    } catch {
      /* missing file counts as stale */
    }
    if (current !== text) {
      console.error(`stale: ${name}`);
      stale = true;
    }
  } else {
    await writeFile(file, text, 'utf8');
    console.log(`wrote ${name}`);
  }
}
if (check) {
  if (stale) process.exit(1);
  console.log('seed files are up to date');
}
