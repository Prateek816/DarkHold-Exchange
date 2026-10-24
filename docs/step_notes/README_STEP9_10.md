# Steps 9 and 10: what to do by hand

Unzip at the repo root (it creates `matching_engine/...`). Nothing was compiled or run, so run the checks at the bottom.

## Files that replace Step 6 files
- `matching_engine/tools/engine-cli/*` is the full CLI. Delete your minimal-build files there first (old `src/`, `package.json`).

## Manual changes (only if your earlier steps differ from the plan)
1. **Binary name.** Tests use `CARGO_BIN_EXE_darkhold-engine`. If your `[[bin]]`/package name differs, edit the one `env!(...)` line in `crates/darkhold-engine/tests/harness/mod.rs`.
2. **Dev-dependencies of `darkhold-engine`** (must exist per the plan): `tempfile`, `reqwest` (features `json`, `stream`), `serde_json`, `uuid`, `futures-util`, `tokio` (macros, rt-multi-thread). `darkhold-core` must be a normal dependency.
3. **`crash_tests.rs` uses these core APIs**, adjust if your signatures differ:
   - `Engine::new(epoch.into())` (takes `String` or `&str`)
   - `engine.process(command, ts)`, `engine.open_orders(None)` (result must be `Serialize`; either an array or an object with `orders`), `engine.last_seq()`
   - `darkhold_core::{Command, Engine}` re-exported from `lib.rs`
4. **Env names and behaviour** assumed from Section 15: `RING_CAPACITY` (min 1000), `SSE_MAX_SUBSCRIBERS`, `SSE_HEARTBEAT_MS`, `SNAPSHOT_TICK_MS`, `FSYNC_POLICY`. SSE tests also expect `/healthz` field `seq` and a `Retry`-free 409/410/503 envelope as in Section 3.8.
5. **Existing test files.** Mine are new names (`http_full_tests.rs`, `sse_guard_tests.rs`, `crash_tests.rs`, `harness/`). Your Step 6 `http_tests.rs` and `sse_tests.rs` stay as they are. Delete mine if they duplicate yours.
6. **Root `matching_engine/package.json`** workspaces must include `contracts`, `packages/*`, `tools/*` (plus `sim`, `bench` once they exist). Then run `npm install` from `matching_engine/`.
7. **`tsconfig.base.json`** must exist (Step 0). Both new `tsconfig.json` files extend it and override module settings themselves.
8. `.gitignore`: make sure `dist/` and `engine/target` are ignored.

## Check commands
```bash
cd matching_engine/engine && cargo test -p darkhold-engine          # CRASH_ITERATIONS=50 for the long run
cd .. && npm install
npm run build -w @darkhold/candles && npm test -w @darkhold/candles
npm run build -w engine-cli && npm test -w engine-cli
```
