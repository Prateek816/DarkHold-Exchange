# DARKHOLD EXCHANGE: COMPLETE API CONTRACT
## `engine/` · `sim/` · `@darkhold/candles`

| | |
|---|---|
| Contract version | Aligned with `contracts/VERSION` = `1.0.0` |
| Sources read | `contracts/schemas/*.json`, `contracts/error-codes.json`, `packages/candles/src/*`, `sim/src/*`, `sim/.env.example`, `ops/seed/*`, the Backend Implementation Spec |
| Precedence on conflict | (1) JSON Schemas and `error-codes.json` → (2) Rust core → (3) engine README and tests → (4) `sim/src/apiClient.ts`, `marketFeed.ts` → (5) this file |

**Tags used everywhere**

| Tag | Meaning |
|---|---|
| **PINNED** | Fixed by existing code or schema. Implement exactly. Do not rename fields. |
| **PROPOSED** | A decision made for the contract because no code exists yet. Changeable by the team. |
| **POLICY** | A tunable business or operational number. Keep in config, never a literal in logic. |

**Global rules (apply to all three components)**

1. Money, quantities, prices, `seq`, `ts` are **JSON integers**. Maximum on every wire field: `2^53 − 1 = 9007199254740991`. Never floats, never strings.
2. `ts` and candle `openTime` are **epoch milliseconds**.
3. `order_id` is a **lowercase, hyphenated, 36-char UUID** (use UUID v7). Pattern `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`.
4. `asset` is the **symbol**, pattern `^[A-Z0-9_-]{1,32}$`. Never a UUID on the engine.
5. `engine_epoch` pattern `^e-[0-9a-z]{8}$`. `trade_id` pattern `^e-[0-9a-z]{8}:[1-9][0-9]*$`.

---

## 0. Component map and classification

| Class | Component | Role | Interface type | Who calls whom |
|---|---|---|---|---|
| **A** | `engine/` (Rust, port 7000) | Deterministic matching engine | HTTP/JSON + SSE | `api` is the **only** client in production. `tools/engine-cli` for dev. |
| **B** | `packages/candles` (`@darkhold/candles`) | OHLCV aggregation library | In-process TypeScript API (no network) | Imported by `api` (live) and `sim` (seed history) |
| **C** | `sim/` (Node, control port 7100) | Simulated traders and history seeder | Consumes the public `api` (REST + WS). Exposes a control HTTP server. Offers CLIs and file formats. | `sim → api`; `api → sim` only via `/admin/sim/*` proxy |
| **D** | Shared data files | `ops/seed/*.json` | File contracts | Read by `api` seeder and `sim` |

```
 sim ──REST/WS──▶ api (4000) ──HTTP commands + SSE──▶ engine (7000)
 sim control (7100) ◀── /admin/sim/* proxy ── api
 api, sim ──import──▶ @darkhold/candles
```

---

# PART A: ENGINE (`engine/`)

## A.1 Transport (PINNED)

| Item | Value |
|---|---|
| Base URL | `http://engine:7000` (env `ENGINE_BIND=0.0.0.0:7000`) |
| Content type | `application/json` (UTF-8) |
| Body limit | **16 384 bytes**, else `413 PAYLOAD_TOO_LARGE` |
| Unknown JSON fields in a command | Rejected: `400 VALIDATION_FAILED` (`deny_unknown_fields`). Send exactly the schema fields. |
| Business rejections | HTTP **200** with `status:"REJECTED"` and a `code` in the body (not an HTTP error) |

### A.1.1 Authorization

| Scope | Requirement |
|---|---|
| All endpoints **except** `GET /healthz` | Header `X-Engine-Token: <ENGINE_TOKEN>` |
| Missing or wrong token | `401 UNAUTHENTICATED` |
| `GET /healthz` | No auth |
| Browser `EventSource` | **Not usable** (cannot set custom headers). Use `fetch` streaming. |

`ENGINE_TOKEN` is a shared secret, required at engine start. It is unrelated to the user JWT of the public API.

### A.1.2 Error envelope (all non-2xx, PINNED, `error.envelope.schema.json`)

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "unknown field `foo`", "details": {} } }
```
`details` is always present (object).

## A.2 Endpoint index

| # | Method + Path | Auth | Purpose | Success body schema |
|---|---|---|---|---|
| 1 | `POST /v1/commands` | token | Execute one command | `reply.command.schema.json` |
| 2 | `GET /v1/books/:asset?depth=` | token | Book snapshot | `book.snapshot.schema.json` |
| 3 | `GET /v1/orders/:order_id` | token | Engine view of one order | `order.outcome.schema.json` |
| 4 | `GET /v1/open-orders?asset=` | token | All resting orders | `open-orders.schema.json` |
| 5 | `GET /v1/events?after=&epoch=` | token | SSE event stream | frames (A.6) |
| 6 | `GET /metrics` | token | Engine metrics (JSON) | n/a |
| 7 | `GET /healthz` | **none** | Liveness | `health.schema.json` |

---

## A.3 `POST /v1/commands`

One command per request. The `type` field selects the command.

### A.3.1 `SubmitOrder` (`command.submit-order.schema.json`)

**Request payload**

| Field | Type | Required | Rules |
|---|---|---|---|
| `type` | `"SubmitOrder"` | yes | |
| `order_id` | string | yes | lowercase hyphenated UUID. **Dedup / idempotency key.** |
| `asset` | string | yes | symbol, `^[A-Z0-9_-]{1,32}$` |
| `user_id` | string | yes | 1 to 64 printable ASCII (`\x21-\x7E`, no spaces). The API sends `users.id` (UUID). Self-trade prevention compares this string. |
| `side` | `"BUY"` \| `"SELL"` | yes | |
| `order_type` | `"LIMIT"` \| `"MARKET"` | yes | |
| `tif` | `"GTC"` \| `"IOC"` | yes | `MARKET` requires `IOC` |
| `qty` | integer | yes | `>= 1`, `<= 2^53-1` |
| `price` | integer | yes | `>= 1`, `<= 2^53-1`. For `MARKET`, it is the **protection price** (worst acceptable). It must still be on-tick and within collar. |

```json
{ "type":"SubmitOrder", "order_id":"0192f8a0-7b1c-7d2e-8f3a-1b2c3d4e5f60", "asset":"DFEST-WKND",
  "user_id":"3f2b8c1e-0a4d-5e6f-9b7a-8c9d0e1f2a3b", "side":"BUY",
  "order_type":"LIMIT", "tif":"GTC", "qty":5, "price":10000 }
