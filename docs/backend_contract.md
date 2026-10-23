# DARKHOLD EXCHANGE — BACKEND (`api`) IMPLEMENTATION SPEC

> Audience: the backend developer and the AI coding agent they hand this file to.
> Purpose: build the Node/Express `api` so that it plugs into the code that already exists (Rust engine, contracts, TypeScript simulator, seed data, candle package) **without changing any of it**.
> Source of truth order when two statements conflict: **(1)** `contracts/schemas/*.json` and `contracts/error-codes.json`, **(2)** the Rust code in `engine/crates/darkhold-core`, **(3)** the engine README and its integration tests, **(4)** `sim/src/apiClient.ts` and `sim/src/marketFeed.ts`, **(5)** this file, **(6)** the Project Blueprint.

---

## 0. How to use this document (rules for the AI agent)

1. **Do not modify** anything under `engine/`, `contracts/`, `sim/`, `packages/candles/`, `ops/seed/`, `tools/`. You build `api/` (and may add `api` to workspaces and compose). If you believe an existing file is wrong, write the concern in `api/docs/DEVIATIONS.md` and work around it.
2. Every contract item below is tagged:
   - **PINNED**: fixed by existing code or schema. Implement exactly. Do not rename fields.
   - **PROPOSED**: a backend decision made here so the frontend and simulator have something definite. Implement as written unless the team changes it.
   - **POLICY**: a business number. Implement as a config value with the stated default, never as a literal in logic.
3. Money, quantities, prices, `seq`, `ts` are **integers**. Maximum value on every wire field is `2^53 − 1` (`9007199254740991`). Reject anything larger. Never use floats for money. PostgreSQL `BIGINT` must be parsed to JS `number` (`pg.types.setTypeParser(20, Number)`), and any value above `Number.MAX_SAFE_INTEGER` is a fatal error, not a silent rounding.
4. Single-writer rule per fact (Section 6.0). Violating it is the most likely source of money bugs.
5. Build in the phase order of Section 14. Do not start a later phase until the acceptance test of the earlier one passes.
6. Where this document says "alert", log at `error` level with a stable `alert` key and increment a counter exposed on `/metrics`.

---

## 1. What exists, what you build, what is broken

### 1.1 Inventory of the uploaded code

| Path | What it is | State |
|---|---|---|
| `matching_engine/contracts/` | 14 JSON Schemas, `error-codes.json`, golden fixtures (24 scenarios with full `expect_reply` / `expect_events`, 12 transport error fixtures), `ids.json`, `scripts/validate-fixtures.mjs`, `generate-types.mjs`, `VERSION` = `1.0.0` | Complete. `contracts/generated/` is **empty**: run `npm run generate -w contracts` to get TS types |
| `matching_engine/engine/crates/darkhold-core` | Pure deterministic matching core (`Engine::process`), validation, books, views, WAL-independent | Complete, unit/golden/property tests present |
| `matching_engine/engine/crates/darkhold-engine` | Tokio shell: core thread, WAL, recovery, SSE ring, HTTP | **Inconsistent merge, see 1.3** |
| `matching_engine/packages/candles` | `@darkhold/candles`: `CandleAggregator`, `rebuildActive`, `bucketStart` | Complete, tested. Use it, do not re-implement |
| `matching_engine/sim` | TypeScript simulator: `ApiClient`, `Accounts`, `MarketFeed`, scheduler, history seeder | Foundations done. Personas and control server are **not** written yet (`main.ts` has marked hooks) |
| `matching_engine/tools/engine-cli` | Dev CLI for the engine, contains a working SSE frame parser | Complete. Copy its parser logic |
| `ops/seed/` | `assets.json`, `accounts.json` (46 accounts), `bench-accounts.json` (200), `generate.mjs` | Complete. `candles.seeded.json` is **not in the zip**, see 10.3 |
| Frontend (`web`), `bench/` (k6), `api/` | | Not in the zip. `api/` is what you build |

### 1.2 What you build

`api/`: one Node 20 + Express + TypeScript modular monolith containing: `auth`, `catalog`, `orders`, `ledger`, `settlement`, `auctions`, `market-data`, `risk`, `reconciliation`, `admin`, plus the **engine consumer**, **resolver**, **settlement worker**, **WebSocket gateway**, **auction sweeper**, **policy sweeper**. All in one process by default (`MODE=all`).

### 1.3 Problems found in the uploaded engine (tell Member 1; do not work around them silently)

I read every file; I did **not** compile it. Evidence is file timestamps in the zip and cross-reading.

| # | Finding | Impact on you |
|---|---|---|
| E1 | `engine/Cargo.toml` `members = ["crates/darkhold-core"]` only. `darkhold-engine` and `darkhold-bench` are not workspace members | `cargo run -p darkhold-engine` will not work until Member 1 adds it |
| E2 | Files stamped `03:42` are **Step-6 leftovers** that the Step 7/8 notes say must be hand-edited: `config.rs` (field `bind`, but `main.rs` uses `engine_bind`), `ring.rs` (`EventRing`, but `recovery.rs`/`main.rs` use `Ring`), `http/mod.rs` (no `/v1/books`, `/v1/orders`, `/v1/open-orders`, `/metrics` routes), `http/commands.rs` (`st.cmd_tx`, `st.permits`, but `AppState` has `tx`), `http/events.rs` (`st.assets`, `st.subscribers`, no `book` frames) | The engine will not build as shipped. The intended behavior is documented in the engine README and tested in `tests/http_full_tests.rs`, `tests/sse_guard_tests.rs`, `tests/crash_tests.rs`. **Code against README + tests + schemas, not against the stale handler files** |
| E3 | No endpoint returns historical trades | If the SSE ring no longer holds a needed `seq` (`410 GONE`), missed trades cannot be recovered. See 4.6 |
| E4 | `FSYNC_POLICY=off` can lose acknowledged commands | Never run the integrated system with `off` (4.7) |

**Until E1/E2 are fixed, develop against the Stub Engine (Section 13.2).** It replays the golden fixtures and speaks the identical HTTP/SSE protocol, so your work is not blocked.

### 1.4 Other gaps you must know about

| # | Gap | What to do |
|---|---|---|
| G1 | `contracts/generated/types.ts` empty | `npm install && npm run generate -w contracts` |
| G2 | Root `package.json` has `workspaces: ["contracts"]` only; the step notes say it must include `packages/*`, `tools/*`, `sim` | Add `api`, `packages/*`, `sim`, `tools/*` to workspaces |
| G3 | `ops/seed/candles.seeded.json` missing | `npm run build -w @darkhold/candles && npm run seed:fixture -w sim` |
| G4 | Sim control server (port 7100) and personas not written | `/admin/sim/*` is a thin proxy you add last (8.7). Do not block on it |
| G5 | Seed ceiling is `12000` bps (120% of face) | Placeholder. Policy value, read from `asset_policy`, never hard-code |

---

## 2. Architecture you implement

```
 web ──REST──────────────▶ ┌──────────────────────── api (Node, :4000) ─────────────────────────┐
 web ◀──WS (/ws)────────── │ auth catalog orders ledger settlement auctions market-data risk     │
 sim ──REST (+ WS read)──▶ │ reconciliation admin │ consumer │ resolver │ settlement worker      │
 bench ─REST─────────────▶ └───────┬───────────────────────┬──────────────────────┬──────────────┘
                                   │ HTTP commands         │ SQL                  │ Pub/Sub, cache,
                                   ▼ + SSE events          ▼                      ▼ rate limits
                              engine (Rust :7000)     PostgreSQL              Redis
```

- REST and WebSocket share **one port**: `4000`. WebSocket path is `/ws`. (**PINNED** by `sim/.env.example`: `API_BASE_URL=http://localhost:4000`, `WS_URL=ws://localhost:4000/ws`.)
- The engine never touches PostgreSQL. You never decide a match.
- **Reserve → match → settle.** Funds/units are escrowed in PostgreSQL before an order reaches the engine. A `TradeExecuted` event is final. Settlement may retry, never reverse.

---

## 3. Configuration and local run

### 3.1 Environment variables for `api` (**PROPOSED**)

| Var | Default | Notes |
|---|---|---|
| `PORT` | `4000` | REST and WS |
| `MODE` | `all` | `all` \| `worker` (worker split is optional, deferred) |
| `DATABASE_URL` | | PostgreSQL 15+ |
| `REDIS_URL` | | |
| `ENGINE_URL` | `http://engine:7000` | |
| `ENGINE_TOKEN` | required | sent as header `X-Engine-Token` |
| `JWT_SECRET` | required | HS256 |
| `JWT_TTL_SECONDS` | `900` | returned as `expires_in` |
| `LOG_LEVEL` | `info` | |
| `CORS_ORIGINS` | `http://localhost:3000` | |
| `ENGINE_CMD_TIMEOUT_MS` | `3000` | must exceed engine `COMMAND_TIMEOUT_MS` (2000) |
| `RESOLVER_STALE_MS` | `3000` | |
| `SETTLE_BATCH` | `50` | trades per settlement transaction |
| `SETTLE_MAX_ATTEMPTS` | `5` | |
| `AUTH_RATE_PER_MIN` | `600` | per IP; the simulator logs in 46 to 246 accounts from one IP (see 11) |
| `BOT_CREDENTIALS_ENABLED` | `true` | enables rate tiers `BOT` and `BENCH` |

### 3.2 Engine environment that the compose file must set (**PINNED**, from engine README)

`ENGINE_TOKEN` (required), `WAL_DIR=/data` on a **named volume**, `FSYNC_POLICY=batch` (or `always`), `ENGINE_BIND=0.0.0.0:7000`, `RING_CAPACITY=300000` (raise for long runs), `SSE_MAX_SUBSCRIBERS=8`, `SNAPSHOT_TICK_MS=100`, `SNAPSHOT_DEPTH=15`.

### 3.3 Ports

`web 3000`, `api 4000`, `engine 7000`, `postgres 5432`, `redis 6379`, `sim control 7100` (sim, not yours).

---

## 4. Engine integration contract (all **PINNED**)

### 4.1 Transport

| Item | Value |
|---|---|
| Auth | Header `X-Engine-Token: <ENGINE_TOKEN>` on everything except `GET /healthz`. Wrong/missing → `401 UNAUTHENTICATED` |
| Body limit | 16384 bytes → `413 PAYLOAD_TOO_LARGE` |
| Content type | `application/json` |
| Unknown JSON fields in a command | rejected, `400 VALIDATION_FAILED` (`deny_unknown_fields`). **Send exactly the schema fields, nothing extra** |
| Transport error envelope | `{"error":{"code","message","details"}}`, `details` always present. Schema: `error.envelope.schema.json` |

### 4.2 Endpoints

| Route | Purpose | Success body schema |
|---|---|---|
| `POST /v1/commands` | One of `SubmitOrder`, `CancelOrder`, `ConfigureAsset`, `HaltAsset`, `ResumeAsset` | `reply.command.schema.json` (HTTP **200** even for business rejections) |
| `GET /v1/books/:asset?depth=` | Book snapshot, depth 1..100 (default 15) | `book.snapshot.schema.json` (with `ts`) |
| `GET /v1/orders/:order_id` | Engine's view of an order | `order.outcome.schema.json` |
| `GET /v1/open-orders?asset=` | All resting orders, sorted by asset then `accept_seq` | `open-orders.schema.json` |
| `GET /v1/events?after=&epoch=` | SSE stream (4.5) | n/a |
| `GET /metrics` | Metrics (auth) | JSON |
| `GET /healthz` | No auth | `health.schema.json`: `{status:"ok"\|"down", engine_epoch, seq, uptime_s}`; 503 when down |

### 4.3 Commands (exact wire shapes)

```jsonc
// SubmitOrder  (command.submit-order.schema.json)
{ "type":"SubmitOrder", "order_id":"<lowercase hyphenated uuid>", "asset":"DFEST-WKND",
  "user_id":"<1-64 printable ASCII, no spaces>", "side":"BUY|SELL",
  "order_type":"LIMIT|MARKET", "tif":"GTC|IOC", "qty":5, "price":10000 }

// CancelOrder  (command.cancel-order.schema.json)
{ "type":"CancelOrder", "order_id":"<uuid>", "reason":"USER|POLICY_BREACH|ADMIN" }

// ConfigureAsset  (command.configure-asset.schema.json) — all 7 fields required
{ "type":"ConfigureAsset", "asset":"DFEST-WKND", "tick_size":10, "min_qty":1, "max_qty":10,
  "collar_max_price":12000, "status":"ACTIVE|HALTED" }       // collar_max_price may be null

// HaltAsset / ResumeAsset (command.asset-status.schema.json)
{ "type":"HaltAsset", "asset":"DFEST-WKND" }
```

Rules you must respect:

