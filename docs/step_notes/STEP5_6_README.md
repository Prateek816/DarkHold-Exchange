# Steps 5 and 6 drop-in (extract at the repo root, WEBSTER2026/)

## Files
- matching_engine/contracts/fixtures/engine/ids.json              (overwrites Step 1 file: ids used by the goldens)
- matching_engine/contracts/fixtures/engine/scenarios/S01..S24    (overwrites Step 1 skeletons, full expected output)
- matching_engine/engine/crates/darkhold-core/tests/{golden,scenarios,properties,model,replay}.rs
- .../tests/support/{common,reference}.rs   (new files; your Step 2 support/mod.rs is untouched)
- .../benches/matching.rs
- matching_engine/engine/crates/darkhold-engine/**                  (Step 6 crate)
- matching_engine/tools/engine-cli/**                               (minimal CLI)

## Manual edits you must make (not overwritten on purpose)
1. engine/Cargo.toml: add "crates/darkhold-engine" to members, and
       [profile.release]
       panic = "abort"
       lto = "thin"
       codegen-units = 1
2. crates/darkhold-core/Cargo.toml: make sure dev-deps include serde_json, rand, rand_pcg, proptest, criterion, and add
       [[bench]]
       name = "matching"
       harness = false
3. matching_engine/package.json workspaces: add "tools/*" (already planned).

## Core API assumptions (all isolated; fix in one place if yours differs)
- tests/support/common.rs ("ADAPTER" block): Engine::new(String), Engine::process(Command, u64) -> {ts_used, events, reply},
  Engine::book_view(&AssetId, usize), Engine::check_invariants() -> Result<_, Debug>.
- darkhold-engine/src/lib.rs: Engine::new(String).  core_thread.rs: engine.process(cmd, ts) by value; p.ts_used / p.events / p.reply.
- Command, EventEnvelope, CommandReply must implement Serialize; Command also Deserialize.
- BookView serializes bids/asks as arrays of {price, qty, orders}.

## Run
cd matching_engine/engine && cargo test -p darkhold-core && cargo test -p darkhold-engine
Goldens were produced by an independent Python reference and match spec examples W2 (S09), W3 (S17), W4 (S14).
UPDATE_GOLDEN=1 cargo test -p darkhold-core --test golden rewrites expectations (review by hand).
Not compiled or run here.