```

**Validation order** (first failing check wins):

| # | Check | Reject `code` |
|---|---|---|
| 1 | Asset unknown | `UNKNOWN_ASSET` |
| 2 | Asset not `ACTIVE` | `ASSET_HALTED` |
| 3 | `MARKET` with `tif ≠ IOC` | `INVALID_TIF` |
| 4 | `qty < min_qty` or `qty > max_qty` | `INVALID_QTY` |
| 5 | `price < 1` or `> 2^53-1` | `INVALID_PRICE` |
| 6 | `price % tick_size ≠ 0` | `PRICE_NOT_ON_TICK` |
| 7 | `collar_max_price` set and `price > collar` | `PRICE_ABOVE_COLLAR` |
| 8 | `price × qty > 2^53-1` | `NOTIONAL_OVERFLOW` |

**Deduplication.** The engine stores a fingerprint of `asset|user_id|side|order_type|tif|qty|price` per `order_id`.

| Resubmission | Result |
|---|---|
| Same `order_id`, identical fields | Stored reply returned with `duplicate:true` |
| Same `order_id`, any field different | `REJECTED / ORDER_ID_REUSED`, `seq:null`, no event |

**Reply (HTTP 200)**

| Field | Type | Notes |
|---|---|---|
| `status` | `"ACCEPTED"` \| `"REJECTED"` | |
| `seq` | integer \| `null` | seq of `OrderAccepted`/`OrderRejected`. `null` only for `ORDER_ID_REUSED` |
| `last_seq` | integer | last event seq produced by this command (fills etc.) |
| `engine_epoch` | string | |
| `duplicate` | boolean | |
| `order_id` | string (optional) | |
| `asset` | string (optional) | |
| `code` | string (optional) | present when `REJECTED` |
| `remaining_qty` | integer (optional) | |

```json
{ "status":"ACCEPTED", "order_id":"0192f8a0-…", "asset":"DFEST-WKND", "seq":3, "last_seq":6,
  "engine_epoch":"e-test0001", "duplicate":false }
```
```json
{ "status":"REJECTED", "code":"PRICE_ABOVE_COLLAR", "order_id":"0192f8a0-…", "asset":"DFEST-WKND",
  "seq":7, "last_seq":7, "engine_epoch":"e-test0001", "duplicate":false }
```

### A.3.2 `CancelOrder` (`command.cancel-order.schema.json`)

| Field | Type | Required | Values |
|---|---|---|---|
| `type` | `"CancelOrder"` | yes | |
| `order_id` | string | yes | UUID |
| `reason` | string | yes | `USER` \| `POLICY_BREACH` \| `ADMIN` |

| Reply `status` | Extra fields | Meaning |
|---|---|---|
| `CANCELED` | `remaining_qty`, `seq` | Canceled now. An `OrderCanceled` event follows. |
| `ALREADY_CANCELED` | `duplicate:true` | Idempotent repeat |
| `ALREADY_FILLED` | `seq:null` | Too late |
| `UNKNOWN_ORDER` | | Never seen, **or the engine rejected it** |

Cancels work on a halted asset.

### A.3.3 `ConfigureAsset` (`command.configure-asset.schema.json`)

All 7 fields required.

| Field | Type | Notes |
|---|---|---|
| `type` | `"ConfigureAsset"` | |
| `asset` | string | symbol |
| `tick_size` | integer | `>= 1` |
| `min_qty` | integer | `>= 1` |
| `max_qty` | integer | `>= min_qty` |
| `collar_max_price` | integer \| `null` | `>= 1`. The API sets it to `floor(ceiling / tick_size) × tick_size` |
| `status` | `"ACTIVE"` \| `"HALTED"` | |

Rejected `REJECTED / INVALID_CONFIG` when `tick_size==0`, `min_qty==0`, `max_qty<min_qty`, `collar==0`, or any value `> 2^53-1`. Always emits `AssetConfigured` when applied.

### A.3.4 `HaltAsset` / `ResumeAsset` (`command.asset-status.schema.json`)

```json
{ "type":"HaltAsset", "asset":"DFEST-WKND" }
```
`type` is `HaltAsset` or `ResumeAsset`; `asset` is the symbol.

**Reply `status` for A.3.3 and A.3.4:** `OK`, `NOOP` (already in that state), `REJECTED` with `code` `UNKNOWN_ASSET` or `INVALID_CONFIG`. Carries `asset`, no `order_id`.

### A.3.5 Possible outcomes of `POST /v1/commands`: and the caller's reaction

| HTTP | Body | Command executed? | Caller reaction |
|---|---|---|---|
| 200 | `ACCEPTED` (any `duplicate`) | yes | proceed |
| 200 | `REJECTED` + `code`, `seq≠null` | yes (rejected) | release escrow |
| 200 | `REJECTED / ORDER_ID_REUSED`, `seq:null` | no | internal bug, alert |
| 400 | `VALIDATION_FAILED` | no | serializer bug |
| 401 | `UNAUTHENTICATED` | no | wrong token, alert |
| 413 | `PAYLOAD_TOO_LARGE` | no | |
| 500 | `INTERNAL` | unknown | treat as maybe |
| 503 | `ENGINE_BUSY` (`Retry-After: 1`) | **no** (never enqueued) | release escrow, tell client to retry |
| 503 | `ENGINE_UNAVAILABLE` | **maybe** | resubmit identical command later |
| 504 | `COMMAND_TIMEOUT` | **maybe** ("may still execute") | resubmit identical command later |
| network error | | **maybe** | resubmit identical command later |

Resubmitting an identical command is always safe (dedup by `order_id`). Caller timeout must exceed the engine's `COMMAND_TIMEOUT_MS` (2000): `ENGINE_CMD_TIMEOUT_MS=3000`.

---

## A.4 Query endpoints

### A.4.1 `GET /v1/books/:asset?depth=`

| Param | Where | Rules |
|---|---|---|
| `asset` | path | symbol |
| `depth` | query | integer 1..100, default 15 |

**200 `BookSnapshot`**

```json
{ "asset":"DFEST-WKND", "engine_epoch":"e-1a2b3c4d", "as_of_seq":10482, "ts":1760000000123, "depth":15,
  "bids":[{"price":10500,"qty":7,"orders":2}], "asks":[{"price":10540,"qty":5,"orders":1}],
  "best_bid":10500, "best_ask":10540, "spread":40 }
