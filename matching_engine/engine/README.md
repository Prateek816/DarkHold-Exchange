# Darkhold engine

Rust workspace. Run every `cargo` command from `matching_engine/engine`.

| Crate | Role |
|---|---|
| `darkhold-core` | Pure deterministic library: book, matcher, validation, `Engine::process`. No I/O, no clock, no randomness |
| `darkhold-engine` | Binary plus library: tokio shell, single core thread, WAL, recovery, event ring, HTTP and SSE |
| `darkhold-bench` | Engine-only benchmarks (S1, S1b, S2) |

## Run

```bash
cd matching_engine/engine
ENGINE_TOKEN=dev-token WAL_DIR=./data cargo run --release -p darkhold-engine
```

`ENGINE_TOKEN` is required. The first start creates `WAL_DIR/commands.wal` and a new `engine_epoch`.
Deleting the WAL means a new epoch, so consumers must rebuild.

## Endpoints (all but `/healthz` need header `X-Engine-Token`)

| Route | Purpose |
|---|---|
| `POST /v1/commands` | SubmitOrder, CancelOrder, ConfigureAsset, HaltAsset, ResumeAsset |
| `GET /v1/books/:asset?depth=` | Book snapshot |
| `GET /v1/orders/:order_id` | Order outcome |
| `GET /v1/open-orders?asset=` | Resting orders, sorted by asset then accept_seq |
| `GET /v1/events?after=&epoch=` | SSE stream with resume |
| `GET /metrics`, `GET /healthz` | Metrics (auth), health (no auth) |

## Environment

`ENGINE_BIND` (0.0.0.0:7000), `ENGINE_TOKEN` (required), `WAL_DIR` (./data), `FSYNC_POLICY` (always, batch, off; default batch),
`QUEUE_CAPACITY` (10000), `MAX_BATCH` (256), `COMMAND_TIMEOUT_MS` (2000), `RING_CAPACITY` (300000), `SNAPSHOT_TICK_MS` (100),
`SNAPSHOT_DEPTH` (15), `SSE_HEARTBEAT_MS` (15000), `SSE_MAX_SUBSCRIBERS` (8), `MAX_BODY_BYTES` (16384), `PARANOID` (0), `LOG_LEVEL`, `LOG_FORMAT`.

## Tests

```bash
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace                       # unit, golden, property, model, replay, schema, integration
CRASH_ITERATIONS=50 cargo test -p darkhold-engine --test crash_tests   # default is 5
DARKHOLD_TEST_LOG=1 cargo test -p darkhold-engine --test sse_guard_tests -- --nocapture   # show engine logs
```

Integration tests in `crates/darkhold-engine/tests/`:

| File | What |
|---|---|
| `harness/mod.rs` | Spawns the real binary on a free port with a temp WAL dir, SSE reader, command builders |
| `http_full_tests.rs` | Auth, strict parsing, 413, command replies, queries, metrics shape, concurrency |
| `sse_guard_tests.rs` | hello, resume, epoch mismatch 409, future 409, gone 410 (and boundary), cap 503, heartbeat, identical streams |
| `crash_tests.rs` | SIGKILL at random points, restart, compare with an in-process `Engine` fed the acknowledged commands. Also SIGTERM and WAL-deleted tests |

## Developer CLI

`tools/engine-cli` (`npm run build -w tools/engine-cli`, then `npx engine-cli --help`). Uses `ENGINE_URL` and `ENGINE_TOKEN`.
