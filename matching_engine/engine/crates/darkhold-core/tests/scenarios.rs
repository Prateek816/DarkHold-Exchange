//! Targeted tests not expressible as goldens, plus the exact W1/W3/W4 worked examples.
#[path = "support/common.rs"]
mod common;
use common::*;
use serde_json::{json, Value};

const MAX_SAFE: u64 = 9007199254740991;

fn types(evs: &[Value]) -> Vec<String> {
    evs.iter()
        .map(|e| e["type"].as_str().unwrap().to_string())
        .collect()
}

#[test]
fn w1_partial_fill_exact() {
    let (a, b) = (uuid_n(1), uuid_n(2));
    let mut e = engine_with_asset(1000);
    let (_, r) = process_json(&mut e, &limit(&a, "U1", "SELL", 5, 100), 1001);
    assert_eq!(
        (
            r["status"].as_str(),
            r["seq"].as_u64(),
            r["last_seq"].as_u64()
        ),
        (Some("ACCEPTED"), Some(2), Some(2))
    );
    let (evs, r) = process_json(&mut e, &limit(&b, "U2", "BUY", 8, 100), 1002);
    assert_eq!(
        types(&evs),
        [
            "OrderAccepted",
            "TradeExecuted",
            "OrderFilled",
            "OrderPartiallyFilled"
        ]
    );
    assert_eq!(evs[1]["seq"], json!(4));
    assert_eq!(evs[1]["trade_id"], json!("e-test0001:4"));
    assert_eq!(evs[1]["price"], json!(100));
    assert_eq!(evs[1]["qty"], json!(5));
    assert_eq!(evs[1]["buy_remaining"], json!(3));
    assert_eq!(evs[1]["sell_remaining"], json!(0));
    assert_eq!(evs[1]["taker_side"], json!("BUY"));
    assert_eq!(evs[3]["filled_qty"], json!(5));
    assert_eq!(evs[3]["remaining_qty"], json!(3));
    assert_eq!(
        (r["seq"].as_u64(), r["last_seq"].as_u64()),
        (Some(3), Some(6))
    );
}

#[test]
fn w3_self_trade() {
    let (a, b) = (uuid_n(1), uuid_n(2));
    let mut e = engine_with_asset(1000);
    process_json(&mut e, &limit(&a, "U1", "SELL", 5, 100), 1001);
    let (evs, r) = process_json(&mut e, &limit(&b, "U1", "BUY", 5, 100), 1002);
    assert_eq!(types(&evs), ["OrderAccepted", "OrderCanceled"]);
    assert_eq!(evs[1]["reason"], json!("SELF_TRADE_PREVENTED"));
    assert_eq!(
        (r["seq"].as_u64(), r["last_seq"].as_u64()),
        (Some(3), Some(4))
    );
    let book = book_json(&e, "TEST-A");
    assert_eq!(norm_levels(&book["asks"]), json!([[100, 5, 1]]));
}

#[test]
fn w4_cancel_after_fill() {
    let (a, b) = (uuid_n(1), uuid_n(2));
    let mut e = engine_with_asset(1000);
    process_json(&mut e, &limit(&a, "U1", "SELL", 5, 100), 1001);
    process_json(&mut e, &limit(&b, "U2", "BUY", 5, 100), 1002);
    let (evs, r) = process_json(&mut e, &cancel(&a, "USER"), 1003);
    assert!(evs.is_empty());
    assert_eq!(r["status"], json!("ALREADY_FILLED"));
    assert_eq!(r["seq"], Value::Null);
    assert_eq!(r["last_seq"], json!(6));
    assert_eq!(r["duplicate"], json!(false));
}

#[test]
fn tombstone_compaction_many_cancels() {
    let mut e = engine_with_asset(1000);
    let n = 5000u64;
    for i in 1..=n {
        let (_, r) = process_json(
            &mut e,
            &limit(&uuid_n(i), &format!("U{i}"), "BUY", 1, 100),
            1001 + i,
        );
        assert_eq!(r["status"], json!("ACCEPTED"));
    }
    // cancel everything except the last 10, newest first to maximise tombstones at the front
    for i in 1..=(n - 10) {
        let (_, r) = process_json(&mut e, &cancel(&uuid_n(i), "USER"), 10_000 + i);
        assert_eq!(r["status"], json!("CANCELED"));
    }
    check_invariants(&e);
    let book = book_json(&e, "TEST-A");
    assert_eq!(norm_levels(&book["bids"]), json!([[100, 10, 10]]));
    // FIFO: a sell of 3 must trade with the oldest three survivors
    let (evs, _) = process_json(
        &mut e,
        &limit(&uuid_n(99_999), "SELLER", "SELL", 3, 100),
        50_000,
    );
    let makers: Vec<Value> = evs
        .iter()
        .filter(|x| x["type"] == "TradeExecuted")
        .map(|x| x["maker_order_id"].clone())
        .collect();
    assert_eq!(
        makers,
        vec![
            json!(uuid_n(n - 9)),
            json!(uuid_n(n - 8)),
            json!(uuid_n(n - 7))
        ]
    );
    check_invariants(&e);
}

#[test]
fn large_quantity_limits() {
    let mut e = new_engine();
    process_json(
        &mut e,
        &configure("TEST-A", 1, 1, MAX_SAFE, None, "ACTIVE"),
        1000,
    );
    let (_, r) = process_json(&mut e, &limit(&uuid_n(1), "U1", "BUY", MAX_SAFE, 1), 1001);
    assert_eq!(r["status"], json!("ACCEPTED"));
    let (_, r) = process_json(&mut e, &limit(&uuid_n(2), "U1", "BUY", MAX_SAFE, 2), 1002);
    assert_eq!(r["status"], json!("REJECTED"));
    assert_eq!(r["code"], json!("NOTIONAL_OVERFLOW"));
    // full fill of the huge order
    let (evs, _) = process_json(&mut e, &limit(&uuid_n(3), "U2", "SELL", MAX_SAFE, 1), 1003);
    assert_eq!(evs[1]["qty"], json!(MAX_SAFE));
    check_invariants(&e);
}

#[test]
fn clock_regression_is_clamped() {
    let mut e = engine_with_asset(1000);
    let (evs, _) = process_json(&mut e, &limit(&uuid_n(1), "U1", "BUY", 1, 100), 500);
    assert_eq!(evs[0]["ts"], json!(1000));
}
