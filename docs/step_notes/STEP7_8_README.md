# Steps 7 and 8: manual steps

Unzip over your repo root (`WEBSTER2026/`). Files land in `matching_engine/engine/crates/darkhold-engine/`.
`jobs.rs`, `state.rs`, `core_thread.rs`, `lib.rs`, `main.rs` REPLACE your Step 6 versions. The rest are new.

1. **core `engine.rs`**: add `pub fn outcomes_count(&self) -> usize { self.outcomes.len() }`.
2. **`http/mod.rs`**: add `pub mod queries; pub mod health;` and routes (same auth/body/concurrency group as commands):
   - `/v1/books/:asset` -> `queries::get_book`
   - `/v1/orders/:order_id` -> `queries::get_order`
   - `/v1/open-orders` -> `queries::get_open_orders`
   - `/metrics` -> `health::metrics` (auth only)
   - `/healthz` -> `health::healthz` (no auth)
3. **Step 6 handlers** (`http/commands.rs`, `http/events.rs`): `AppState` fields are `tx, config, ring, slot, metrics, core_alive, epoch`. Rename in either place if yours differ. `events.rs` should also use `slot` (`snapshot_all`, `changed_since`, `subscribe`) and update `metrics.sse_subscribers` / `sse_slowest_lag`.
4. **Names `main.rs` expects**: `Config::from_env()`, `shutdown::signal()`, `http::router(state)`; config fields `log_level, log_format, wal_dir, ring_capacity, queue_capacity, max_batch, snapshot_tick_ms, snapshot_depth, paranoid, fsync_policy, engine_bind, command_timeout_ms`; `FsyncPolicy` derives `Copy, Clone, PartialEq`; `Ring::new(cap)`, `push_batch(Vec<(u64, Arc<str>)>)`, `start_seq()`, `len()`; `Config` needs `command_timeout_ms` and `snapshot_depth`.
5. **Core signatures assumed**: `Engine::new(String)`, `book_view(&AssetId, usize) -> Option<_>`, `open_orders(Option<&AssetId>) -> Vec<_>`, `order_view(&OrderId) -> Option<_>`, `take_dirty_assets() -> Vec<AssetId>`, `check_invariants() -> Result<(), String>`, `asset_statuses()`, `EventEnvelope::to_json_string()`, `Command: Serialize + Clone` with `kind()`, `AssetId::parse`, `OrderId::parse`.
6. **`darkhold-engine/Cargo.toml`**: confirm deps `crc32fast, hdrhistogram, parking_lot, uuid (v4), crossbeam-channel, anyhow, thiserror`; dev-dep `tempfile`.
7. Delete any no-op WAL stub from your old `core_thread.rs`. Add `data/` to `.gitignore`.
8. Run `cargo test -p darkhold-engine` from `matching_engine/engine`. Then start the engine, kill it, restart: epoch must stay the same and `engine-cli tail` should show `book` events about every 100 ms.