```
Level shape `{price, qty, orders}`. Empty book: `bids:[]`, `asks:[]`, `best_bid:null`, `best_ask:null`, `spread:null`. Errors: `404 NOT_FOUND` (unknown asset), `400 VALIDATION_FAILED` (bad depth), `401`.

### A.4.2 `GET /v1/orders/:order_id` → `OrderOutcome`

| Field | Type |
|---|---|
| `order_id`, `asset`, `user_id` | string |
| `side` | `BUY`\|`SELL` |
| `order_type` | `LIMIT`\|`MARKET` |
| `tif` | `GTC`\|`IOC` |
| `price`, `qty` | integer `>= 1` |
| `filled_qty`, `remaining_qty` | integer `>= 0` |
| `status` | `OPEN`\|`PARTIALLY_FILLED`\|`FILLED`\|`CANCELED`\|`REJECTED` |
| `reject_code` | enum \| `null` (`UNKNOWN_ASSET, ASSET_HALTED, INVALID_QTY, INVALID_PRICE, PRICE_NOT_ON_TICK, PRICE_ABOVE_COLLAR, NOTIONAL_OVERFLOW, INVALID_TIF`) |
| `cancel_reason` | enum \| `null` (`USER, POLICY_BREACH, ADMIN, IOC_REMAINDER, NO_LIQUIDITY, SELF_TRADE_PREVENTED`) |
| `first_seq` | integer \| `null` |
| `engine_epoch` | string |
| `as_of_seq` | integer |

Errors: `404 NOT_FOUND`, `401`.

### A.4.3 `GET /v1/open-orders?asset=`

`asset` optional filter. Sorted by asset, then `accept_seq`.

```json
{ "engine_epoch":"e-1a2b3c4d", "as_of_seq":10482,
  "orders":[ { "order_id":"…", "asset":"DFEST-WKND", "user_id":"…", "side":"SELL",
               "price":10540, "qty":5, "filled_qty":0, "remaining_qty":5, "accept_seq":9981 } ] }
