# Steps 11 and 12: manual actions

Unzip at the git repo root (`WEBSTER2026/`). It adds `matching_engine/sim/**` and `ops/seed/**` only. No file from steps 1 to 10 is overwritten.

## Do these once

1. `cd matching_engine && npm install` (the `sim` workspace must be listed in `package.json`; it is in the Step 0 list).
2. Make sure `packages/candles` is built (`npm run build -w packages/candles`). The seeder imports `@darkhold/candles`; vitest uses the source via an alias, `tsx` uses `dist`.
3. Generate the history files (needs step 2): `npm run seed:fixture -w sim`. This writes `ops/seed/candles.seeded.json` and `matching_engine/contracts/fixtures/market/candles.seeded.json` with seed `darkhold-history-1` and end `2026-10-01T12:00:00Z`.
4. `npm run validate -w contracts` to confirm the seeded file matches `seeded-candles.schema.json`.
5. `npm test -w sim` and `npm run typecheck -w sim`.
6. `node ops/seed/generate.mjs --check` (already generated and committed in this zip).

## Possible changes in earlier steps (only if something fails)

- `packages/candles` must export `CandleAggregator` (constructor `{ intervals, origin }`, methods `applyTick`, `flush`) and types `Candle`, `Tick`. If names differ, adjust `sim/src/history/writer.ts` and `generator.ts`.
- Seeded output uses the `Candle` objects as returned (`openTime`, `tradeCount`, `origin`, ...). If `candle.schema.json` uses other field names, fix the schema or the writer.
- If `tsconfig.base.json` is still empty, no action: `sim/tsconfig.json` is standalone.

## Assumptions to confirm with Member 3 (all isolated)

- REST field names: only in `sim/src/apiClient.ts` (order body uses `quantity` and `price`, see the `F` constant).
- WebSocket subscribe message `{type:"subscribe", channel:"book:<asset>"}` and message shapes: only in `sim/src/marketFeed.ts`.
- `assets.json` shape is `{schema_version, demo[], bench[]}`; `accounts.json` is `{schema_version, password, accounts[]}`.

## Add to `matching_engine/docs/DECISIONS.md`

- Regime transitions from CALM (50/50 stay or ACTIVE) and VOLATILE (40% stay, 60% ACTIVE) are pinned in `sim/src/params.ts`.
- Scheduler spends API budget per task dispatch (`cost`, default 1); tasks held back keep their priority.
- Own state refreshes lazily when a persona calls `refreshIfDue`, not on a global timer.
- `main.ts` leaves marked hooks for personas (step 13) and the control server (step 14); demo mode starts paused.
