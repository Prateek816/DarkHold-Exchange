# ops/seed

Deterministic seed data for the Darkhold demo. Files here are generated, do not edit by hand.

| File | Source | Notes |
|---|---|---|
| `assets.json` | `node ops/seed/generate.mjs` | `{ schema_version, demo: [...], bench: [...] }`. Ceiling is `floor(face * ceiling_bps / 10000)`. Policy values are placeholders. |
| `accounts.json` | `node ops/seed/generate.mjs` | `{ schema_version, password, accounts: [...] }`. Demo humans and bots. Dev password only. |
| `bench-accounts.json` | `node ops/seed/generate.mjs` | 200 `bench-0001..0200` accounts. Load only with the bench flag. |
| `candles.seeded.json` | `npm run seed:fixture -w sim` (from `matching_engine/`) | Seeded history, origin `SEEDED_SIM`. |

`node ops/seed/generate.mjs --check` exits 1 if committed files are stale.

## Loading order for the backend seed command (Member 3)

1. Assets and price policies from `assets.json` (`demo`, plus `bench` only with the bench flag).
2. Users and wallets from `accounts.json`: starter credits are a ledger transaction from `FAUCET`.
3. Holdings: `initial_units` are minted from `ISSUANCE`. The `issuer` account holds the remaining supply.
4. Candles from `candles.seeded.json` with `origin = SEEDED_SIM`. The `reference_price` per asset is the engine's opening reference.

Supply check (enforced by `generate.mjs`): no asset is over-allocated, every demo asset has exactly 3 market makers.