- `order_id`: lowercase, hyphenated, 36 chars. Generate with **UUID v7** (`uuid` package). Upper-case or non-hyphenated forms are rejected with 400.
- `user_id` sent to the engine **is `users.id`** (a UUID string, 36 chars, valid). Engine self-trade prevention compares this string.
- `asset` is the **symbol** (`^[A-Z0-9_-]{1,32}$`), not a UUID.
- **MARKET orders**: `order_type:"MARKET"`, `tif:"IOC"` (anything else → `INVALID_TIF`), and `price` carries the **protection price** (worst acceptable price). It must still be `>= 1`, on-tick, and within collar. The engine treats it as IOC at that price.
- The **idempotency/dedup key is `order_id`**. The engine remembers a fingerprint of `asset|user_id|side|order_type|tif|qty|price`. Resubmitting the **same `order_id` with identical fields** returns the stored reply with `duplicate:true`. Resubmitting with **any field different** returns `REJECTED / ORDER_ID_REUSED` with `seq:null` and emits no event. **Therefore persist the exact submitted fields and replay them byte-for-byte.**

### 4.4 Command replies (`reply.command.schema.json`)

Always present: `status`, `seq` (integer or `null`), `last_seq`, `engine_epoch`, `duplicate`. Optional: `order_id`, `asset`, `code`, `remaining_qty`.

| Command | `status` values | Notes |
|---|---|---|
| SubmitOrder | `ACCEPTED`, `REJECTED` | `seq` = seq of `OrderAccepted`/`OrderRejected`. `last_seq` = last event seq produced by this command (fills etc.). `REJECTED` carries `code`. `ORDER_ID_REUSED` has `seq:null` |
| CancelOrder | `CANCELED` (with `remaining_qty`, `seq`), `ALREADY_CANCELED` (`duplicate:true`), `ALREADY_FILLED`, `UNKNOWN_ORDER` | `UNKNOWN_ORDER` also for orders the engine **rejected** |
| Configure/Halt/Resume | `OK`, `NOOP` (already in that state), `REJECTED` (`UNKNOWN_ASSET` or `INVALID_CONFIG`) | no `order_id`, has `asset` |

**Engine validation order (so you can pre-check identically and never waste a reservation).** First failing check wins:

1. asset unknown → `UNKNOWN_ASSET`
2. asset not ACTIVE → `ASSET_HALTED`
3. MARKET with tif ≠ IOC → `INVALID_TIF`
4. `qty < min_qty` or `qty > max_qty` → `INVALID_QTY`
5. `price < 1` or `> 2^53-1` → `INVALID_PRICE`
6. `price % tick_size != 0` → `PRICE_NOT_ON_TICK`
7. `collar_max_price` set and `price > collar` → `PRICE_ABOVE_COLLAR`
8. `price * qty > 2^53-1` → `NOTIONAL_OVERFLOW`

`ConfigureAsset` is rejected `INVALID_CONFIG` when `tick_size==0`, `min_qty==0`, `max_qty<min_qty`, `collar==0`, or any value `> 2^53-1`.

### 4.5 SSE stream `GET /v1/events?after=<seq>&epoch=<epoch>`

| Query | Meaning |
|---|---|
| `after` | Resume after this seq. Server sends `after+1 ...`. **Omitted = live only (current seq), no replay** |
| `epoch` | If given and different from the engine's epoch → `409 EPOCH_MISMATCH` with `details.current_epoch` |

Failure responses before the stream opens (envelope as 4.1):

| HTTP | code | Meaning | Your reaction |
|---|---|---|---|
| 409 | `EPOCH_MISMATCH` | WAL was recreated. All seq/trade ids you hold belong to a dead epoch | Run **EpochRebuild** (6.9) |
| 409 | `AFTER_IN_FUTURE` (`details.current_seq`, `current_epoch`) | Your offset is ahead of the engine | Fatal inconsistency. Halt trading, alert, operator action (6.9) |
| 410 | `GONE` (`details.ring_start_seq`) | Your offset fell off the ring | Unrecoverable for missed trades. Halt, alert (4.6) |
| 503 | `TOO_MANY_SUBSCRIBERS` | Cap is 8 | Use **exactly one** SSE connection. Back off and retry |
| 400 | `VALIDATION_FAILED` | `after` not a non-negative integer | bug |

**Frames** (UTF-8, `\n\n` separated; `id:`/`event:`/`data:` lines; comments start with `:`):

| `event:` | `id:` | `data:` | Notes |
|---|---|---|---|
| `hello` | none | `sse.hello.schema.json`: `{engine_epoch,current_seq,ring_start_seq,assets:[{asset,status}],server_time}` | First frame. Verify `engine_epoch` equals your stored epoch |
| `book` | none | `book.snapshot.schema.json` (depth 15, includes `ts`, `as_of_seq`) | One per asset right after `hello`, then ~every 100 ms per asset that changed. **Not part of the sequenced stream. Never advance the offset on it** |
| `<EventType>` e.g. `TradeExecuted` | `<seq>` | `event.envelope.schema.json` variant | The sequenced stream. `event:` equals `data.type` |
| `gone` | none | `{ring_start_seq}` | Mid-stream: you fell behind the ring. Stream then closes |
| `: hb` (comment) | | | Heartbeat every 15 s. Treat 45 s of silence as a dead connection and reconnect |

Use `fetch` streaming plus the frame parser from `tools/engine-cli/src/client.ts` (`parseSseFrame`). Do **not** use the browser `EventSource` API (cannot set `X-Engine-Token`).

### 4.6 Sequencing guarantees you may rely on

- `seq` is **global across all assets, strictly increasing, contiguous** (`1,2,3,...`). A gap means a bug: close the stream, reconnect with `after=<last applied>`.
- `trade_id = "{engine_epoch}:{seq of the TradeExecuted event}"`. Reproduced exactly on WAL replay. Pattern `^e-[0-9a-z]{8}:[1-9][0-9]*$`.
- `ts` is engine wall-clock ms, non-decreasing, stored in the WAL; replay is deterministic.
- Events and replies are released **only after the command is durable** (`always` and `batch` fsync policies). So an acknowledged command survives a crash. The command reply HTTP response can arrive **after** its events are already on the SSE stream; your consumer must not depend on ordering between the HTTP reply and the SSE events.
- Ring is in memory, default 300 000 events. There is **no** historical trade API (finding E3). Keep the consumer connected; alert when `engine.seq - consumer_offset > RING_CAPACITY/2`.

### 4.7 Durability policy

Run the engine with `FSYNC_POLICY=always` or `batch`. **Never `off`** with the real backend: it can drop acknowledged commands, after which `AFTER_IN_FUTURE` can occur and new events could reuse `seq` numbers that you have already settled.

### 4.8 Event catalogue and the exact order produced by `SubmitOrder` (**PINNED**, from `engine.rs`)

All events carry `type, engine_epoch, seq, ts, asset`. Additional fields:

| Event | Fields |
|---|---|
| `AssetConfigured` | `tick_size, min_qty, max_qty, collar_max_price, status` |
| `AssetHalted`, `AssetResumed` | none |
| `OrderAccepted` | `order_id, user_id, side, order_type, tif, price, qty` |
| `OrderRejected` | `order_id, user_id, code` (`UNKNOWN_ASSET, ASSET_HALTED, INVALID_QTY, INVALID_PRICE, PRICE_NOT_ON_TICK, PRICE_ABOVE_COLLAR, NOTIONAL_OVERFLOW, INVALID_TIF`) |
| `TradeExecuted` | `trade_id, price, qty, buy_order_id, sell_order_id, buy_user_id, sell_user_id, maker_order_id, taker_order_id, taker_side, buy_remaining, sell_remaining` |
| `OrderPartiallyFilled` | `order_id, user_id, filled_qty` (cumulative), `remaining_qty` (≥1) |
| `OrderFilled` | `order_id, user_id, filled_qty` (= original qty) |
| `OrderCanceled` | `order_id, user_id, filled_qty` (cumulative, ≥0), `remaining_qty` (≥1), `reason` (`USER, POLICY_BREACH, ADMIN, IOC_REMAINDER, NO_LIQUIDITY, SELF_TRADE_PREVENTED`) |

**Event sequence for one `SubmitOrder` that is accepted:**

1. `OrderAccepted` (the incoming/taker order).
2. For **each fill**, in price-time order: `TradeExecuted`, then **one status event for the maker**: `OrderFilled` if the maker is exhausted, else `OrderPartiallyFilled`.
3. Then exactly one **taker disposition**:
   - remaining = 0 → `OrderFilled` (taker);
   - else self-trade hit → `OrderCanceled(reason=SELF_TRADE_PREVENTED)` (earlier fills are kept; **applies to GTC too, the order does not rest**);
   - else GTC → order rests; if there were any fills, one `OrderPartiallyFilled` (cumulative); if none, nothing more;
   - else IOC/MARKET → `OrderCanceled(reason=NO_LIQUIDITY)` if zero fills, else `IOC_REMAINDER`.

Consequences (implement these, they are easy to get wrong):