```
`remaining_qty >= 1` for every row. All 9 order fields required. Compare to the database only when the consumer offset equals `as_of_seq`.

### A.4.4 `GET /healthz` (no auth)

```json
{ "status":"ok", "engine_epoch":"e-1a2b3c4d", "seq":10482, "uptime_s":3600 }
```
`status` is `ok` or `down`. **503** is returned when `down`.

### A.4.5 `GET /metrics` (token)

JSON. Fields are not schema-pinned; treat as informational.

---

## A.5 Event catalogue (`event.envelope.schema.json`, PINNED)

Every event carries: `type`, `engine_epoch`, `seq`, `ts`, `asset`.

| Event | Extra fields |
|---|---|
| `AssetConfigured` | `tick_size, min_qty, max_qty, collar_max_price, status` |
| `AssetHalted`, `AssetResumed` | none |
| `OrderAccepted` | `order_id, user_id, side, order_type, tif, price, qty` |
| `OrderRejected` | `order_id, user_id, code` |
| `TradeExecuted` | `trade_id, price, qty, buy_order_id, sell_order_id, buy_user_id, sell_user_id, maker_order_id, taker_order_id, taker_side, buy_remaining, sell_remaining` |
| `OrderPartiallyFilled` | `order_id, user_id, filled_qty` (cumulative), `remaining_qty` (`>=1`) |
| `OrderFilled` | `order_id, user_id, filled_qty` (= original qty) |
| `OrderCanceled` | `order_id, user_id, filled_qty` (cumulative, `>=0`), `remaining_qty` (`>=1`), `reason` |

### A.5.1 Exact event order for one accepted `SubmitOrder`

1. `OrderAccepted` (incoming/taker).
2. For **each fill** in price-time order: `TradeExecuted`, then **one maker status event** (`OrderFilled` if exhausted, else `OrderPartiallyFilled`).
3. Exactly one **taker disposition**:
   - remaining = 0 → `OrderFilled`
   - else self-trade hit → `OrderCanceled(SELF_TRADE_PREVENTED)` (earlier fills kept; applies to GTC too, no resting)
   - else GTC → rests; if any fills, one `OrderPartiallyFilled` (cumulative), else nothing
   - else IOC/MARKET → `OrderCanceled(NO_LIQUIDITY)` if zero fills, else `OrderCanceled(IOC_REMAINDER)`

**Consequences**
- The taker gets no per-fill status event. **Account fills from `TradeExecuted.qty` only.**
- Trade price is always the **maker's resting price** (buyer receives price improvement).
- A halted asset rejects new orders (`ASSET_HALTED`), cancels still work.

**Reference trace** (`S14-cancel-after-fill`): U1 sells 5@100 (A), U2 buys 5@100 (B).

```
seq 2 OrderAccepted A | seq 3 OrderAccepted B | seq 4 TradeExecuted e-test0001:4 price 100 qty 5
seq 5 OrderFilled A (maker) | seq 6 OrderFilled B (taker)  → reply to B: ACCEPTED seq 3, last_seq 6
CancelOrder A → ALREADY_FILLED, seq:null
```

## A.6 SSE stream `GET /v1/events?after=<seq>&epoch=<epoch>`

| Query | Type | Meaning |
|---|---|---|
| `after` | non-negative integer | Resume after this seq. Server sends `after+1…`. **Omitted = live only, no replay.** |
| `epoch` | string | If different from the engine's epoch → `409 EPOCH_MISMATCH` |

**Pre-stream failures**

| HTTP | `code` | `details` | Meaning and reaction |
|---|---|---|---|
| 409 | `EPOCH_MISMATCH` | `current_epoch` | WAL recreated. Run EpochRebuild |
| 409 | `AFTER_IN_FUTURE` | `current_seq`, `current_epoch` | Fatal inconsistency. Halt trading, alert |
| 410 | `GONE` | `ring_start_seq` | Offset fell off the ring. Halt, alert (missed trades unrecoverable) |
| 503 | `TOO_MANY_SUBSCRIBERS` | | Cap is 8. Use **exactly one** connection. Back off |
| 400 | `VALIDATION_FAILED` | | bad `after` |
| 401 | `UNAUTHENTICATED` | | bad token |

**Frames** (`\n\n`-separated; lines `id:` `event:` `data:`; lines starting with `:` are comments)

| `event:` | `id:` | `data:` | Notes |
|---|---|---|---|
| `hello` | none | `{engine_epoch, current_seq, ring_start_seq, assets:[{asset,status}], server_time}` | First frame. Verify the epoch |
| `book` | none | `BookSnapshot` (depth 15, with `ts`, `as_of_seq`) | One per asset after `hello`, then ~every 100 ms per changed asset. **Not sequenced. Never advance the offset on it.** |
| `<EventType>` | `<seq>` | event object (A.5) | The sequenced stream. `event:` equals `data.type` |
| `gone` | none | `{ring_start_seq}` | Mid-stream: fell behind. Stream closes |
| `: hb` | | | Heartbeat every **15 s**. 45 s silence = dead connection, reconnect |

**Guarantees**
- `seq` is **global, strictly increasing, contiguous** (1,2,3…). A gap means a bug: reconnect with `after=<last applied>`.
- `trade_id = "{engine_epoch}:{seq of TradeExecuted}"`, reproduced exactly on WAL replay.
- `ts` is engine wall-clock ms, non-decreasing, stored in the WAL.
- Events and replies are released only after the command is durable (`always`/`batch` fsync).
- The HTTP reply may arrive **after** its events are already on the stream. Never rely on that ordering.
- The ring is in memory (`RING_CAPACITY`, default 300 000). **No historical trade API exists.**

## A.7 Engine configuration (environment)

| Var | Value | Tag |
|---|---|---|
| `ENGINE_TOKEN` | required | PINNED |
| `WAL_DIR` | `/data` (named volume) | PINNED |
| `FSYNC_POLICY` | `batch` or `always`. **Never `off`** with the real backend | PINNED / POLICY |
| `ENGINE_BIND` | `0.0.0.0:7000` | PINNED |
| `RING_CAPACITY` | `300000` | PINNED |
| `SSE_MAX_SUBSCRIBERS` | `8` | PINNED |
| `SNAPSHOT_TICK_MS` | `100` | PINNED |
| `SNAPSHOT_DEPTH` | `15` | PINNED |
| `COMMAND_TIMEOUT_MS` | `2000` | PINNED |

## A.8 Engine error code table (`contracts/error-codes.json`)

| Code | HTTP | Layer |
|---|---|---|
| `UNKNOWN_ASSET`, `ASSET_HALTED`, `INVALID_QTY`, `INVALID_PRICE`, `PRICE_NOT_ON_TICK`, `PRICE_ABOVE_COLLAR`, `NOTIONAL_OVERFLOW`, `INVALID_TIF`, `ORDER_ID_REUSED`, `INVALID_CONFIG` | 200 | `engine-reject` (inside reply body) |
| `VALIDATION_FAILED` | 400 | `engine-transport` |
| `UNAUTHENTICATED` | 401 | `engine-transport` |
| `NOT_FOUND` | 404 | `engine-transport` |
| `PAYLOAD_TOO_LARGE` | 413 | `engine-transport` |
| `EPOCH_MISMATCH`, `AFTER_IN_FUTURE` | 409 | `engine-transport` |
| `GONE` | 410 | `engine-transport` |
| `INTERNAL` | 500 | `engine-transport` |
| `ENGINE_BUSY`, `ENGINE_UNAVAILABLE`, `TOO_MANY_SUBSCRIBERS` | 503 | `engine-transport` |
| `COMMAND_TIMEOUT` | 504 | `engine-transport` |

## A.9 Known engine issues (as shipped)

| # | Finding | Impact |
|---|---|---|
| E1 | `Cargo.toml` workspace lists only `darkhold-core` | `cargo run -p darkhold-engine` fails until fixed |
| E2 | Step-6 leftover files (`config.rs`, `ring.rs`, `http/*`) are out of sync with `main.rs`/`recovery.rs` | Engine does not build as shipped. Code against README + tests + schemas |
| E3 | No historical trades endpoint | `410 GONE` is unrecoverable for missed trades |
| E4 | `FSYNC_POLICY=off` can lose acknowledged commands | Never use in the integrated system |

Until E1/E2 are fixed, integrate against the **FixtureStub** that replays `contracts/fixtures/engine/scenarios/*.json` with identical HTTP/SSE behavior.

---

# PART B: CANDLES LIBRARY (`@darkhold/candles`)

In-process TypeScript API. **No network, no authorization, no I/O, no timers.** Pure and deterministic. All numbers are integers (ms for time).

## B.1 Types (PINNED, `src/types.ts`)

```ts
type IntervalName = '5s' | '1m';
type CandleOrigin = 'ENGINE' | 'SEEDED_SIM';

interface Tick   { seq: number; ts: number; price: number; qty: number }   // all finite numbers
interface Candle { interval: IntervalName; openTime: number; open: number; high: number;
                   low: number; close: number; volume: number; tradeCount: number; origin: CandleOrigin }
interface ApplyResult   { updated: Candle[]; closed: Candle[]; ignored: boolean }
interface AggregatorOptions { intervals: IntervalName[]; origin: CandleOrigin }
interface RestoreState  { active: Candle[]; lastSeq: number;
                          lastClosedOpenTimes?: Partial<Record<IntervalName, number>> }
```

### Candle wire schema (`candle.schema.json`)

| Field | Type | Constraint |
|---|---|---|
| `interval` | `"5s"`\|`"1m"` | |
| `openTime` | integer | `>= 0`, ms, aligned to bucket |
| `open`,`high`,`low`,`close` | integer | `>= 1` |
| `volume` | integer | `>= 1` |
| `tradeCount` | integer | `>= 1` |
| `origin` | `"ENGINE"`\|`"SEEDED_SIM"` | |

## B.2 Exports

```ts
export { CandleAggregator, bucketStart, bucketEnd, intervalMs, rebuildActive };
export type { RebuildResult, AggregatorOptions, ApplyResult, Candle, CandleOrigin, IntervalName, RestoreState, Tick };
```

| Function | Signature | Behavior |
|---|---|---|
| `intervalMs` | `(name) → number` | `5s → 5000`, `1m → 60000`. Throws on unknown name |
| `bucketStart` | `(ts, intervalMs) → number` | `floor(ts/intervalMs) × intervalMs` |
| `bucketEnd` | `(start, intervalMs) → number` | `start + intervalMs` |

## B.3 `CandleAggregator` (one instance **per asset**)

| Method | Signature | Behavior |
|---|---|---|
| `constructor` | `(opts: AggregatorOptions)` | Dedupes intervals; throws on unknown interval |
| `applyTick` | `(tick: Tick) → ApplyResult` | See rules below |
| `flush` | `(nowMs: number) → Candle[]` | Closes active candles whose `nowMs >= openTime + intervalMs`. **Never invents a candle for an empty bucket.** Returns the closed candles |
| `getActive` | `() → Candle[]` | Copies of unclosed candles, one per interval |
| `restore` | `(state: RestoreState) → void` | Replaces internal state (active, lastSeq, lastClosed) |

**`applyTick` rules**

| Condition | Result |
|---|---|
| Any field not finite | throws `RangeError('tick fields must be finite numbers')` |
| `tick.seq <= lastSeq` | `{updated:[], closed:[], ignored:true}` (idempotent replay) |
| No active candle, bucket `<= lastClosedOpen` | Skipped for that interval (never reopens a closed bucket) |
| No active candle, otherwise | New candle: `open=high=low=close=price`, `volume=qty`, `tradeCount=1`; goes into `updated` |
| `bucketStart > active.openTime` | Active candle moves to `closed`; a new candle opens; goes into `updated` |
| Same bucket, or timestamp regression | Clamped into the active bucket: `high=max`, `low=min`, `close=price`, `volume+=qty`, `tradeCount+=1`; into `updated` |

Returned candles are copies. Mutating them does not affect the aggregator.

## B.4 `rebuildActive`

```ts
rebuildActive(
  trades: Tick[],
  intervals: IntervalName[],
  origin: CandleOrigin,
  lastClosedOpenTimes: Partial<Record<IntervalName, number>> = {},
): RebuildResult   // { active: Candle[]; closed: Candle[]; lastSeq: number }
```

- Sorts trades by `seq`. Runs one single-interval aggregator per interval.
- Skips a trade for an interval when `bucketStart(ts) <= lastClosedOpenTimes[interval]`.
- `closed` = candles that closed during replay and lie after the persisted close. `active` = ready for `aggregator.restore({active, lastSeq})`.
- `lastSeq` is `0` when `trades` is empty.

## B.5 Usage contract for the API (PINNED by spec 6.8)

| Step | Rule |
|---|---|
| Live | One `CandleAggregator({intervals:['5s','1m'], origin:'ENGINE'})` per asset. For each `TradeExecuted`: `applyTick({seq: ev.seq, ts: ev.ts, price: ev.price, qty: ev.qty})` |
| Output | `updated` → publish `CandleUpdate`. `closed` → upsert into `candles` (`ON CONFLICT (asset_id, interval, open_time) DO UPDATE`) |
| Timer | Every 1 s call `flush(Date.now())` |
| Restart | Load trades of active buckets + newest closed `ENGINE` `open_time` per interval → `rebuildActive` → upsert `closed` → `restore` |
| Excluded | Auction sales and seeded history are **not** fed into the `ENGINE` aggregator |
| Empty periods | No trades → no candle and no price tick |

---

# PART C: SIMULATOR (`sim/`)

Four surfaces: **C.1** how the sim calls the public API (outbound), **C.2** the sim's control server (inbound), **C.3** configuration, **C.4** CLI/file contracts.

## C.1 Outbound: the public API as consumed by the sim

### C.1.1 Common client behavior (PINNED, `apiClient.ts`, `params.ts`)

| Behavior | Value |
|---|---|
| Base URL | `API_BASE_URL` (default `http://api:4000`) |
| Headers | `accept: application/json`; `content-type: application/json` when a body exists; `authorization: Bearer <jwt>` for bot calls; `idempotency-key: <key>` for mutating calls |
| Idempotency key format | `<botKey>-<n>-<uuid>` (n increments per bot). **Must be accepted up to 128 chars; not necessarily a UUID** |
| Request timeout | 10 000 ms |
| Retry on **5xx** and network errors | Up to 2 retries after 200 ms then 600 ms, **same idempotency key** |
| `401` on an authenticated call | Invalidate token, re-login **once**, retry |
| `429` | Reads `Retry-After` (integer **seconds**; default 1 s if unparsable), puts that bot in cooldown until then, throws `ApiError('RATE_LIMITED')` |
| Other `4xx` | Throws `ApiError(code, httpStatus, message)` from `error.code` / `error.message` |
| Per-bot throttle | at most 1 request per 250 ms; global budget **40 req/s (demo)**, **150 req/s (continuous)** |
| Error envelope read | `{ "error": { "code", "message", ... } }` (flat `{code,message}` also tolerated) |
| List responses | `{ "items": [...] }` (also tolerates `data`, `assets`, `orders`, `transactions`, `holdings`, `auctions`, or a bare array) |

### C.1.2 Endpoint contracts used by the sim

Auth column: **Public** = no token. **Bearer** = `Authorization: Bearer <jwt>`.

#### 1. `POST /auth/login`: Public

| | |
|---|---|
| Request | `{ "email": string, "password": string }` |
| Success `200` | `{ "access_token": string, "token_type":"Bearer", "expires_in": number(seconds), "user": { "id": string, "email", "role", "is_simulated" } }` |
| Read keys (★ required) | ★`access_token`, ★`user.id`, `expires_in` |
| Errors | `401 UNAUTHENTICATED` (wrong creds; same message for unknown email), `429 RATE_LIMITED` (per-IP, default 600/min), `400 VALIDATION_FAILED` |
| Sim behavior | Lazy login; token cached until `expires_in − 30 s`; up to 46 (demo) or 246 (with bench) accounts from one IP at start |

#### 2. `GET /assets`: Public

| | |
|---|---|
| Success `200` | `{ "items": [ Asset ] }` |
| Required per item | ★`symbol`, ★`face_value_minor`, ★`ceiling_minor` (or `ceiling_bps`) |
| Defaulted by sim | `id` (falls back to symbol), `tick_size` (1), `min_qty` (1), `max_qty` (10), `status` (`ACTIVE`) |
| Status rule | Any status containing `HALT` means not tradable |
| Frequency | At start and every 60 s. Only symbols in `assets.profile.json` are kept: `DFEST-WKND`, `MOONRISE-GA`, `DFEST-HOODIE`, `SIGIL-PIN` |

```json
{ "id":"<uuid>", "symbol":"DFEST-WKND", "name":"…", "category":"FESTIVAL", "status":"ACTIVE",
  "tick_size":10, "min_qty":1, "max_qty":10, "face_value_minor":10000, "ceiling_bps":12000,
  "ceiling_minor":12000, "last_price":10520, "best_bid":10500, "best_ask":10540 }
```

#### 3. `GET /assets/{id-or-SYMBOL}/book?depth=15`: Public

| | |
|---|---|
| Path | Accepts the asset **UUID or the symbol** (sim uses the `id` from `/assets` when known) |
| Success `200` | Engine `BookSnapshot` (A.4.1) |
| Read keys | `asset` (or `symbol`), `as_of_seq`, `bids`, `asks`; level `{price, qty}` (also accepts `[price, qty]` arrays) |
| Frequency | Polled every 2 s only while the WebSocket is down |
| Errors | `404 ASSET_NOT_FOUND` |

#### 4. `POST /orders`: Bearer + `Idempotency-Key`

| | |
|---|---|
| LIMIT body | `{ "asset":"SYM", "side":"BUY\|SELL", "type":"LIMIT", "quantity":int, "price":int, "tif":"GTC\|IOC" (optional) }` |
| MARKET body | `{ "asset":"SYM", "side":"…", "type":"MARKET", "quantity":int, "price":<protection price> }` (server forces `tif=IOC`) |
| Success | `202 { "order_id": string, "status":"PENDING_SUBMIT", "engine_seq": int }` |
| Read keys | `order_id` (or `id`), `status` |
| Retryable | `503 ENGINE_BUSY` (+`Retry-After: 1`), `503 ENGINE_UNAVAILABLE`. Not cached as final; the retry executes with the same key |
| Expected non-retry errors | see C.1.3 |

#### 5. `DELETE /orders/{order_id}`: Bearer + `Idempotency-Key` (fresh key per call)

| | |
|---|---|
| Success | `200 { "order_id", "status":"CANCELED", "remaining_qty" }` (idempotent when already canceled) |
| Errors | `404 ORDER_NOT_FOUND`, `409 ORDER_NOT_CANCELABLE` (**expected and harmless**: a fill won the race, or `not_yet_submitted` with `details.retry_after_ms:500`), `503 ENGINE_UNAVAILABLE`, `429` |

#### 6. `GET /me/wallet`: Bearer

`200 { "available_minor": int, "reserved_minor": int, "total_minor": int }`. Read: ★`available_minor`, `reserved_minor`.

#### 7. `GET /me/holdings`: Bearer

`200 { "items":[ { "asset_id", "symbol", "available_qty", "reserved_qty", "total_qty" } ] }`. Read: ★`symbol`, ★`available_qty`, ★`reserved_qty`. Only rows with `total_qty > 0`.

#### 8. `GET /me/orders?status=open`: Bearer

`200 { "items":[Order], "next_cursor": string|null }`. `status=open` **must include** `PENDING_SUBMIT`, `OPEN`, `PARTIALLY_FILLED` (sim treats all three as open). Read: `order_id`, ★`symbol`, `side`, ★`limit_price_minor`, ★`qty`, ★`matched_qty`, ★`remaining_qty`, `status`.

#### 9. `GET /me/transactions?limit=200`: Bearer

`200 { "items":[Tx], "next_cursor" }`. Read per item: ★`symbol`, ★`side` (`BUY`|`SELL`, this user's side; others skipped), ★`price_minor`, ★`qty`, ★`ts` (epoch ms; falls back to `settled_at`/`created_at` parse).

#### 10. `POST /auctions`: Bearer + `Idempotency-Key`

| | |
|---|---|
| Request | `{ "asset":"SYM", "quantity":int, "start_price":int, "floor_price":int, "step_seconds":int, "duration_seconds":int }` |
| Success | `201 Auction`; sim reads ★`id`, ★`start_price_minor`, ★`floor_price_minor`, ★`end_time` (ISO string or number) |
| Errors | `422 PRICE_ABOVE_CEILING` (with `details`), `422 INSUFFICIENT_HOLDINGS`, `400 VALIDATION_FAILED`, `404 ASSET_NOT_FOUND` |

#### 11. `GET /auctions`: Public

`200 { "items":[Auction] }` (default `status=ACTIVE`). Read: ★`id`, ★`symbol`, ★`current_price_minor`, `floor_price_minor`, `qty`, `status`, ★`end_time`.

#### 12. `POST /auctions/{id}/accept`: Bearer + `Idempotency-Key`

| | |
|---|---|
| Request | `{ "max_price": int }` |
| Success `200` | `{ "auction_id","symbol","qty","accepted_price_minor","total_minor","ledger_txn_id","sold_at" }`; sim reads `accepted_price_minor` |
| Errors | `409 PRICE_MOVED` (`details.current_price_minor`), `409 AUCTION_ALREADY_SOLD`, `409 AUCTION_NOT_ACTIVE`, `422 INSUFFICIENT_FUNDS`, `403 FORBIDDEN` (buyer is seller), `422 HOLDING_CAP_EXCEEDED` |

### C.1.3 Error codes the sim must be able to receive

| HTTP | `error.code` | Sim reaction |
|---|---|---|
| 400 | `VALIDATION_FAILED` | counted in `ordersRejectedByCode` |
| 401 | `UNAUTHENTICATED` | one re-login and retry |
| 403 | `FORBIDDEN` | counted |
| 404 | `ORDER_NOT_FOUND`, `ASSET_NOT_FOUND`, `AUCTION_NOT_FOUND` | counted |
| 409 | `ORDER_NOT_CANCELABLE`, `IDEMPOTENCY_CONFLICT`, `REQUEST_IN_PROGRESS`, `AUCTION_ALREADY_SOLD`, `AUCTION_NOT_ACTIVE`, `PRICE_MOVED` | counted; none retried |
| 422 | `INSUFFICIENT_FUNDS`, `INSUFFICIENT_HOLDINGS`, `PRICE_ABOVE_CEILING`, `ASSET_NOT_TRADABLE`, `HOLDING_CAP_EXCEEDED`, `MAX_OPEN_ORDERS` | counted |
| 429 | `RATE_LIMITED` | cooldown for `Retry-After` seconds |
| 5xx | `ENGINE_BUSY`, `ENGINE_UNAVAILABLE`, `INTERNAL` | 2 retries (200 ms, 600 ms) with the same key |
| 0 (local) | `NETWORK_ERROR`, `BAD_RESPONSE` | local codes (no HTTP) |

`SELF_TRADE_PREVENTED` and `NO_LIQUIDITY` are **not** submit-time errors. They appear as `cancel_reason` on the order after acceptance.

`scalper-1` is scripted to submit prices above the ceiling and **must** receive `422 PRICE_ABOVE_CEILING` with `details:{ceiling_minor, face_value_minor, ceiling_bps, price}`.

### C.1.4 WebSocket consumed by the sim: `ws://api:4000/ws`

| Item | Contract |
|---|---|
| Auth | **None**. The sim connects without a token and subscribes only to public channels |
| Subscribe | `{ "type":"subscribe", "channel":"book:<SYM>" }` and `{ "type":"subscribe", "channel":"trades:<SYM>" }` per asset (symbol, never UUID) |
| Message envelope read | `{ "type" or "channel", "data": {...}, "ts" }` (the sim derives behavior from `channel.startsWith('book:')` / `'trades:'`) |
| `book:<SYM>` → `BookSnapshot` | `data` = engine snapshot. Server **immediately sends the current snapshot** on subscribe |
| `trades:<SYM>` → `TradeTick` | `data`: ★`price`, ★`qty`, ★`ts` (number ms), ★`taker_side`, ★`seq` (strictly increasing; sim dedupes on it) |
| **Ack/error rule** | `{type:"subscribed", subscription:"…"}` and `{type:"error", code, message, subscription}` **must NOT contain a top-level `channel` field**, or the sim parses it as an empty book |
| Reconnect | Backoff 500 ms → 10 s. While down, falls back to REST book polling every 2 s |
| Recent trades cap | 200 per asset in memory |

## C.2 Inbound: the sim control server (port 7100)

> **Status: not implemented** (`main.ts` has hooks "STEP 14: start the control server"). Contract below is **PROPOSED**. Config fields `SIM_CONTROL_PORT` and `SIM_CONTROL_TOKEN` already exist and are **PINNED**.

### C.2.1 Authorization

| Item | Value |
|---|---|
| Header | `X-Sim-Token: <SIM_CONTROL_TOKEN>` (PROPOSED header name; token source PINNED) |
| Who calls | The API's `/admin/sim/*` proxy only (ADMIN role) |
| Failure | `401 UNAUTHENTICATED` |
| Missing server | The API returns `502` if unreachable |

### C.2.2 Endpoints (PROPOSED)

| Method + Path | Request body | Success `200` | Errors |
|---|---|---|---|
| `GET /status` | none | `{ "state":"stopped\|running\|paused", "mode":"demo\|continuous", "seed", "rps", "tasks": int, "ws_connected": bool, "uptime_s": int, "scenario": string\|null, "metrics": MetricsSnapshot }` | 401 |
| `POST /start` | `{ "mode"?: "demo\|continuous", "rps"?: number > 0 }` | `{ "state":"running" }` | 401, 400 |
| `POST /pause` | none | `{ "state":"paused" }` | 401 |
| `POST /resume` | none | `{ "state":"running" }` | 401 |
| `POST /scenario` | `{ "name": string, "params"?: object }` | `{ "scenario": name, "started_at": ms }` | 401, 400 unknown scenario, 409 already running |
| `POST /rps` | `{ "rps": number > 0 }` | `{ "rps": n }` | 401, 400 |

The API proxy maps: `POST /admin/sim/start`→`/start`, `/pause`→`/pause`, `/scenario`→`/scenario`.

### C.2.3 `MetricsSnapshot` (PINNED, `metrics.ts`)

```json
{ "ordersSent":0, "ordersAccepted":0, "ordersRejectedByCode":{"PRICE_ABOVE_CEILING":3},
  "cancelsSent":0, "apiRequests":0, "apiErrorsByStatus":{"429":2},
  "ordersByPersona":{"noise":120}, "cancelsByPersona":{"market_maker":80} }
```
`personaOf(botKey)` = substring before the first `-`.

### C.2.4 Scheduler state machine (PINNED, `scheduler.ts`)

States: `stopped` → `running` ⇄ `paused` → `stopped`. Methods: `start()`, `pause()`, `resume()`, `stop()`, `setRps(n)`, `register(TaskSpec)`, `unregister(key)`, `taskCount()`. In `demo` mode the sim starts **paused**.

`TaskSpec = { key: string; nextDelayMs(): number; run(): Promise<void>|void }` (priority/other fields per source).

## C.3 Configuration (PINNED, `config.ts`, `.env.example`)

| Env var | Type | Default | Notes |
|---|---|---|---|
| `API_BASE_URL` | URL | `http://api:4000` | trailing `/` stripped |
| `WS_URL` | string | `ws://api:4000/ws` | |
| `SIM_SEED` | string | `darkhold-demo-1` | Seeds the deterministic RNG |
| `SIM_MODE` | `demo`\|`continuous` | `demo` | |
| `SIM_CONTROL_PORT` | int 1..65535 | `7100` | |
| `SIM_CONTROL_TOKEN` | string | **required** | |
| `SIM_ACCOUNTS_FILE` | path | `/seed/accounts.json` | |
| `SIM_BENCH_ACCOUNTS_FILE` | path | unset | adds 200 bench accounts |
| `SIM_CANDLES_FILE` | path | `/seed/candles.seeded.json` | reference prices |
| `SIM_ASSET_PROFILE_FILE` | path | `./assets.profile.json` | symbol → `HIGH\|MEDIUM\|THIN` |
| `SIM_GLOBAL_RPS` | number > 0 | 40 (demo) / 150 (continuous) | |
| `LOG_LEVEL` | string | `info` | |

Empty-string env values are treated as unset. Invalid config throws `Invalid sim configuration: …` at start.

### C.3.1 Tunable parameters (`params.ts`, POLICY)

| Group | Values |
|---|---|
| `globalRps` | demo 40, continuous 150 |
| `minBotIntervalMs` | 250 |
| Regimes | `CALM {arrival 0.4, spread 1.0}`, `ACTIVE {1.0, 1.0}`, `VOLATILE {2.5, 1.8}`; changes every 60 to 180 s with transition matrix (ACTIVE→ACTIVE .6 / CALM .25 / VOLATILE .15; CALM→CALM .5 / ACTIVE .5; VOLATILE→VOLATILE .4 / ACTIVE .6) |
| Noise | rate/s `HIGH 4.0, MEDIUM 1.5, THIN 0.15`; `pMarketable 0.35`; qty 1..5; protection band 2% |
| Market maker | half-spread bps `HIGH 60, MEDIUM 100, THIN 200`; base qty by liquidity (HIGH 4, MEDIUM 3, THIN 2); refresh 3 000 ms ± 1 000; target inventory 100; max 200 |
| Momentum | eval 2 000 ms; window 20 trades / 30 s; min 8 trades; imbalance 0.4; cooldown 10 s; qty 1..3; band 1.5% |
| Profit taker | eval 5 s; target gain 500 bps; max qty 2; TTL 60 s |
| Canceler | scan 1 s; TTL 5 to 60 s; max 5 cancels per scan |
| Own state | balance refresh 10 s; reconcile 15 s ± 3 s; grace 5 s |
| Market feed | recent trades cap 200; reconnect 500 ms → 10 s; poll 2 s |
| API | retry delays `[200, 600]` ms; timeout 10 000 ms; book depth 15 |
| Assets refresh | 60 000 ms |

## C.4 Accounts and CLI contracts

### C.4.1 Persona roles (PINNED, `accounts.ts`)

`issuer, market_maker, noise, momentum, profit_taker, pump, scalper, judge_seller, judge_buyer, admin, bench`. Persona is the `role` field in `accounts.json`; the API maps `admin` → `role=ADMIN`, everything else `USER`.

### C.4.2 CLI: `npm run seed:history -w sim -- [options]`

| Option | Type | Default |
|---|---|---|
| `--seed` | string | `darkhold-history-1` |
| `--end` | ISO-8601 UTC (e.g. `2026-10-23T10:00:00Z`) | current time floored to the minute |
| `--out` | path | `ops/seed/candles.seeded.json` |

Unknown options → error exit 1. Output covers **6 h of `1m`** and the **last 30 min of `5s`** candles, `origin:"SEEDED_SIM"`. Use `--end` = "now" for a live demo. `npm run seed:fixture` pins `--end 2026-10-01T12:00:00Z`.

Other scripts: `start` (`node dist/main.js`), `dev` (`tsx src/main.ts`), `build`, `typecheck`, `test`.

---

# PART D: SHARED DATA FILE CONTRACTS (`ops/seed/`)

| File | Shape | Producer / consumer |
|---|---|---|
| `assets.json` | `{ schema_version:1, demo:[Asset], bench:[Asset] }`. Asset: `symbol, name, category, face_value_minor, ceiling_bps, ceiling_minor, tick_size, min_qty, max_qty, total_supply, liquidity` | `generate.mjs` → API seeder, sim history |
| `accounts.json` | `{ schema_version:1, password, accounts:[{ key, email, role, is_simulated, starter_credits, initial_units:{SYM:n}, quotes?:[SYM] }] }` (46 accounts; shared dev password `darkhold-sim-dev`) | API seeder, sim `Accounts` |
| `bench-accounts.json` | same shape; 200 accounts `bench-0001..0200`, 1 000 000 000 credits, 100 000 units of each `BENCH-*` asset | API seeder (`--bench`), sim |
| `candles.seeded.json` | `{ schema_version:1, seed, end_ts, assets:{ SYM:{ reference_price:int ≥1, candles:{ "1m":[Candle], "5s":[Candle] } } } }` validated by `seeded-candles.schema.json`. **Not in the zip: generate it (C.4.2)** | sim writer → API seeder, sim `MarketFeed.loadReferencePrices` |

Invariants: `ceiling_minor == floor(face_value_minor × ceiling_bps / 10000)`; `ceiling_minor % tick_size == 0`; `Σ units == total_supply`; `reference_price ∈ [tick_size, ceiling]`.

---

# PART E: ENGINE-FACING SUMMARY OF WHAT THE API ADDS (for cross-checking)

These public API items are the counterpart of Parts A to C. They are listed only to show the mapping.

| Public API item | Engine/candles/sim link |
|---|---|
| `POST /orders` → `SubmitOrder` | `user_id=users.id`, `order_id=uuidv7()`, `qty=quantity`, `price` |
| `DELETE /orders/:id` → `CancelOrder{reason:"USER"}` | Release of escrow happens only on `OrderCanceled` |
| Boot → `ConfigureAsset` | `collar_max_price = floor(ceiling/tick) × tick` |
| Policy change → `ConfigureAsset` + `CancelOrder{reason:"POLICY_BREACH"}` | |
| `GET /assets/:id/candles` | `@darkhold/candles` output merged with seeded rows |
| WS `candles:<SYM>:<interval>` → `CandleUpdate` | `ApplyResult.updated` |
| `/admin/sim/*` | Proxy to the sim control server (C.2) |

---

# PART F: ERROR-CODE MASTER TABLE (all layers)

| Code | HTTP | Layer | Where it occurs |
|---|---|---|---|
| `UNKNOWN_ASSET`, `ASSET_HALTED`, `INVALID_QTY`, `INVALID_PRICE`, `PRICE_NOT_ON_TICK`, `PRICE_ABOVE_COLLAR`, `NOTIONAL_OVERFLOW`, `INVALID_TIF`, `ORDER_ID_REUSED`, `INVALID_CONFIG` | 200 | engine-reject | engine reply body |
| `VALIDATION_FAILED` | 400 | engine-transport / api | both |
| `UNAUTHENTICATED` | 401 | engine-transport / api | engine token or JWT |
| `FORBIDDEN` | 403 | api | |
| `NOT_FOUND` | 404 | engine-transport | |
| `ORDER_NOT_FOUND` | 404 | api | |
| `ASSET_NOT_FOUND`, `AUCTION_NOT_FOUND` | 404 | api (**PROPOSED** additions, contract 1.1.0) | |
| `PAYLOAD_TOO_LARGE` | 413 | engine-transport | |
| `EPOCH_MISMATCH`, `AFTER_IN_FUTURE` | 409 | engine-transport | SSE |
| `IDEMPOTENCY_CONFLICT`, `EMAIL_TAKEN`, `ORDER_NOT_CANCELABLE`, `AUCTION_NOT_ACTIVE`, `AUCTION_ALREADY_SOLD`, `PRICE_MOVED` | 409 | api | |
| `REQUEST_IN_PROGRESS` | 409 | api (**PROPOSED**) | |
| `GONE` | 410 | engine-transport | SSE |
| `INSUFFICIENT_FUNDS`, `INSUFFICIENT_HOLDINGS`, `PRICE_ABOVE_CEILING`, `ASSET_NOT_TRADABLE`, `HOLDING_CAP_EXCEEDED`, `MAX_OPEN_ORDERS`, `SELF_TRADE_PREVENTED`, `NO_LIQUIDITY` | 422 | api | `SELF_TRADE_PREVENTED`/`NO_LIQUIDITY` are `cancel_reason` display codes, not submit errors |
| `RATE_LIMITED` | 429 | api | `Retry-After` integer seconds ≥ 1, `details.retry_after_ms` |
| `INTERNAL` | 500 | engine-transport / api | |
| `ENGINE_BUSY`, `ENGINE_UNAVAILABLE`, `TOO_MANY_SUBSCRIBERS` | 503 | engine-transport / api | `ENGINE_BUSY` carries `Retry-After: 1` |
| `COMMAND_TIMEOUT` | 504 | engine-transport | |

**API error envelope (PROPOSED, compatible with the sim):**
```json
{ "error": { "code": "PRICE_ABOVE_CEILING", "message": "Resale cap for DFEST-WKND is 12000 (120% of face value 10000)",
             "details": { "ceiling_minor":12000, "face_value_minor":10000, "ceiling_bps":12000, "price":13000 },
             "request_id": "…" } }
```
`details` always present (`{}` if unused).

---

# PART G: VERIFICATION CHECKLIST

| # | Check | Component |
|---|---|---|
| 1 | Every outgoing engine command validates against `command.*.schema.json` and contains no extra fields | Engine |
| 2 | Every consumed event/reply validates against `event.envelope`, `reply.command`, `book.snapshot`, `order.outcome`, `open-orders`, `health`, `sse.hello` | Engine |
| 3 | `seq` is contiguous; gap → reconnect, never skip | Engine |
| 4 | Fills are accounted from `TradeExecuted.qty` only | Engine |
| 5 | Resubmitted commands are byte-identical to the first submission | Engine |
| 6 | Exactly one SSE connection; never `FSYNC_POLICY=off` | Engine |
| 7 | `applyTick` replay with an old `seq` returns `ignored:true` | Candles |
| 8 | `flush` creates no candle for an empty bucket; restart creates no duplicates | Candles |
| 9 | All ★ fields in C.1.2 are served with the exact names | Sim |
| 10 | WS acks and errors have no top-level `channel` | Sim |
| 11 | Retried 5xx with the same idempotency key executes once and is not cached as final | Sim |
| 12 | `429` carries a truthful integer-seconds `Retry-After` | Sim |
| 13 | ~250 logins at start do not trip the auth rate limit | Sim |
| 14 | `scalper-1` receives `422 PRICE_ABOVE_CEILING` with `details` | Sim |
| 15 | `candles.seeded.json` exists, validates, and has `reference_price ∈ [tick, ceiling]` | Data |