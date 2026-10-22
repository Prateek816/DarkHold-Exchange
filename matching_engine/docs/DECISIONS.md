# Decisions log (one line each)

- Step 1: Schema `engine_epoch` pattern is `^e-[0-9a-z]{8}$` (superset of the generated `e-`+8 hex) because every golden fixture uses the literal `e-test0001`. Runtime generation stays 8 lowercase hex.
- Step 1: Command schemas allow `qty`, `price`, `tick_size`, `min_qty`, `max_qty`, `collar_max_price` from 0 so scenario S21 (qty 0, price 0) is a valid wire command that yields a business rejection, not HTTP 400. Producers must still stay at or below 2^53-1.
- Step 1: `OrderRejected.code` and `OrderOutcome.reject_code` enums exclude `ORDER_ID_REUSED` and `INVALID_CONFIG` because those rejections emit no event and create no outcome.
- Step 1: `candle.schema.json` and `seeded-candles.schema.json` use the camelCase Candle shape from Section 6 (`openTime`, `tradeCount`); the rest of the seeded file uses snake_case per Section 8.6.
- Step 1: `ErrorEnvelope.details` is required (empty object when unused) so consumers never branch on its absence.
- Step 1: Schemas are self-contained (no cross-file `$ref`); shared shapes are repeated so each file validates and generates types on its own.
- Step 1: Initial `api`-layer entries in `error-codes.json` come from blueprint 15.1 (HTTP statuses are first guesses); Member 3 may revise or append.
- Step 1: `generated/types.ts` is produced only by `npm run generate` (needs `json-schema-to-typescript`); it is committed after the first real run.
- Step 2: A missing `collar_max_price` on `ConfigureAsset` parses as null in Rust (schema still requires the field for producers).
- Step 2: `jsonschema` dev-dependency is pinned to the 0.18 line with default features off; draft-2020-12 keywords used by our schemas are all draft-7 compatible.
- Step 2: `Cargo.lock` is generated on first online build and committed then.