- **The taker never gets a status event per fill**, only a final one. The maker gets one per fill. **Therefore account fills from `TradeExecuted.qty` only** (increment `matched_qty` on both orders). Use status events only to move the state machine. Never copy `filled_qty` from a status event into `matched_qty` (it is cumulative in the engine's epoch and breaks across EpochRebuild, see 6.9).
- **Trade price is always the maker's resting price.** A buy taker with limit 105 against a maker at 100 trades at 100, so the buyer gets **price improvement** `(limit − 100) × qty`.
- Taker side is `taker_side`; `maker_order_id`/`taker_order_id` identify roles; `buy_*`/`sell_*` identify parties.
- A cancel command yields `OrderCanceled` with the command's reason. The engine serializes cancel vs fill by `seq`.
- A halted asset **rejects new orders** (`ASSET_HALTED`) but **cancels still work**.

### 4.9 Reference trace (use as your first integration test)

U1 sells 5 @ 100 (order A rests). U2 buys 5 @ 100 (order B). Golden fixture `S14-cancel-after-fill.json` shows:

```
seq 2  OrderAccepted   A (SELL 5@100)
seq 3  OrderAccepted   B (BUY 5@100)
seq 4  TradeExecuted   trade_id e-test0001:4  price 100 qty 5  buy B  sell A  maker A  taker B  taker_side BUY  buy_remaining 0 sell_remaining 0
seq 5  OrderFilled     A filled_qty 5        (maker)
seq 6  OrderFilled     B filled_qty 5        (taker)
reply to B's submit: ACCEPTED seq 3, last_seq 6
```

Then `CancelOrder A` → `ALREADY_FILLED`, `seq:null`. All 24 scenario files under `contracts/fixtures/engine/scenarios/` give full expected output; they are your executable specification (13.3).

### 4.10 Failure semantics of `POST /v1/commands` (decides whether to release funds)

| Outcome | Was the command executed? | Required reaction |
|---|---|---|
| 200 `ACCEPTED` (any `duplicate`) | yes | proceed |
| 200 `REJECTED` with `code` and `seq != null` | yes, rejected | release funds via `applyOrderRejected` (6.3) |
| 200 `REJECTED / ORDER_ID_REUSED` (`seq:null`) | no | internal bug: `applyOrderRejected(INTERNAL)` + alert |
| 503 `ENGINE_BUSY` (`Retry-After: 1`) | **no** (never enqueued) | `applyOrderRejected(ENGINE_BUSY)`, return 503 to client |
| 503 `ENGINE_UNAVAILABLE` | assume **maybe** | leave `PENDING_SUBMIT`, resolver resubmits |
| 504 `COMMAND_TIMEOUT` ("may still execute") | **maybe** | leave `PENDING_SUBMIT`, resolver resubmits |
| network error / reset / client timeout | **maybe** | same |
| 400 `VALIDATION_FAILED` | no | bug in your serializer: `applyOrderRejected(INTERNAL)` + alert |
| 401 | no | misconfigured token: alert, keep order `PENDING_SUBMIT` |

Resubmitting an identical command is always safe (dedup by `order_id`).

---

## 5. Data model (PostgreSQL) — **PROPOSED**, derived from Blueprint Sections 13, 14, 18

Conventions: `BIGINT` for all money/qty/price/seq/ts; `CHECK (... >= 0)` on every balance; timestamps `timestamptz` except engine times (`bigint` epoch ms, named `*_ts`). Use a migration tool (e.g. `node-pg-migrate`). The application DB role has `INSERT, SELECT` only on `ledger_txns`, `ledger_entries`, `audit_events` (revoke `UPDATE, DELETE`).

### 5.1 Tables

| Table | Columns (type) | Constraints / indexes | Owner (sole writer) |
|---|---|---|---|
| `users` | `id uuid pk`, `email citext unique`, `password_hash text`, `role text` (`USER`\|`ADMIN`), `persona text null` (seed role label), `is_simulated bool`, `rate_tier text` (`STANDARD`\|`BOT`\|`BENCH`), `created_at` | | auth |
| `assets` | `id uuid pk`, `symbol text unique`, `name`, `category`, `status text` (`ACTIVE`\|`HALTED`), `halt_reason text null`, `tick_size bigint`, `min_qty bigint`, `max_qty bigint`, `total_supply bigint`, `reference_price_minor bigint null` (from seeded candles, 10.2), `created_at` | `symbol ~ '^[A-Z0-9_-]{1,32}$'` | catalog |
| `asset_policy` | `id uuid pk`, `asset_id fk`, `face_value_minor bigint`, `ceiling_bps int`, `effective_from timestamptz`, `created_by uuid null` | unique `(asset_id, effective_from)`; ceiling = `floor(face_value_minor * ceiling_bps / 10000)` | catalog |
| `wallets` | `user_id uuid pk fk`, `available_minor bigint`, `reserved_minor bigint` | `CHECK (available_minor>=0 AND reserved_minor>=0)` | ledger |
| `holdings` | `user_id fk`, `asset_id fk`, `available_qty bigint`, `reserved_qty bigint` | pk `(user_id, asset_id)`, non-negative checks | ledger |
| `orders` | `id uuid pk` (= engine `order_id`), `user_id fk`, `asset_id fk`, `side`, `type` (`LIMIT`\|`MARKET`), `tif`, `limit_price_minor bigint` (for MARKET: the protection price), `qty bigint`, `matched_qty bigint default 0`, `settled_qty bigint default 0`, `status text`, `reject_code text null`, `cancel_reason text null`, `accepted_seq bigint null`, `engine_epoch text null`, `epoch_base_matched bigint default 0`, `submit_attempts int default 0`, `submitted_at timestamptz null`, `created_at`, `updated_at` | `CHECK (matched_qty<=qty AND settled_qty<=matched_qty)`; idx `(status)`, `(user_id, created_at desc)`, `(asset_id, status)` | see 6.0 |
| `trades` | `id text pk` (= `trade_id`), `asset_id fk`, `buy_order_id fk`, `sell_order_id fk`, `buy_user_id`, `sell_user_id`, `price_minor`, `qty`, `seq`, `engine_epoch`, `ts bigint` (engine ms), `taker_side`, `venue text default 'BOOK'`, `state text` (`PENDING_SETTLEMENT`\|`SETTLED`\|`SETTLEMENT_FAILED`), `settle_attempts int default 0`, `last_error text null`, `ledger_txn_id uuid null`, `accepted_at`, `settled_at null` | unique `(engine_epoch, seq)`; idx `(state, seq)`, `(asset_id, ts desc)` | consumer inserts; settlement updates state |
| `reservations` | `id uuid pk`, `owner_id uuid`, `kind text` (`FUNDS`\|`UNITS`), `asset_id uuid null`, `ref_type text` (`ORDER`\|`AUCTION`), `ref_id uuid`, `original bigint`, `remaining bigint`, `status text` (`ACTIVE`\|`CLOSED`) | unique `(ref_type, ref_id, kind)`; `remaining>=0` | ledger |
| `ledger_accounts` | `id uuid pk`, `owner_kind text` (`USER`\|`SYSTEM`), `owner_id uuid null`, `kind text` (`AVAILABLE`\|`RESERVED`\|`FAUCET`\|`ISSUANCE`), `commodity text` (`CREDIT` or asset symbol) | unique `(owner_id, kind, commodity)` | ledger |
| `ledger_txns` | `id uuid pk`, `ref_type text`, `ref_id text`, `created_at` | unique `(ref_type, ref_id)` | ledger |
| `ledger_entries` | `id bigserial pk`, `txn_id fk`, `account_id fk`, `amount bigint` (signed, non-zero) | append-only. Per `(txn_id, commodity)` the sum is 0 | ledger |
| `auctions` | `id uuid pk`, `seller_id`, `asset_id`, `qty bigint`, `start_price_minor`, `floor_price_minor`, `step_seconds int`, `decrement_minor bigint`, `start_time timestamptz`, `end_time timestamptz`, `status` (`ACTIVE`\|`SOLD`\|`EXPIRED`\|`CANCELED`), `winner_id null`, `accepted_price_minor null`, `sold_at null`, `ledger_txn_id null` | `CHECK (floor<=start AND floor>=1 AND qty>=1)` | auctions |
| `candles` | `asset_id`, `interval text` (`5s`\|`1m`), `open_time bigint` (ms), `open_minor, high_minor, low_minor, close_minor, volume, trade_count`, `origin text` (`ENGINE`\|`SEEDED_SIM`) | pk `(asset_id, interval, open_time)` | market-data |
| `idempotency_keys` | `user_id`, `key text`, `request_hash text`, `state` (`IN_PROGRESS`\|`DONE`), `order_id uuid null`, `status_code int null`, `response jsonb null`, `locked_until timestamptz`, `created_at` | pk `(user_id, key)` | risk |
| `consumer_offset` | `consumer text pk` (`engine-main`), `engine_epoch text`, `last_seq bigint` | | consumer |
| `recon_runs` | `id uuid pk`, `ran_at`, `verdict text` (`PASS`\|`FAIL`), `details jsonb` | | reconciliation |
| `audit_events` | `id uuid pk`, `ts`, `actor_id null`, `action text`, `entity text`, `entity_id text`, `request_id text`, `details jsonb` | append-only | audit |

### 5.2 Money rules

- Single currency `CREDIT`, integer **minor units**, no fees in the MVP.
- Units are fungible per asset (no serials).
- Supply conservation (R4): per asset `Σ(holdings.available_qty + reserved_qty) = assets.total_supply`; credits: `Σ(wallets) = Σ(FAUCET issuance)`.

### 5.3 Ledger model

Signed `amount`. Debit-style conventions are irrelevant; only "sum per commodity per transaction = 0" matters. System accounts: `FAUCET/CREDIT` (goes negative when it issues credits), `ISSUANCE/<symbol>` (goes negative when it mints units).

| Operation | `ref_type` : `ref_id` | Entries |
|---|---|---|
| Starter credits | `FAUCET` : `<user_id>` | `FAUCET/CREDIT −c`, `user AVAILABLE/CREDIT +c` |
| Initial units | `ISSUE` : `<user_id>:<symbol>` | `ISSUANCE/sym −u`, `user AVAILABLE/sym +u` |
| Buy order reserve | `ORDER_RESERVE` : `<order_id>` | `AVAILABLE/CREDIT −x`, `RESERVED/CREDIT +x` where `x = limit_price × qty` |
| Sell order reserve | `ORDER_RESERVE` : `<order_id>` | `AVAILABLE/sym −q`, `RESERVED/sym +q` |
| Order release (cancel/reject) | `ORDER_RELEASE` : `<order_id>:<engine seq or 'api'>` | reverse of reserve for the released amount |
| Trade settlement | `TRADE` : `<trade_id>` | see 6.5 |
| Auction escrow | `AUCTION_RESERVE` : `<auction_id>` | `seller AVAILABLE/sym −q`, `RESERVED/sym +q` |
| Auction sale | `AUCTION_SALE` : `<auction_id>` | see 6.11 |
| Auction release | `AUCTION_RELEASE` : `<auction_id>` | `RESERVED/sym −q`, `AVAILABLE/sym +q` |

Wallet/holding rows are **materialized mirrors** updated in the same transaction as the ledger entries. Reconciliation R2 proves mirrors equal ledger sums.

---

## 6. Core algorithms

### 6.0 Single-writer table (the rule that prevents double-spend)

| Fact | Only writer | Others may |
|---|---|---|
| `orders` row **creation**, `status='PENDING_SUBMIT'`, submit metadata (`submit_attempts`, `submitted_at`) | `orders` module (intake and resolver) | |
| `orders.status` after `PENDING_SUBMIT`, `matched_qty`, `accepted_seq`, `engine_epoch`, `cancel_reason` | **engine consumer** | The `applyOrderRejected()` function (below) may flip `PENDING_SUBMIT → REJECTED` and release funds. It is guarded by `WHERE status='PENDING_SUBMIT'`, so whoever runs first wins and the other is a no-op. This is the **only** exception |
| `orders.settled_qty`, `trades.state`, ledger entries for trades | **settlement worker** | |
| Wallet/holding/reservation mutations | `ledger` module functions only (`reserve`, `release`, `consume`, `transfer`), called by intake, consumer, settlement, auctions | No module writes those tables directly |
| `consumer_offset` | consumer | |
| `candles` | market-data (consumer feeds it) | |

### 6.1 Boot sequence

1. Run migrations. Verify DB connectivity and that `ledger_*` privileges are restricted.
2. Load assets and their current policy into memory (refresh every 30 s and on admin change).
3. `GET /healthz` on engine; wait until `status:"ok"` (retry with backoff, do not crash).
4. Open the SSE stream (6.4 step A). The `hello` frame lists the engine's assets.
5. For every DB asset **not present in `hello.assets`**, or after an epoch change, send `ConfigureAsset` (4.3): `tick_size, min_qty, max_qty` from `assets`, `status` from `assets.status`, and `collar_max_price = floor(ceiling / tick_size) * tick_size` (the mechanical tripwire equal to the ceiling). `ConfigureAsset` always emits an `AssetConfigured` event, so only send it when needed.
6. Start: resolver, settlement worker, auction sweeper, policy sweeper, reconciliation timer, WS gateway, HTTP server. **Do not accept `POST /orders` until step 5 is complete.**

### 6.2 Order intake — `POST /orders`

1. Authenticate (JWT). Apply the per-user rate limit (Section 8.6).
2. Parse body (zod). Accept `quantity` (canonical) or `qty` (alias). `asset` is the **symbol** (also accept the asset UUID).
3. **Idempotency**: header `Idempotency-Key` is required: 1 to 128 printable ASCII characters, **not** necessarily a UUID (the simulator sends `<botKey>-<n>-<uuid>`). Compute `request_hash = sha256(method + path + canonical-json(body))`.
   - Redis `SET idem:<user>:<key> NX EX 86400` is only a fast path. The authoritative store is the `idempotency_keys` row.
   - Existing row, different hash → `409 IDEMPOTENCY_CONFLICT`.
   - Existing row `DONE` → replay stored `status_code` and `response` verbatim.
   - Existing row `IN_PROGRESS` with `order_id` set and `locked_until` in the past → **resume**: reload the order; if still `PENDING_SUBMIT` re-run step 6 with the persisted fields. If `locked_until` in the future → `409 REQUEST_IN_PROGRESS` with `Retry-After: 1`.
   - Row stored for **2xx and 4xx** outcomes. **Never store 5xx/ENGINE_BUSY** as final: the simulator retries 5xx with the same key (200 ms, 600 ms) and expects the retry to execute.
4. **Validate with no money touched** (return `422`/`400` and store the response):
   - asset exists; `assets.status='ACTIVE'` else `ASSET_NOT_TRADABLE`;
   - `quantity` integer, `min_qty <= qty <= max_qty` (`VALIDATION_FAILED`, `details:{field,min,max}`);
   - `price` integer `>= 1`, `price % tick_size == 0` (`VALIDATION_FAILED`, `details:{field:"price",tick_size}`);
   - `type=MARKET` → force `tif='IOC'`. `type=LIMIT` → `tif` defaults `GTC`;
   - **price ceiling**: `price <= ceiling` else `422 PRICE_ABOVE_CEILING` with `details:{ceiling_minor, face_value_minor, ceiling_bps, price}` (**single choke-point function** `assertWithinCeiling(asset, price)`, shared with auctions);
   - `price * qty <= 2^53-1`;
   - max open orders and holding cap (Section 12);
   - **MARKET protection price** is **required** (the simulator always sends it as `price`). If a client omits it, derive per Section 12 default. It must satisfy the same ceiling and tick checks.
5. **One transaction**:
   1. `pg_advisory_xact_lock(hashtext(user_id))` (serializes the open-order count check per user).
   2. Generate `order_id = uuidv7()`.
   3. BUY: `x = limit_price_minor × qty`.
      ```sql
      UPDATE wallets SET available_minor = available_minor - $x, reserved_minor = reserved_minor + $x
       WHERE user_id = $u AND available_minor >= $x;      -- 0 rows → INSUFFICIENT_FUNDS
      ```
      SELL:
      ```sql
      UPDATE holdings SET available_qty = available_qty - $q, reserved_qty = reserved_qty + $q
       WHERE user_id = $u AND asset_id = $a AND available_qty >= $q;   -- 0 rows → INSUFFICIENT_HOLDINGS
      ```
      Units already escrowed in an auction are not `available`, so one unit cannot be in an order and an auction.
   4. Insert `orders` (`PENDING_SUBMIT`, all fields), `reservations` (`ORDER`, `FUNDS` or `UNITS`, `original=remaining=x or q`), ledger txn `ORDER_RESERVE:<order_id>`, `audit_events`, and the `idempotency_keys` row (`IN_PROGRESS`, `order_id`, `locked_until = now()+10s`).
   5. Commit. On `INSUFFICIENT_*`, roll back and store the 422 response in the idempotency row.
6. **Engine call** with exactly the fields in 4.3. Send `user_id = users.id`. Timeout `ENGINE_CMD_TIMEOUT_MS`. Increment `orders.submit_attempts`, set `submitted_at`.
7. **Map the outcome** per 4.10:

| Engine result | `orders` action | HTTP response to client | Store idempotency as |
|---|---|---|---|
| `ACCEPTED` | none (consumer will move it to `OPEN`) | **`202`** `{ "order_id", "status":"PENDING_SUBMIT", "engine_seq": <reply.seq> }` | `DONE` 202 |
| `REJECTED` (`code`, seq) | `applyOrderRejected(order_id, code)` | mapped 422 (table below) | `DONE` |
| `ENGINE_BUSY` | `applyOrderRejected(order_id,'ENGINE_BUSY')` | `503 ENGINE_BUSY` + `Retry-After: 1` | **delete row** (retryable) |
| timeout / unavailable / network | none (resolver resubmits) | `503 ENGINE_UNAVAILABLE` + `Retry-After: 1` | keep `IN_PROGRESS`, `locked_until = now()` (so the client's retry resumes it) |

Engine reject code → API error:

| Engine `code` | API error code (HTTP) | Comment |
|---|---|---|
| `ASSET_HALTED`, `UNKNOWN_ASSET` | `ASSET_NOT_TRADABLE` (422) | |
| `PRICE_ABOVE_COLLAR` | `PRICE_ABOVE_CEILING` (422) | Your own check should have caught it: log `alert=collar_tripwire` |
| `INVALID_QTY`, `INVALID_PRICE`, `PRICE_NOT_ON_TICK`, `NOTIONAL_OVERFLOW`, `INVALID_TIF` | `VALIDATION_FAILED` (400) | Your step 4 should have caught it: log a warning |
| `ORDER_ID_REUSED`, `INVALID_CONFIG` | `INTERNAL` (500) | bug, alert |

**Important consequence:** a self-trade, a market order with no liquidity, or an IOC remainder are **not** synchronous errors. The engine accepts the order, then emits `OrderCanceled`. The client learns about it as the order's final state (`CANCELED` with `cancel_reason`) through `GET /me/orders`/WebSocket. Do not invent a synchronous `NO_LIQUIDITY` or `SELF_TRADE_PREVENTED` 422 on the submit path. Those two codes in `error-codes.json` are used as **`cancel_reason` display codes** and in WS order updates.

#### `applyOrderRejected(order_id, code)` (idempotent)

```
BEGIN;
  UPDATE orders SET status='REJECTED', reject_code=$code, updated_at=now()
   WHERE id=$id AND status='PENDING_SUBMIT' RETURNING *;
  if no row: COMMIT; return;                       -- already handled
  ledger.releaseAll(reservation of ORDER $id)      -- full remaining released back to AVAILABLE
COMMIT;  then emit private WS order update.
```

### 6.3 Cancel — `DELETE /orders/:id`

1. Auth, `Idempotency-Key` required, rate limit.
2. Load order. Not found or not owned → `404 ORDER_NOT_FOUND` (do not leak existence).
3. `status` rules: `OPEN` or `PARTIALLY_FILLED` → continue. `CANCELED` → `200` idempotent `{order_id,status:"CANCELED"}`. `PENDING_SUBMIT` → `409 ORDER_NOT_CANCELABLE` with `details:{reason:"not_yet_submitted", retry_after_ms:500}`. `FILLED`/`REJECTED` → `409 ORDER_NOT_CANCELABLE`.
4. Send `CancelOrder{order_id, reason:"USER"}`.
5. Engine replies:

| Reply | HTTP |
|---|---|
| `CANCELED` (`remaining_qty`, `seq`) | `200 {order_id, status:"CANCELED", remaining_qty}`. First `await consumer.waitForOffset(seq, 1000)` so that the released balance is visible to the caller's next `GET /me/wallet` (read-your-writes). Do not block longer than 1 s |
| `ALREADY_CANCELED` | `200` same body (idempotent) |
| `ALREADY_FILLED`, `UNKNOWN_ORDER` | `409 ORDER_NOT_CANCELABLE` |
| 503/504/network | `503 ENGINE_UNAVAILABLE`; the client retries with the same key (cancel is idempotent at the engine) |

6. The **release of the reservation happens only in the consumer** on `OrderCanceled` (6.4). The cancel handler never touches balances.

### 6.4 Engine consumer (single writer of order state)

One long-lived loop. Exactly **one** SSE connection (cap is 8 across all clients incl. `engine-cli`).

**A. Connect.**

```
row = SELECT * FROM consumer_offset WHERE consumer='engine-main'
if none:   url = /v1/events?after=0                      -- requires ring_start_seq == 1, else GONE
else:      url = /v1/events?after=<last_seq>&epoch=<engine_epoch>
```
Handle the failure table in 4.5. On `hello`: assert `hello.engine_epoch == stored epoch` (if no row, create it with `last_seq=0`). Refresh the known asset statuses from `hello.assets`.

**B. Per sequenced frame.** Group frames that arrive together into one DB transaction (max 200 events or 20 ms) to reach throughput. Inside the transaction:

```
for ev in batch (ascending seq):
   if ev.seq <= last_seq:  continue                       -- duplicate on resume
   if ev.seq != last_seq+1: ABORT, reconnect with after=last_seq  -- gap = bug, never skip
   apply(ev)                                              -- table below
   last_seq = ev.seq
UPDATE consumer_offset SET last_seq = last_seq, engine_epoch = ... ;
COMMIT
afterCommit: publish to Redis (6.8), update caches, feed candle aggregator
```
If `apply` throws for a **business-invariant** reason, ROLLBACK, `HaltAsset` for that asset on the engine and in `assets` (`halt_reason`), raise an alert, and **do not advance the offset past that event** until an operator resolves it (retry loop with backoff). Never skip an event.

**C. `apply(ev)` per event type.**

| Event | Action |
|---|---|
| `OrderAccepted` | `UPDATE orders SET status='OPEN', accepted_seq=ev.seq, engine_epoch=ev.engine_epoch WHERE id=ev.order_id AND status='PENDING_SUBMIT'`. If the order is already `OPEN`/`PARTIALLY_FILLED` (re-accept after EpochRebuild), only update `accepted_seq` and `engine_epoch`. If the order id is unknown to the DB (submitted by `engine-cli` or a stale epoch): log `warn unknown_order`, skip, still advance offset |
| `OrderRejected` | `applyOrderRejected(order_id, ev.code)` (same guarded function) |
| `TradeExecuted` | (1) `INSERT INTO trades(...) state='PENDING_SETTLEMENT' ON CONFLICT (id) DO NOTHING`; if it inserted 0 rows, skip the rest (replay). (2) `UPDATE orders SET matched_qty = matched_qty + ev.qty` for `buy_order_id` and `sell_order_id` (CHECK enforces `<= qty`). (3) afterCommit: feed candles, publish `TradeTick` |
| `OrderPartiallyFilled` | `UPDATE orders SET status='PARTIALLY_FILLED' WHERE id=... AND status IN ('OPEN','PARTIALLY_FILLED')` |
| `OrderFilled` | `UPDATE orders SET status='FILLED' WHERE id=... AND status IN ('OPEN','PARTIALLY_FILLED')`. **Assert** `matched_qty - epoch_base_matched == ev.filled_qty`; mismatch → invariant alert + halt asset |
| `OrderCanceled` | `UPDATE orders SET status='CANCELED', cancel_reason=ev.reason WHERE id=... AND status IN ('OPEN','PARTIALLY_FILLED')`. Then release **exactly `ev.remaining_qty`** of escrow: BUY → `limit_price_minor × remaining_qty` funds; SELL → `remaining_qty` units, via `ledger.release(reservation, amount)` with ledger ref `ORDER_RELEASE:<order_id>:<ev.seq>`. Assert `reservation.remaining >= amount` (the rest is held for trades not yet settled). If the order is already `FILLED`/`CANCELED`: alert (engine guarantees no fill after cancel) |
| `AssetConfigured` / `AssetHalted` / `AssetResumed` | Mirror into an in-memory map and Redis (`asset:status:<SYM>`). Do **not** overwrite `assets.status` (your DB is the authority; the engine is a mirror) |

Cancel and trade settlement **commute**: a buy order reserved `limit × qty`. Every trade consumes `limit × trade_qty` of that reservation (see 6.5) and a cancel releases `limit × remaining_qty`. The sum equals `limit × qty` regardless of order. Do not make the release depend on settlement having happened.

**D. Book frames** (`event: book`): never touch the DB or the offset. `SET book:<SYM>` in Redis (latest wins) and publish to `md:book:<SYM>` (6.8).

**E. Liveness**: no frame (including `: hb`) for 45 s → drop the connection and reconnect (backoff 200 ms → 5 s). Expose `consumer_lag = engine /healthz seq − last_seq` on `/metrics`.

### 6.5 Settlement worker

Loop every 25 ms (or on a wake-up from the consumer): `SELECT id FROM trades WHERE state='PENDING_SETTLEMENT' ORDER BY seq LIMIT $SETTLE_BATCH`.

**Per batch, one transaction:**

1. Lock wallets and holdings of all involved users **in deterministic order** (`ORDER BY user_id, asset_id`, `FOR UPDATE`). This avoids deadlocks with intake.
2. For each trade (ascending `seq`):
   - Load `buy_order.limit_price_minor` (call it `L`). Trade price `p`, qty `q`, `p <= L` must hold, else invariant failure.
   - Buyer's FUNDS reservation: `remaining -= L*q`. Seller's UNITS reservation: `remaining -= q`. Either going negative → invariant failure.
   - Mirrors: buyer `reserved_minor -= L*q`; seller `available_minor += p*q`; buyer `available_minor += (L-p)*q` (price improvement; zero when the buyer was the maker); seller `reserved_qty -= q`; buyer `available_qty += q` (upsert holding row).
   - `orders.settled_qty += q` for both orders.
   - Ledger txn `TRADE:<trade_id>` with entries: `CREDIT` — buyer `RESERVED −L·q`, seller `AVAILABLE +p·q`, buyer `AVAILABLE +(L−p)·q` (sums to 0); `<symbol>` — seller `RESERVED −q`, buyer `AVAILABLE +q` (sums to 0). Skip the improvement entry if `L == p`.
   - Reservation `status='CLOSED'` when `remaining == 0`.
   - `UPDATE trades SET state='SETTLED', ledger_txn_id=..., settled_at=now()`.
3. Commit, then publish `SettlementCompleted` to `user:<buyer>` and `user:<seller>`.

**Worked example.** Seller U1 rests SELL 5 @ 100. Buyer U2 submits BUY 5 @ 105 (limit). Reserved by U2 at intake: `105×5 = 525`. Engine trades 5 @ **100** (maker price). Settlement: U2 `reserved −525`; U1 `available +500`; U2 `available +25`. U1 `reserved_qty −5`; U2 `available_qty +5`. Ledger CREDIT entries: `−525, +500, +25` = 0.

**Failure handling.** Any exception rolls back the batch. Retry the batch with backoff. If it fails again, **fall back to one transaction per trade** to isolate the poison trade. A trade that fails `SETTLE_MAX_ATTEMPTS` times → `state='SETTLEMENT_FAILED'`, `HaltAsset` on the engine and `assets.status='HALTED'`, alert, publish `SettlementFailed`. Funds/units stay reserved, so nothing is lost or duplicated. An operator endpoint `POST /admin/trades/:id/retry` resets it to `PENDING_SETTLEMENT`.

`settlement_lag = now_ms − trade.ts` per settled trade, exposed as p50/p99 on `/metrics`.

### 6.6 Resolver (closes failure window W1/W2)

Every 2 s: select `orders WHERE status='PENDING_SUBMIT' AND created_at < now() - RESOLVER_STALE_MS ORDER BY created_at LIMIT 100`. For each, resubmit **the same persisted fields** and apply the table in 6.2 step 7 (same function). A duplicate `ACCEPTED` is a success. If an order is still `PENDING_SUBMIT` 60 s after the engine answered `ACCEPTED`, the consumer is stuck: alert `consumer_stalled`.

### 6.7 Policy sweeper

When an admin creates a new `asset_policy` version (face value or `ceiling_bps` changed): (1) update the in-memory policy; (2) send `ConfigureAsset` with the new collar (resting orders are untouched by the engine); (3) for each `OPEN`/`PARTIALLY_FILLED` order whose price exceeds the new ceiling send `CancelOrder{reason:"POLICY_BREACH"}` and write an audit event. The consumer releases the escrow as usual.

### 6.8 Market data fan-out

Redis (ephemeral, rebuildable, never a source of truth):

| Redis key / channel | Content | Producer |
|---|---|---|
| `book:<SYM>` (string) | latest `book` frame JSON | consumer |
| `stats:<SYM>` (hash) | `last_price, last_ts, last_seq, change_bps, session_open` | consumer after each trade |
| Pub/Sub `md:book:<SYM>` | book frame | consumer |
| Pub/Sub `md:trades:<SYM>` | `TradeTick` | consumer |
| Pub/Sub `md:candles:<SYM>:<interval>` | `CandleUpdate` | aggregator |
| Pub/Sub `md:market` | stats tick | consumer (throttle 1/s per asset) |
| Pub/Sub `md:user:<USER_ID>` | private order/settlement updates | consumer, settlement, auctions |
| Pub/Sub `md:auction:<ID>` | `AuctionPriceUpdate` | auction ticker |

Rules: Pub/Sub is lossy. Clients recover through REST snapshots. Book frames are conflatable (the engine already throttles to ≤10/s per asset). Trades and private events are not conflatable.

**Candle aggregation (use `@darkhold/candles`, do not re-implement):**

- One `CandleAggregator({ intervals:['5s','1m'], origin:'ENGINE' })` per asset. For each `TradeExecuted` call `applyTick({ seq: ev.seq, ts: ev.ts, price: ev.price, qty: ev.qty })`. `updated` candles → publish `CandleUpdate`; `closed` candles → upsert into `candles` (`ON CONFLICT (asset_id,interval,open_time) DO UPDATE`).
- A timer every 1 s calls `flush(Date.now())` to close candles whose bucket has ended **even without a new trade**. Flushing never invents a candle for an empty bucket.
- **Restart rebuild**: load the current-bucket trades from `trades` (`WHERE ts >= min(open of active buckets)`), the newest `ENGINE` closed `open_time` per interval from `candles`, then `rebuildActive(ticks, ['5s','1m'], 'ENGINE', lastClosedOpenTimes)`, upsert `closed`, and `aggregator.restore({active, lastSeq})`.
- Auction sales and seeded history are **not** fed into the ENGINE aggregator. Seeded candles are loaded once from `candles.seeded.json` with `origin='SEEDED_SIM'` (10.3).
- No trades → no candle and no price tick. Heartbeats and book frames continue.

### 6.9 Epoch change and divergence (EpochRebuild)

Occurs when the WAL volume was wiped (the "reset demo" flow) → `409 EPOCH_MISMATCH`.

1. Set an in-memory `tradingPaused=true` (new orders get `ASSET_NOT_TRADABLE`). Close the SSE stream.
2. Send `ConfigureAsset` for every DB asset to the new engine.
3. Take the **old-epoch** state in the DB as truth. Orders with `status IN ('OPEN','PARTIALLY_FILLED')` ordered by `accepted_seq` ascending, then `PENDING_SUBMIT` by `created_at`: resubmit each with the **same `order_id`**, `qty = qty − matched_qty`, same price, `tif='GTC'` for `LIMIT`. Set `orders.epoch_base_matched = matched_qty` first. A previously uncrossed book re-inserted in accept order will not cross.
4. `UPDATE consumer_offset SET engine_epoch=<new>, last_seq=0`. Reconnect with `after=0`; the consumer reprocesses `AssetConfigured` and the `OrderAccepted` events as no-ops/updates (6.4 C).
5. Settlement of any `PENDING_SETTLEMENT` trades continues independently (they carry the old `trade_id`s).
6. `tradingPaused=false`.

`AFTER_IN_FUTURE` and `GONE` are **not** auto-repairable (they imply events or trades were lost). Required behavior: `tradingPaused=true`, `HaltAsset` for all assets, alert `engine_divergence`, and wait for an operator to run the "reset engine" runbook (wipe WAL, restart engine, then EpochRebuild).

### 6.10 Reconciliation

Run on a 60 s timer and on `POST /admin/reconcile`. All checks must pass for `verdict=PASS`; store `details` and write an audit event. A failed check halts the affected asset (R6, R7) or all trading (R1, R2, R4, R8) and alerts.

| # | Check | Notes |
|---|---|---|
| R1 | Every ledger txn sums to 0 per commodity | `GROUP BY txn_id, commodity HAVING SUM(amount) <> 0` |
| R2 | `wallets` and `holdings` equal ledger sums per account | recompute from `ledger_entries` |
| R3 | `Σ reserved_minor = Σ ACTIVE FUNDS reservation.remaining`; per asset `Σ reserved_qty = Σ ACTIVE UNITS reservation.remaining` | |
| R4 | `Σ units per asset = total_supply`; `Σ credits = Σ FAUCET issued` | |
| R5 | No `trades.state='PENDING_SETTLEMENT'` with `accepted_at` older than 30 s; none `SETTLEMENT_FAILED` | |
| R6 | Engine `GET /v1/open-orders` equals DB orders in `OPEN`/`PARTIALLY_FILLED` (order id, price, `remaining_qty = qty − matched_qty`) | **Only compare when `consumer_offset.last_seq == open-orders.as_of_seq`** (retry up to 5× with 100 ms sleeps, else report `INCONCLUSIVE`, not FAIL). Exclude `PENDING_SUBMIT` |
| R7 | Every trade price `<=` the ceiling of the `asset_policy` in force at `trade.ts` | |
| R8 | No negative balances, quantities, or `matched_qty > qty` | |

### 6.11 Dutch auction (no engine involvement)

**Create** — `POST /auctions` (idempotency key required). Body is **PINNED** by `sim/apiClient.ts`:

```json
{ "asset":"DFEST-WKND", "quantity":5, "start_price":11000, "floor_price":9000,
  "step_seconds":10, "duration_seconds":120 }
```
Optional `decrement` (minor units per step). If omitted: `steps = max(1, floor(duration_seconds/step_seconds))`, `decrement = ceil((start_price − floor_price) / steps)`.

Validate: seller owns units (`holdings.available_qty >= quantity`), `start_price <= ceiling` (**same** `assertWithinCeiling`, else `PRICE_ABOVE_CEILING`), `1 <= floor_price <= start_price`, `step_seconds >= 1`, `duration_seconds >= step_seconds`. One transaction: move seller units `AVAILABLE → RESERVED`, insert `reservations(ref_type='AUCTION')`, insert auction `ACTIVE` with `start_time = now()` (**database time**), `end_time = start_time + duration`, ledger `AUCTION_RESERVE`, audit.

**Price** is a pure function of database time:
`price(t) = max(floor, start − floor((t − start_time)/step_seconds) × decrement)`, and the auction is not buyable at or after `end_time`.

**Accept** — `POST /auctions/:id/accept` body `{ "max_price": <int> }`, idempotency key required. One transaction:

1. `SELECT ... FROM auctions WHERE id=$1 FOR UPDATE`.
2. `status <> 'ACTIVE'`: `SOLD` → `409 AUCTION_ALREADY_SOLD`; others → `409 AUCTION_NOT_ACTIVE`. `now() >= end_time` → `409 AUCTION_NOT_ACTIVE` (lazy expiry, never rely on the sweeper).
3. Recompute `p` using DB `now()`. If `p > max_price` → `409 PRICE_MOVED` with `details:{current_price_minor}`. (Price only decreases, so a late request never costs more than displayed.)
4. Buyer must not be the seller (`403 FORBIDDEN`). Holding-cap check (Section 12).
5. `cost = p × qty`. Conditional debit: `UPDATE wallets SET available_minor = available_minor - cost WHERE user_id=$b AND available_minor >= cost` → 0 rows: rollback, `422 INSUFFICIENT_FUNDS` (auction stays `ACTIVE`).
6. Credit seller `available_minor += cost`. Move seller `reserved_qty -= qty`; buyer `available_qty += qty`. Close the auction reservation. Ledger txn `AUCTION_SALE:<auction_id>`: CREDIT `buyer AVAILABLE −cost, seller AVAILABLE +cost`; `<symbol>` `seller RESERVED −qty, buyer AVAILABLE +qty`. Auction → `SOLD`, `winner_id`, `accepted_price_minor=p`, `sold_at`.
7. Response `200`: `{ auction_id, asset, qty, accepted_price_minor, total_minor, ledger_txn_id, sold_at }`. The concurrent second acceptor blocks on the row lock, then sees `SOLD`.

**Sweeper** every 1 s: `UPDATE auctions SET status='EXPIRED' WHERE status='ACTIVE' AND end_time <= now() RETURNING id`, then release escrow (`AUCTION_RELEASE`). **Cancel** — `DELETE /auctions/:id` by the seller while `ACTIVE` → `CANCELED` and release escrow. **Ticker**: every 1 s publish `AuctionPriceUpdate` for each `ACTIVE` auction to `md:auction:<ID>`.

Auction sales are recorded as ledger transactions and appear in `/me/transactions` with `venue:"AUCTION"`. They are **excluded from candles**.

---

## 7. Conventions and error catalogue

### 7.1 Conventions

| Item | Rule | Tag |
|---|---|---|
| Base URL / ports | REST `http://api:4000`, WS `ws://api:4000/ws` | PINNED |
| Auth | `Authorization: Bearer <jwt>` (HS256, claims `sub`=user id, `role`, `iat`, `exp`) | PINNED (sim sends `Bearer`) |
| Idempotency | Header `Idempotency-Key` (1 to 128 printable ASCII) **required** on `POST /orders`, `DELETE /orders/:id`, `POST /auctions`, `POST /auctions/:id/accept`, `DELETE /auctions/:id`. Missing → `400 VALIDATION_FAILED` | PINNED (sim sends it on all of these) |
| Request id | Accept `X-Request-Id` or generate; echo in the response header and in the error envelope | PROPOSED |
| Numbers | JSON integers only. Never strings for money/qty | PINNED |
| Time | Engine times (`ts`, candle `openTime`) are epoch **ms** integers. Row timestamps in REST domain resources are ISO-8601 UTC strings | PROPOSED |
| Lists | `{ "items": [...], "next_cursor": "<opaque>"\|null }`. Cursor pagination, `limit` default 50, max 200 | PINNED shape (sim reads `items`) |
| Naming rule | **REST domain resources** (assets, orders, wallet, holdings, transactions, auctions) use `snake_case` with `_minor` on money. **Market-data payloads** (book, trades feed, candles) use the engine/candle schema names: `price`, `qty`, `ts`, `openTime`, `tradeCount`. Do not mix inside one resource | PINNED by sim readers |
| Symbols vs ids | Anywhere an asset is addressed in a path (`/assets/:id/...`), accept **either** the UUID or the symbol. The simulator calls `/assets/DFEST-WKND/book` (it falls back to the symbol when it has no id) | PINNED |

### 7.2 Error envelope (**PROPOSED**, compatible with sim `errorFrom`)

```json
{ "error": { "code": "PRICE_ABOVE_CEILING", "message": "Resale cap for DFEST-WKND is 12000 (120% of face value 10000)",
             "details": { "ceiling_minor": 12000, "face_value_minor": 10000, "ceiling_bps": 12000, "price": 13000 },
             "request_id": "..." } }
```
`details` is always present (`{}` if unused). `message` is human-readable and safe to show in a toast.

### 7.3 Error codes

Codes in `contracts/error-codes.json` (layer `api`, **PINNED** names and HTTP statuses): `FORBIDDEN 403`, `RATE_LIMITED 429`, `IDEMPOTENCY_CONFLICT 409`, `EMAIL_TAKEN 409`, `INSUFFICIENT_FUNDS 422`, `INSUFFICIENT_HOLDINGS 422`, `PRICE_ABOVE_CEILING 422`, `ASSET_NOT_TRADABLE 422`, `HOLDING_CAP_EXCEEDED 422`, `MAX_OPEN_ORDERS 422`, `ORDER_NOT_FOUND 404`, `ORDER_NOT_CANCELABLE 409`, `SELF_TRADE_PREVENTED 422`, `NO_LIQUIDITY 422`, `AUCTION_NOT_ACTIVE 409`, `AUCTION_ALREADY_SOLD 409`, `PRICE_MOVED 409`.

Also reused from the transport layer: `VALIDATION_FAILED 400`, `UNAUTHENTICATED 401`, `NOT_FOUND 404`, `ENGINE_BUSY 503`, `ENGINE_UNAVAILABLE 503`, `INTERNAL 500`. (`UNAUTHENTICATED` here means a bad/expired JWT or wrong login, **not** a bad engine token.)

**Additions needed (PROPOSED).** Ask Member 1 (contract owner) to append these to `error-codes.json` as a **minor** bump (`1.1.0`, per `CHANGELOG.md`). Until merged, keep them in a local constant in `api/`:

| Code | HTTP | Layer | Message |
|---|---|---|---|
| `REQUEST_IN_PROGRESS` | 409 | api | Same idempotency key is still being processed; retry shortly |
| `ASSET_NOT_FOUND` | 404 | api | Asset does not exist |
| `AUCTION_NOT_FOUND` | 404 | api | Auction does not exist |

`SELF_TRADE_PREVENTED` and `NO_LIQUIDITY` appear as **`cancel_reason`** values and WS order updates, not as synchronous submit errors (6.2).

---

## 8. REST API contract

Every endpoint below is **JSON in, JSON out**. "Auth" = needs a Bearer token. Items marked **PINNED** are read by `sim/src/apiClient.ts` under exactly those names (it also tolerates some aliases; use the canonical names).

### 8.1 Authentication

| | |
|---|---|
| `POST /auth/register` | Body `{ "email", "password" }`. Password ≥ 8 chars. Creates user, wallet, ledger accounts, starter credits from `FAUCET` (default 500 000 minor, POLICY), audit event, in one transaction. `201` response below. Errors: `VALIDATION_FAILED`, `EMAIL_TAKEN`, `RATE_LIMITED` |
| `POST /auth/login` | Body `{ "email", "password" }` (**PINNED**). `200` response below. Wrong credentials → `401 UNAUTHENTICATED` (same message for unknown email and wrong password) |
| `GET /me` (Auth) | `{ "id","email","role","is_simulated","rate_tier","created_at" }` |

```json
{ "access_token": "<jwt>", "token_type": "Bearer", "expires_in": 900,
  "user": { "id": "<uuid>", "email": "demo-buyer@sim.darkhold.local", "role": "USER", "is_simulated": false } }
```
`access_token`, `user.id`, `expires_in` (seconds) are **PINNED**. The simulator refreshes 30 s before `expires_in` and, on a `401`, re-logs in once and retries.

Password hashing: `argon2id` with a moderate cost, or `bcrypt` cost 10. Remember the simulator performs up to 246 logins at start (Section 11).

### 8.2 Catalog and market data (public, no auth)

**`GET /assets`** → `{ "items": [Asset...] }` (**PINNED** keys marked ★)

```json
{ "id": "<uuid>", "symbol": "DFEST-WKND",                       // ★ symbol, ★ id
  "name": "Darkhold Fest Weekend Pass", "category": "FESTIVAL",
  "status": "ACTIVE",                                            // ★ ACTIVE | HALTED (sim treats any status containing "HALT" as not tradable)
  "tick_size": 10, "min_qty": 1, "max_qty": 10,                  // ★
  "face_value_minor": 10000, "ceiling_bps": 12000, "ceiling_minor": 12000,   // ★ face_value_minor and ceiling_minor
  "last_price": 10520, "last_trade_ts": 1760000000123,           // null until reference/first trade; falls back to seeded reference_price
  "change_bps": 135,                                             // vs. session open (first 1m candle in the last 6 h)
  "best_bid": 10500, "best_ask": 10540, "ask_qty": 12,           // from cached book, null if empty
  "active_auctions": 1, "has_simulated_activity": true }
```

**`GET /assets/:idOrSymbol`** → one Asset plus `total_supply`.

**`GET /assets/:idOrSymbol/book?depth=15`** → the **engine `BookSnapshot`** unchanged (**PINNED**; sim `normalizeBook` reads `asset`, `as_of_seq`, `bids`, `asks`, each level `{price, qty, orders}`):

```json
{ "asset":"DFEST-WKND", "engine_epoch":"e-1a2b3c4d", "as_of_seq":10482, "ts":1760000000123, "depth":15,
  "bids":[{"price":10500,"qty":7,"orders":2}], "asks":[{"price":10540,"qty":5,"orders":1}],
  "best_bid":10500, "best_ask":10540, "spread":40 }
```
Source: Redis `book:<SYM>` if `depth <= 15`, otherwise engine `GET /v1/books/:asset?depth=` (clamped 1..100). Empty-book fields are `[]` and `null`.

**`GET /assets/:idOrSymbol/trades?limit=50&cursor=`** → market-data shape, newest first:
`{ "items":[{ "trade_id","price","qty","ts","taker_side","seq","buyer_is_simulated","seller_is_simulated" }], "next_cursor" }`. Only `venue='BOOK'` trades. Do **not** expose user ids.

**`GET /assets/:idOrSymbol/candles?interval=5s|1m&limit=500&from=&to=`** → `{ "asset":"DFEST-WKND", "interval":"1m", "candles":[Candle...] }`, ascending by `openTime`. `Candle` is `candle.schema.json` (**PINNED**): `{interval, openTime, open, high, low, close, volume, tradeCount, origin:"ENGINE"|"SEEDED_SIM"}`. Merge seeded + closed `ENGINE` rows from `candles` + the aggregator's **active** (unclosed) candle as the last element. Defaults: `limit` 500, max 2000. Never fabricate candles for empty buckets.

**`GET /assets/:idOrSymbol/listings`** (derived view, **PROPOSED**) → `{ "asks":[{price,qty}...] (top 15 from book), "auctions":[Auction...] }`.

### 8.3 Orders (Auth)

**`POST /orders`** — logic in 6.2. Request body (**PINNED** by sim):

```json
{ "asset":"DFEST-WKND", "side":"BUY", "type":"LIMIT", "quantity":2, "price":10500, "tif":"GTC" }
{ "asset":"DFEST-WKND", "side":"SELL","type":"MARKET","quantity":1, "price":10000 }   // price = protection price for MARKET
```
`tif` optional (LIMIT only; `GTC` default; `IOC` allowed). Response `202`:

```json
{ "order_id": "0192f8a0-...", "status": "PENDING_SUBMIT", "engine_seq": 10483 }
```
`order_id` and `status` are **PINNED** (sim reads `order_id|id` and `status`).

**`GET /orders/:id`** (owner only, else `404 ORDER_NOT_FOUND`) and items of `GET /me/orders` use the **Order** resource:

```json
{ "order_id":"...", "asset_id":"<uuid>", "symbol":"DFEST-WKND",             // ★ symbol
  "side":"BUY", "type":"LIMIT", "tif":"GTC",
  "limit_price_minor":10500,                                                // ★ (for MARKET: the protection price)
  "qty":2, "matched_qty":1, "settled_qty":1, "remaining_qty":1,             // ★ qty, matched_qty, remaining_qty
  "avg_fill_price_minor":10480,                                             // null when matched_qty = 0
  "status":"PARTIALLY_FILLED",                                              // PENDING_SUBMIT|OPEN|PARTIALLY_FILLED|FILLED|CANCELED|REJECTED
  "settlement":"SETTLING",                                                  // NONE|SETTLING|SETTLED|FAILED (matched_qty vs settled_qty, trade states)
  "reject_code":null, "cancel_reason":null,
  "created_at":"2026-10-23T10:00:00Z", "updated_at":"2026-10-23T10:00:01Z" }
```
`remaining_qty`: `qty − matched_qty` for open states; for `CANCELED` it is the quantity that was released.

**`DELETE /orders/:id`** — logic in 6.3. `200 { "order_id","status":"CANCELED","remaining_qty" }`.

### 8.4 Wallet, holdings, history (Auth)

| Endpoint | Response |
|---|---|
| `GET /me/wallet` | `{ "available_minor", "reserved_minor", "total_minor" }` (**PINNED** `available_minor`, `reserved_minor`) |
| `GET /me/holdings` | `{ "items":[{ "asset_id","symbol","available_qty","reserved_qty","total_qty" }] }` (**PINNED** `symbol`, `available_qty`, `reserved_qty`). Include only rows with `total_qty > 0` |
| `GET /me/orders?status=open\|closed\|all&asset=&limit=&cursor=` | list of Order. **PINNED**: `status=open` returns `PENDING_SUBMIT`, `OPEN`, `PARTIALLY_FILLED` (the simulator treats all three as open). `closed` = `FILLED, CANCELED, REJECTED`. Default `all`, newest first |
| `GET /me/transactions?limit=200&cursor=` | settled/settling fills and auction sales **from this user's perspective** (below) |
| `GET /transactions/:id` | receipt for one transaction id (owner is buyer or seller, else 404): same item plus `ledger_entries[]` of that user's accounts |

Transaction item (**PINNED** keys ★):

```json
{ "transaction_id":"<ledger txn uuid|null while pending>", "venue":"BOOK", "trade_id":"e-1a2b3c4d:10484", "auction_id":null,
  "order_id":"...", "asset_id":"...", "symbol":"DFEST-WKND",        // ★ symbol
  "side":"BUY",                                                       // ★ BUY|SELL = this user's side
  "price_minor":10500, "qty":2, "total_minor":21000,                  // ★ price_minor, qty
  "ts":1760000000123,                                                 // ★ engine ms (auction: sold_at ms)
  "state":"SETTLED", "settled_at":"2026-10-23T10:00:01Z" }           // state: PENDING_SETTLEMENT|SETTLED|SETTLEMENT_FAILED
```
For a BUY the user paid `price_minor` (the maker price); price improvement is already reflected.

### 8.5 Auctions

| Endpoint | Notes |
|---|---|
| `POST /auctions` (Auth) | Logic and body in 6.11. `201` → Auction (below). **PINNED** response reads: `id`, `start_price_minor`, `floor_price_minor`, `end_time` |
| `GET /auctions?status=ACTIVE\|ALL&asset=` (public) | `{ "items":[Auction...] }`. Default `ACTIVE`. **PINNED** reads: `id`, `symbol`, `current_price_minor`, `floor_price_minor`, `qty`, `status`, `end_time` |
| `GET /auctions/:id` (public) | Auction + `price_schedule: [{ at, price_minor }]` (every step, for the decay curve) |
| `POST /auctions/:id/accept` (Auth) | Body `{ "max_price": <int> }` (**PINNED**). Success `200` (below) |
| `DELETE /auctions/:id` (Auth, seller) | `200 { id, status:"CANCELED" }` |

```json
// Auction
{ "id":"<uuid>", "asset_id":"...", "symbol":"DFEST-WKND", "qty":5,
  "start_price_minor":11000, "floor_price_minor":9000, "current_price_minor":10600,
  "next_price_minor":10500, "seconds_to_next_step":4, "step_seconds":10, "decrement_minor":100,
  "start_time":"2026-10-23T10:00:00Z", "end_time":"2026-10-23T10:02:00Z",    // ★ end_time ISO string (sim accepts string or number)
  "status":"ACTIVE", "ceiling_minor":12000 }

// accept receipt (sim reads accepted_price_minor)
{ "auction_id":"...", "symbol":"DFEST-WKND", "qty":5, "accepted_price_minor":10600, "total_minor":53000,
  "ledger_txn_id":"...", "sold_at":"2026-10-23T10:00:25Z" }
```
`current_price_minor` is computed with **database** `now()` on every read.

### 8.6 Rate limiting and abuse controls

Token bucket in Redis keyed per user (orders/cancels/auction actions) and per IP (auth). Exceeding the limit → `429 RATE_LIMITED`, header `Retry-After: <integer seconds ≥ 1>` (**PINNED**: the simulator parses seconds) and `details:{retry_after_ms}`. After a 429 the simulator puts that bot on cooldown for the stated time, so make the value truthful.

| Tier | Who | Orders/cancels per second (sustained / burst) | Max open orders | Holding cap |
|---|---|---|---|---|
| `STANDARD` | self-registered and human demo accounts (`is_simulated=false`) | 5 / 10 | 20 | 20 per asset |
| `BOT` | seeded `is_simulated=true`, persona ≠ `bench` | 20 / 40 | 100 | none |
| `BENCH` | persona `bench` | 50 / 100 | 5 000 | none |

Auth endpoints: per-IP `AUTH_RATE_PER_MIN` (default 600). Tiers and numbers are **POLICY**, change them in config. Document in the benchmark report that `BENCH` is a higher-rate credential (Blueprint Section 20.3). Bots are **not** exempt from the price ceiling.

### 8.7 Health, metrics, admin

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /healthz` | none | `{ "status":"ok"\|"degraded"\|"down", "db", "redis", "engine":{ "status","epoch","seq" }, "consumer":{ "epoch","last_seq","lag" }, "trading_paused":false }`. `503` when `down` |
| `GET /metrics` | ADMIN | JSON: `orders_accepted_total`, `orders_rejected_total{code}`, `engine_busy_total`, `engine_cmd_latency_ms{p50,p95,p99}`, `consumer_lag`, `settle_queue_depth`, `settlement_lag_ms{p50,p99}`, `settled_trades_total`, `event_loop_lag_ms`, `pg_pool_waiting`, `ws_clients`, `alerts_total{alert}` |
| `POST /admin/assets/:id/halt`, `/resume` | ADMIN | Update `assets.status` (+`halt_reason`), send `HaltAsset`/`ResumeAsset` to the engine, audit. Idempotent (engine `NOOP` is success) |
| `POST /admin/assets/:id/policy` | ADMIN | Body `{ "face_value_minor", "ceiling_bps" }`. Inserts a new `asset_policy`, triggers 6.7 |
| `POST /admin/reconcile` / `GET /admin/reconcile/latest` | ADMIN | Run now / last `recon_runs` row |
| `POST /admin/trades/:id/retry` | ADMIN | `SETTLEMENT_FAILED → PENDING_SETTLEMENT` |
| `POST /admin/sim/start`, `/pause`, `/scenario` | ADMIN | Thin proxy to `http://sim:7100` with header from `SIM_CONTROL_TOKEN`. **Sim control server does not exist yet** (finding G4). Implement last; return `502` if unreachable |
| `POST /admin/demo/reset` | ADMIN | Truncate mutable tables, rerun seed (Section 10), then EpochRebuild (6.9). Wiping the engine WAL volume is an **operator script** (`ops/`), because `api` cannot delete the engine's volume. Target < 30 s |

Admin audience also includes the seeded `operator@sim.darkhold.local` (role `ADMIN`).

---

## 9. WebSocket contract (`ws://api:4000/ws`)

### 9.1 Connection

- Same HTTP server, path `/ws`. Use the `ws` library with `noServer` and the HTTP `upgrade` event.
- **Unauthenticated connections are allowed** and may subscribe to public channels (**PINNED**: the simulator connects with no token and subscribes to `book:` and `trades:`).
- Authenticate by `ws://.../ws?token=<jwt>` **or** by sending `{ "type":"auth", "token":"<jwt>" }` after connect. Needed only for `user:<id>`.
- Server sends WebSocket protocol-level ping every 20 s; drop clients that do not pong within 10 s.
- Limits: max 5 connections per user, 20 per IP, 50 subscriptions per socket, 4 KB max inbound message, per-socket outbound buffer cap (e.g. 1 MB) → conflate `BookSnapshot`/`MarketStats`, then close with code `1013` if still over.

### 9.2 Client → server (JSON text)

| Message | Notes |
|---|---|
| `{ "type":"subscribe", "channel":"book:DFEST-WKND" }` | **PINNED** format (sim `marketFeed.ts`). Channel ids use the asset **symbol**, never the UUID |
| `{ "type":"unsubscribe", "channel":"..." }` | |
| `{ "type":"auth", "token":"<jwt>" }` | |
| `{ "type":"ping" }` | Server replies `{ "type":"pong", "ts":<ms> }` |

### 9.3 Server → client envelope and channels

Envelope: `{ "type": "<MessageType>", "channel": "<channel>", "data": { ... }, "ts": <server ms> }`.

| Channel | Access | `type` | `data` | Conflatable |
|---|---|---|---|---|
| `market` | public | `MarketStats` | `{ asset, last_price, last_ts, change_bps, best_bid, best_ask, ask_qty }` | yes |
| `book:<SYM>` | public | `BookSnapshot` | the engine snapshot exactly as in 8.2 (`asset, engine_epoch, as_of_seq, ts, depth, bids, asks, best_bid, best_ask, spread`) | yes |
| `trades:<SYM>` | public | `TradeTick` | `{ asset, trade_id, price, qty, ts, taker_side, seq, buyer_is_simulated, seller_is_simulated }` (**PINNED** names `price, qty, ts, taker_side, seq` read by sim) | no |
| `candles:<SYM>:<5s\|1m>` | public | `CandleUpdate` | `{ asset, candle: Candle }` (upsert by `openTime`) | yes |
| `auction:<ID>` | public | `AuctionPriceUpdate` | `{ auction_id, current_price_minor, next_price_minor, seconds_to_next_step, status }` | yes |
| `user:<USER_ID>` | owner only | `OrderUpdate` | `{ order_id, symbol, status, matched_qty, remaining_qty, cancel_reason, reject_code }` | no |
| | | `SettlementCompleted` | `{ trade_id, ledger_txn_id, order_id, symbol, side, price_minor, qty, available_minor, reserved_minor }` | no |
| | | `SettlementFailed` | `{ trade_id, reason, asset_halted }` | no |
| | | `AuctionWon` | `{ auction_id, symbol, qty, accepted_price_minor }` | no |

Rules:

- On `subscribe` to `book:<SYM>` the server **immediately sends the current `BookSnapshot`** (from Redis, falling back to the engine) so the client can discard older REST data using `as_of_seq`. On `market`, send the latest stats for all assets. Other channels send nothing until the next event.
- Subscribing to `user:<other id>`, or to `user:` without auth → error message (below), no data.
- **Acknowledgements and errors must not carry a top-level `channel` field.** The simulator derives behavior from `channel.startsWith('book:')`; an ack such as `{type:"subscribed", channel:"book:X"}` would be parsed as an empty book and blank its view. Use:

```json
{ "type":"subscribed", "subscription":"book:DFEST-WKND" }
{ "type":"error", "code":"FORBIDDEN", "message":"...", "subscription":"user:abc" }
```
- `TradeTick.ts` is the engine's `ts` (a number). `seq` is the engine seq and strictly increases; clients dedupe on it.
- Private updates are emitted **after** the corresponding DB transaction commits.
- Heartbeat only; no market data is invented when no trades occur.

---

## 10. Seed loading (reads `ops/seed/*`, all shapes **PINNED**)

Implement `npm run seed -w api [-- --bench] [-- --candles <file>]`. It must be **idempotent** (safe to rerun) and run inside one transaction per step.

### 10.1 Input files

| File | Shape |
|---|---|
| `assets.json` | `{ schema_version:1, demo:[Asset...], bench:[Asset...] }`; each: `symbol, name, category, face_value_minor, ceiling_bps, ceiling_minor, tick_size, min_qty, max_qty, total_supply, liquidity` |
| `accounts.json` | `{ schema_version:1, password, accounts:[{ key, email, role, is_simulated, starter_credits, initial_units:{SYMBOL:n}, quotes?:[SYMBOL] }] }`. `role` is a **persona**: `issuer, market_maker, noise, momentum, profit_taker, pump, scalper, judge_seller, judge_buyer, admin, bench`. One shared dev `password` (`darkhold-sim-dev`) |
| `bench-accounts.json` | same shape as accounts: 200 `bench-0001..0200`, each 1 000 000 000 credits and 100 000 units of each `BENCH-*` asset. Load only with `--bench` |
| `candles.seeded.json` | `{ schema_version:1, seed, end_ts, assets:{ SYMBOL:{ reference_price, candles:{ "1m":[Candle], "5s":[Candle] } } } }`, validated by `seeded-candles.schema.json`. **Not in the zip**, see 10.3 |

### 10.2 Steps (in this order)

1. **Assets and policy.** Insert `assets` (status `ACTIVE`) and one `asset_policy` row per asset (`face_value_minor`, `ceiling_bps`, `effective_from = '1970-01-01'`). **Assert** `ceiling_minor == floor(face_value_minor × ceiling_bps / 10000)` and `ceiling_minor % tick_size == 0`; abort if not (the engine collar is derived from it). Bench assets only with `--bench`.
2. **Users, wallets, ledger accounts.** `users.id` = **UUIDv5(email, fixed namespace)** so ids are stable across resets (engine `user_id` stays stable). Hash the shared password. Mapping: persona `admin` → `role='ADMIN'`; all others `USER`. `rate_tier`: persona `bench` → `BENCH`; else `is_simulated` → `BOT`; else `STANDARD`. `persona` stored.
3. **Starter credits.** Ledger txn `FAUCET:<user_id>`: `FAUCET/CREDIT −c`, user `AVAILABLE/CREDIT +c`; wallet mirror updated. Skip accounts with `starter_credits = 0` (still create the wallet row).
4. **Initial units.** For each `initial_units` entry: ledger txn `ISSUE:<user_id>:<symbol>` from `ISSUANCE/<symbol>`, holding mirror updated. The `issuer` persona receives the remainder of each asset's supply (the generator guarantees `Σ units = total_supply`; **re-check and abort** if not).
5. **Seeded candles.** Upsert both intervals with `origin='SEEDED_SIM'`. Store `reference_price` in a new column `assets.reference_price_minor bigint null`; it is the fallback `last_price` before any real trade and the sim's opening reference.
6. Run R1, R2, R4 reconciliation and fail the seed if any check fails.

The engine is **not** configured by the seed; the api does it at boot (6.1 step 5).

### 10.3 Generating the missing seeded candles

```bash
cd matching_engine
npm install
npm run build -w @darkhold/candles
npm run seed:history -w sim -- --seed darkhold-history-1 --end $(date -u +%Y-%m-%dT%H:%M:00Z) --out ../ops/seed/candles.seeded.json
```
Use an `--end` of "now" for a live demo so the chart's history ends where live trading starts. (`seed:fixture` pins `--end 2026-10-01T12:00:00Z`, which leaves a multi-week gap.) The history covers 6 h of `1m` candles and the last 30 min of `5s` candles.

---

## 11. Simulator integration checklist (what `sim` will do to your API)

Derived line by line from `sim/src/apiClient.ts`, `accounts.ts`, `marketFeed.ts`, `params.ts`, `ownState.ts`. Verify each row with the sim running.

| # | Simulator behavior | Backend requirement |
|---|---|---|
| 1 | Logs in each account (`POST /auth/login`) lazily, caches the token until `expires_in − 30 s`, re-logs in once on `401` | Return `access_token`, `user.id`, `expires_in`. A bad token must be `401`, not `403` |
| 2 | Up to 46 demo accounts (or 246 with bench) log in at start from one IP | `AUTH_RATE_PER_MIN` must not block this. Hashing cost must allow ~250 logins in a few seconds |
| 3 | `GET /assets` (public) at start and every 60 s; keeps only symbols in `sim/assets.profile.json` (`DFEST-WKND, MOONRISE-GA, DFEST-HOODIE, SIGIL-PIN`) | Shape in 8.2. Needs `symbol`, `face_value_minor`, `ceiling_minor` (or `ceiling_bps`), `tick_size`, `min_qty`, `max_qty`, `status` |
| 4 | `GET /assets/<id or SYMBOL>/book?depth=15` (public) when its WebSocket is down (poll every 2 s). It uses the `id` from `GET /assets` when present, else the symbol | Accept **both** the UUID and the symbol in the path. Return the engine snapshot shape |
| 5 | WebSocket `/ws`, no token, sends `{"type":"subscribe","channel":"book:<SYM>"}` and `trades:<SYM>` per asset; parses `type` or `channel`; payload in `data` | 9.2 and 9.3. **No top-level `channel` on acks/errors** |
| 6 | `POST /orders` with `Idempotency-Key: <botKey>-<n>-<uuid>`; body fields `asset, side, type, quantity, price`, optional `tif` | 6.2. Accept key ≤ 128 chars. 202 + `order_id` |
| 7 | **Retries every `5xx` twice (200 ms, then 600 ms) with the same idempotency key** | Retryable failures must not be cached as final and must not double-reserve (6.2 step 3 and 7) |
| 8 | On `429` reads `Retry-After` (seconds) and stops that bot until then | 8.6 |
| 9 | Market orders: `type:"MARKET"`, `price` = protection price within 1.5% to 2% of mid | Accepted with `tif` forced to `IOC` |
| 10 | `DELETE /orders/:id` with a fresh idempotency key | 6.3. A `409 ORDER_NOT_CANCELABLE` is expected and harmless (fill won the race) |
| 11 | `GET /me/wallet`, `/me/holdings`, `/me/transactions?limit=200`, `/me/orders?status=open` about every 10 s to 15 s per bot | Shapes in 8.4. `status=open` must include `PENDING_SUBMIT` |
| 12 | Market makers each quote 2 assets with several resting orders and refresh every ~3 s (cancel + new) | `BOT` tier: ≥ 100 open orders and ≥ 20 req/s burst. Cancels must be cheap |
| 13 | Seeded accounts hold large inventories (issuer 4 000 DFEST-WKND, each noise bot 20 units of each asset) | **Holding cap must not apply to `BOT`/`BENCH`** (8.6). Do not apply it to initial grants either |
| 14 | `scalper-1` is scripted to try prices above the ceiling | Must receive `422 PRICE_ABOVE_CEILING` with `details`. It is a demo scene: never special-case it |
| 15 | Issuer (`issuer@sim.darkhold.local`) creates auctions: body `asset, quantity, start_price, floor_price, step_seconds, duration_seconds`; snipers `POST /auctions/:id/accept {max_price}` | 6.11 and 8.5 |
| 16 | Global budget 40 req/s (demo) to 150 req/s (continuous); each bot at most 1 request per 250 ms | Sustained load of that size must not trip per-IP limits other than auth |
| 17 | Treats an asset whose `status` contains `HALT` as non-tradable | Return `HALTED` while halted |
| 18 | Reads `reference_price` from `candles.seeded.json` and seeds opening books around it | The reference price must lie within `[tick, ceiling]` (the history writer clamps it). Your `last_price` fallback uses the same value |

---

## 12. Policy values (all **POLICY**, store in a `config` module with env overrides)

| Policy | Default | Notes |
|---|---|---|
| Ceiling per asset | from `asset_policy` (seed: 12000 bps = 120% of face) | Placeholder (seed README). Per-asset |
| Starter credits at register | 500 000 minor | |
| Holding cap (`STANDARD` only) | 20 units per asset | Counts `available + reserved + Σ remaining of open BUY orders`. Never reduces existing holdings. A buy that would exceed → `422 HOLDING_CAP_EXCEEDED` with `details:{cap, current, requested}`. Also applies to auction acceptance |
| Max open orders | 20 / 100 / 5 000 by tier | Counts `PENDING_SUBMIT, OPEN, PARTIALLY_FILLED`. Over → `422 MAX_OPEN_ORDERS` |
| Market-order protection default (only when the client omits `price`) | BUY: `min(ceiling, roundUpToTick(best_ask × 1.10))`; SELL: `max(tick, roundDownToTick(best_bid × 0.90))`. No quote on that side → fall back to `last_price` | Band 10%. Compute with integers (`× 110 / 100`) |
| Self-trade handling | **Decided by the engine**: incoming remainder canceled with `SELF_TRADE_PREVENTED`; earlier fills kept | Not configurable |
| Fees | none | |
| Auction default decrement | `ceil((start − floor) / floor(duration/step))` | 6.11 |
| WAL fsync | `batch` (default) or `always` | Never `off` (4.7) |
| JWT TTL | 900 s | |
| Idempotency retention | 24 h in Redis, 7 d in PostgreSQL | |
| Reconciliation interval / settlement SLA | 60 s / 30 s | |
| "SIM" labelling | `buyer_is_simulated` / `seller_is_simulated` on every public trade; frontend decides the badge | Never expose user ids |
| Per-user policy exemption | `BOT`/`BENCH` exempt from holding cap | 8.6 |

---

## 13. Testing

### 13.1 Contract tests (run in CI)

- Validate **every engine message the api consumes or produces** with `ajv` against `contracts/schemas/*.json` using `contracts/scripts/validate-fixtures.mjs` as the model. Your outgoing commands must validate against `command.*.schema.json`.
- Validate every REST response the sim reads against a `zod` mirror of 8.1 to 8.5 (copy the key lists marked ★).
- A test that loads `sim/src/apiClient.ts` normalizers against your JSON samples (`listAssets`, `getBook`, `placeLimit` response, `getWallet`, `getHoldings`, `getOpenOrders`, `getTransactions`, `createAuction`, `listAuctions`, `acceptAuction`, `login`) is the cheapest way to prove coupling. Import `ApiClient` with an injected `fetchFn` returning your handler's output.

### 13.2 Engine for integration tests

Preferred: the **real engine** once Member 1 fixes findings E1 and E2 (`cargo build -p darkhold-engine`, run with `ENGINE_TOKEN`, `WAL_DIR=<tmp>`, `FSYNC_POLICY=off` is acceptable only inside tests).

Until then, a **FixtureStub** (small Node server, test-only) speaking the same protocol: on `POST /v1/commands` it deep-compares the body with the next `steps[i].command` of a chosen scenario file, returns `steps[i].expect_reply`, and appends `steps[i].expect_events` to an in-memory event list served by `GET /v1/events?after=` with real SSE framing (`hello` first, `id:`/`event:`/`data:`, `: hb`). It must also return `409 EPOCH_MISMATCH`, `409 AFTER_IN_FUTURE`, `410 GONE`, `503 ENGINE_BUSY`, `504 COMMAND_TIMEOUT` on request, using `contracts/fixtures/engine/errors/*.json` as bodies.

### 13.3 Golden-driven consumer and settlement tests (the main correctness harness)

Export a pure function `applyBatch(tx, events)` from the consumer. For each of the 24 files in `contracts/fixtures/engine/scenarios/`:

1. Create the users the scenario names (`U1`, `U2`, ... are not UUIDs, so keep a `fixtureUser → real uuid` map and rewrite `user_id`, `buy_user_id`, `sell_user_id` in events before applying). Give them ample credits/units.
2. For each `SubmitOrder` step: insert the order directly as `PENDING_SUBMIT` using the fixture `order_id` and run the real reservation code path (so escrow is created exactly as in production).
3. Feed the step's `expect_events` to `applyBatch`, then run the settlement worker to completion.
4. After the **whole scenario**: assert reconciliation R1 to R4 and R8 pass; assert each order's `status`, `matched_qty`, `settled_qty`; assert wallet and holding deltas equal an independent oracle computed only from the scenario's `TradeExecuted` events (`Σ price×qty` per party); assert re-feeding the identical event list changes **nothing** (idempotence).

Scenarios that deserve a named test: `S02` exact cross, `S03` taker partial, `S04` maker partial, `S05` multi-level sweep with price improvement, `S08` maker price, `S09` market IOC remainder, `S10` market no liquidity (release full escrow), `S13` cancel partially filled, `S14` cancel after fill, `S17`/`S18` self-trade prevented (earlier fills kept, remainder released), `S20` order id reused, `S21` validation codes (each `OrderRejected` releases full escrow), `S22` halt and resume, `S23` tombstone FIFO, `S24` event order.

### 13.4 Required invariant and behavior tests

| Area | Test |
|---|---|
| Ceiling | Negative test on **every** price entry: LIMIT buy, LIMIT sell, MARKET protection price (both sides), auction `start_price`, policy lowered below resting orders (sweeper cancels with `POLICY_BREACH`). Also R7 passes after a random workload |
| Reservation | Two concurrent orders that together exceed funds: exactly one succeeds. Selling the same units through an order and an auction concurrently: exactly one succeeds |
| Idempotency | Same key + same body twice → one order. Same key + different body → `IDEMPOTENCY_CONFLICT`. Same key retried after a simulated `ENGINE_BUSY` → executes and succeeds. Same key after a simulated `504` → resumes the same `order_id`, no second reservation |
| Duplicate events | Replay events from any earlier `seq` → no state change, no ledger duplicates (unique `TRADE:<trade_id>`) |
| Settlement atomicity | Fault-inject (throw after the 2nd of 3 ledger writes) → full rollback, trade still `PENDING_SETTLEMENT`, retried successfully |
| Cancel race | Submit crossing order and cancel concurrently: either fill or cancel wins by engine `seq`; total released + consumed equals reserved |
| Consumer resume | Kill the api mid-stream, restart: resumes from `consumer_offset`, no loss, no duplicate settlement |
| Engine restart | Kill engine under load, restart: `PENDING_SUBMIT` orders are resubmitted by the resolver, R1 to R8 pass, open orders intact (compare R6) |
| Epoch change | Wipe WAL, restart: EpochRebuild restores books; resting orders keep their `order_id`s |
| Auctions | N=50 concurrent accepts → exactly one `SOLD`, N−1 `AUCTION_ALREADY_SOLD`; a buyer without funds leaves it `ACTIVE`; expiry sweeper vs accept race; price never above start nor below floor |
| WebSocket | Private channel of another user is rejected; reconnect restores state; acks have no `channel` field |
| Candles | Chart candle equals aggregation of the `trades` rows for its bucket; no candle for an empty bucket; restart creates no duplicates |
| Randomized | Property test: random sequence of limit/market/cancel from 10 users → R1 to R8 pass at the end and `Σ credits`, `Σ units` unchanged |

---

## 14. Build order and acceptance (do not skip ahead)

| Phase | Build | Acceptance |
|---|---|---|
| **P0 Foundations** | Workspace setup (G1, G2), migrations (Section 5), config, logger, pg + Redis clients, `auth`, `catalog`, seed (Section 10), `GET /assets`, `/healthz` | Seed is idempotent. All 46 sim accounts can log in. `GET /assets` passes the 13.1 sim-normalizer test |
| **P1 Money path** | `ledger` primitives, order intake (6.2), engine client + failure map (4.10), consumer (6.4), settlement worker (6.5), cancel (6.3), resolver (6.6), `applyOrderRejected`, `ConfigureAsset` at boot, minimal reconciliation R1 to R4, R8 | 13.3 passes for all 24 scenarios. A scripted two-user trade with price improvement leaves balances exactly as in the 6.5 worked example. Duplicate submit has no effect. Engine kill/restart mid-scenario preserves state |
| **P2 Live market** | WS gateway (Section 9), Redis fan-out (6.8), candle aggregator + seeded load + candle REST, stats, `/book`, `/trades` | Sim runs for 10 min against it with only expected rejections. Candle test passes. Reconnect test passes |
| **P3 Trust** | Rate limits, caps, max open orders, audit log, ceiling on all paths, policy sweeper (6.7), full R5 to R7, settlement batching, admin halt/resume | All ceiling negative tests pass. Randomized workload ends with zero reconciliation drift |
| **P4 Auctions** | Section 6.11 and 8.5 | 50-way concurrency test passes; auction sale ledger balanced |
| **P5 Evidence** | `/metrics`, `BENCH` tier, EpochRebuild (6.9), demo reset, chaos runs, event-loop lag check (split `MODE=worker` only if lag > threshold), `/admin/sim/*` proxy | Benchmark S3 can run; chaos S6 passes; two clean demo rehearsals |

**Backend "done" checklist:** (1) every ★ field in Sections 8 and 9 is served; (2) 13.3 and 13.4 pass; (3) reconciliation is green after a 10-minute simulated run **and** after an engine kill/restart; (4) no code path reads `matched_qty` from a status event; (5) no module other than `ledger` mutates `wallets`/`holdings`/`reservations`; (6) `FSYNC_POLICY` is not `off` in compose; (7) `DEVIATIONS.md` lists every deviation from this file.

---

## 15. Appendices

### A. Suggested `api/` layout

```
api/
  package.json  tsconfig.json  Dockerfile
  migrations/                      # SQL migrations (Section 5)
  src/
    main.ts  config.ts  logger.ts  errors.ts  money.ts   # money.ts: MAX_SAFE guards, ceil/floor to tick
    db/    pool.ts  tx.ts  bigint-parser.ts
    redis/ client.ts  rateLimit.ts  pubsub.ts
    engine/ client.ts  sse.ts  types.ts  errorMap.ts      # client = POST /v1/commands, GET /v1/*; sse = fetch stream + frame parser
    modules/
      auth/  catalog/  risk/  audit/
      ledger/      reserve.ts release.ts consume.ts transfer.ts accounts.ts   # the ONLY writers of wallets/holdings/reservations
      orders/      intake.ts cancel.ts resolver.ts applyOrderRejected.ts routes.ts
      consumer/    loop.ts applyBatch.ts epochRebuild.ts
      settlement/  worker.ts settleBatch.ts
      auctions/    service.ts sweeper.ts ticker.ts routes.ts
      market-data/ candles.ts stats.ts fanout.ts routes.ts
      ws/          gateway.ts channels.ts
      reconciliation/ checks.ts runner.ts
      admin/       routes.ts simProxy.ts
    seed/ seed.ts
  test/ goldenConsumer.test.ts  fixtureStub.ts  simNormalizers.test.ts  ...
```

### B. Dependencies

`express`, `cors`, `zod`, `pg`, `ioredis`, `ws`, `jsonwebtoken`, `argon2` (or `bcrypt`), `uuid` (v5, v7), `pino`, `ajv`, `ajv-formats`; workspace deps `@darkhold/candles` and `@darkhold/contracts`; dev `typescript`, `tsx`, `vitest`, `supertest`, `node-pg-migrate`, `testcontainers` (or compose-based test DB).

### C. Compose fragment (names must match sim defaults)

```yaml
services:
  postgres: { image: postgres:16, environment: { POSTGRES_PASSWORD: dev, POSTGRES_DB: darkhold }, volumes: [pgdata:/var/lib/postgresql/data] }
  redis:    { image: redis:7 }
  engine:
    build: ./matching_engine/engine
    environment: { ENGINE_TOKEN: dev-token, WAL_DIR: /data, FSYNC_POLICY: batch, ENGINE_BIND: "0.0.0.0:7000", RING_CAPACITY: "300000" }
    volumes: [enginewal:/data]
    ports: ["7000:7000"]
  api:
    build: ./api
    environment: { PORT: "4000", DATABASE_URL: postgres://postgres:dev@postgres:5432/darkhold, REDIS_URL: redis://redis:6379,
                   ENGINE_URL: http://engine:7000, ENGINE_TOKEN: dev-token, JWT_SECRET: dev-secret, MODE: all }
    depends_on: [postgres, redis, engine]
    ports: ["4000:4000"]
  sim:                                  # profile: demo
    build: ./matching_engine/sim
    profiles: [demo]
    environment: { API_BASE_URL: http://api:4000, WS_URL: ws://api:4000/ws, SIM_CONTROL_TOKEN: change-me-dev-only,
                   SIM_ACCOUNTS_FILE: /seed/accounts.json, SIM_CANDLES_FILE: /seed/candles.seeded.json }
    volumes: [./ops/seed:/seed:ro]
volumes: { pgdata: {}, enginewal: {} }
```

### D. Critical SQL patterns

```sql
-- Reserve funds (intake). 0 rows updated → INSUFFICIENT_FUNDS.
UPDATE wallets SET available_minor = available_minor - $1, reserved_minor = reserved_minor + $1
 WHERE user_id = $2 AND available_minor >= $1;

-- Accept a trade exactly once (consumer). 0 rows inserted → replay, skip the rest.
INSERT INTO trades (id, asset_id, buy_order_id, sell_order_id, buy_user_id, sell_user_id, price_minor, qty, seq, engine_epoch, ts, taker_side, state, accepted_at)
VALUES (...,'PENDING_SETTLEMENT', now()) ON CONFLICT (id) DO NOTHING;

-- Deterministic lock order for settlement (avoid deadlocks with intake).
SELECT user_id FROM wallets WHERE user_id = ANY($1) ORDER BY user_id FOR UPDATE;
SELECT user_id, asset_id FROM holdings WHERE user_id = ANY($1) AND asset_id = $2 ORDER BY user_id FOR UPDATE;

-- Holding upsert on settlement.
INSERT INTO holdings (user_id, asset_id, available_qty, reserved_qty) VALUES ($1,$2,$3,0)
ON CONFLICT (user_id, asset_id) DO UPDATE SET available_qty = holdings.available_qty + EXCLUDED.available_qty;

-- Release exactly N units/minor from a reservation; fail loudly if it would go negative (CHECK remaining >= 0).
UPDATE reservations SET remaining = remaining - $1, status = CASE WHEN remaining - $1 = 0 THEN 'CLOSED' ELSE status END
 WHERE id = $2 AND remaining >= $1;
```

### E. Decisions the team still owes (from Blueprint 26.3), and where this file assumed

Ceiling multiplier per asset (seed placeholder 120%), holding cap (20), max open orders (20/100/5000), market-order band (10%), starter credits (500 000), fsync policy (`batch`), rate-limit numbers, `SIM` badge rule (frontend decides from the two booleans), whether auction acceptance counts toward the holding cap (yes, assumed). Change the defaults in Section 12, not in logic.

### F. Known limitations (state them honestly in the demo)

The ledger proves **internal conservation**, not solvency against external custody. Rate limits and friction reduce abuse; they do not eliminate bots. A trade missed because the engine ring rolled over (`410 GONE`) cannot be recovered by the backend (finding E3). Seeded history and simulated traders are labelled simulated.