//! Determinism rule D8: same commands + same ts + same epoch => identical output.
#[path = "support/common.rs"]
mod common;
use common::*;
use serde_json::Value;

fn run(seed: u64, n: usize) -> Vec<(Vec<Value>, Value)> {
    let mut e = new_engine();
    let mut g = Gen::new(seed);
    let mut out = vec![];
    for (i, c) in Gen::setup().iter().enumerate() {
        out.push(process_json(&mut e, c, 1000 + i as u64));
    }
    for i in 0..n {
        let c = g.next();
        out.push(process_json(&mut e, &c, 2000 + i as u64));
    }
    check_invariants(&e);
    out
}

#[test]
fn replay_is_identical() {
    for seed in 0..20u64 {
        assert_eq!(run(seed, 400), run(seed, 400), "seed {seed}");
    }
}

#[test]
fn trade_ids_are_epoch_and_seq() {
    for (evs, _) in run(7, 400) {
        for e in evs.iter().filter(|e| e["type"] == "TradeExecuted") {
            assert_eq!(
                e["trade_id"].as_str().unwrap(),
                format!("{}:{}", EPOCH, e["seq"])
            );
        }
    }
}
