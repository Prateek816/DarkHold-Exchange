# Steps 3 and 4 drop-in files (darkhold-core/src)

New files (copy as-is): book.rs, matcher.rs, validate.rs, outcome.rs, view.rs, engine.rs, testutil.rs
Edit existing: src/lib.rs -> append the contents of lib_append_S3_S4.txt, then delete that .txt.

Assumes the Step 2 API: types/command/config/event/reply/fingerprint as described in the plan
(AssetId::parse/as_str, OrderId Copy, ReplyStatus enum, CommandReply public fields,
EventBody struct variants, AssetHalted/AssetResumed unit variants, Command tuple variants,
CancelReason = command reason, CancelEventReason = event reason).

Run:  cargo fmt --all && cargo clippy -p darkhold-core --all-targets -- -D warnings && cargo test -p darkhold-core
