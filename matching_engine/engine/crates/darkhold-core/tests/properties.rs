#[path = "support/common.rs"]
mod common;
use common::*;
use proptest::prelude::*;
use serde_json::Value;
use std::collections::HashMap;

struct O {
    price: u64,
    qty: u64,
    filled: u64,
    closed: bool,
}

fn s<'a>(v: &'a Value, k: &str) -> &'a str {
    v[k].as_str().unwrap()
}
fn u(v: &Value, k: &str) -> u64 {
    v[k].as_u64().unwrap()
}

/// Property 8: event order inside a submit command.
fn check_order(cmd: &Value, evs: &[Value]) {
    if cmd["type"] != "SubmitOrder" || evs.is_empty() {
        return;
    }
    let id = s(cmd, "order_id");
    let t0 = s(&evs[0], "type");
    assert!(
        t0 == "OrderAccepted" || t0 == "OrderRejected",
        "first event {t0}"
    );
    if t0 == "OrderRejected" {
        assert_eq!(evs.len(), 1);
        return;
    }
    let mut i = 1;
    while i < evs.len() && s(&evs[i], "type") == "TradeExecuted" {
        let maker = s(&evs[i], "maker_order_id");
        assert!(i + 1 < evs.len(), "trade without maker status");
        let st = s(&evs[i + 1], "type");
        assert!(st == "OrderFilled" || st == "OrderPartiallyFilled");
        assert_eq!(s(&evs[i + 1], "order_id"), maker);
        i += 2;
    }
    assert!(evs.len() - i <= 1, "more than one taker final event");
    if i < evs.len() {
        let t = s(&evs[i], "type");
        assert!(["OrderFilled", "OrderPartiallyFilled", "OrderCanceled"].contains(&t));
        assert_eq!(s(&evs[i], "order_id"), id);
    }
}

fn run(seed: u64, n: usize) {
    let mut e = new_engine();
    let mut g = Gen::new(seed);
    let mut orders: HashMap<String, O> = HashMap::new();
    let mut prev_last = 0u64;
    let mut cmds = Gen::setup();
    for _ in 0..n {
        cmds.push(g.next());
    }
    for (i, c) in cmds.iter().enumerate() {
        let (evs, reply) = process_json(&mut e, c, 1000 + i as u64);
        check_invariants(&e); // property 1
                              // property 2: contiguous seq
        for (k, ev) in evs.iter().enumerate() {
            assert_eq!(u(ev, "seq"), prev_last + 1 + k as u64);
        }
        prev_last += evs.len() as u64;
        assert_eq!(u(&reply, "last_seq"), prev_last);
        if evs.is_empty() {
            assert!(reply["seq"].is_null());
        } else if reply["status"] != "REJECTED" || reply["seq"].is_u64() {
            assert_eq!(u(&reply, "seq"), u(&evs[0], "seq"));
        }
        check_order(c, &evs);
        for ev in &evs {
            match s(ev, "type") {
                "OrderAccepted" => {
                    orders.insert(
                        s(ev, "order_id").to_string(),
                        O {
                            price: u(ev, "price"),
                            qty: u(ev, "qty"),
                            filled: 0,
                            closed: false,
                        },
                    );
                }
                "TradeExecuted" => {
                    let (m, t) = (s(ev, "maker_order_id"), s(ev, "taker_order_id"));
                    let q = u(ev, "qty");
                    let mo = orders.get_mut(m).expect("maker must be an accepted order"); // property 7
                    assert!(!mo.closed, "closed order traded"); // property 5
                    assert!(q <= mo.qty - mo.filled, "qty exceeds maker remaining"); // property 4
                    assert_eq!(u(ev, "price"), mo.price, "price must equal maker price");
                    mo.filled += q;
                    let mrem = mo.qty - mo.filled;
                    let to = orders.get_mut(t).expect("taker must be accepted");
                    assert!(!to.closed);
                    assert!(q <= to.qty - to.filled);
                    to.filled += q; // property 6 follows from the check above
                    let trem = to.qty - to.filled;
                    let (br, sr) = if s(ev, "taker_side") == "BUY" {
                        (trem, mrem)
                    } else {
                        (mrem, trem)
                    };
                    assert_eq!((u(ev, "buy_remaining"), u(ev, "sell_remaining")), (br, sr));
                }
                "OrderFilled" | "OrderCanceled" => {
                    let o = orders.get_mut(s(ev, "order_id")).unwrap();
                    o.closed = true;
                    if s(ev, "type") == "OrderFilled" {
                        assert_eq!(u(ev, "filled_qty"), o.qty);
                    }
                }
                "OrderPartiallyFilled" => {
                    let o = &orders[s(ev, "order_id")];
                    assert_eq!(u(ev, "filled_qty"), o.filled);
                    assert_eq!(u(ev, "remaining_qty"), o.qty - o.filled);
                }
                _ => {}
            }
        }
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]
    #[test]
    fn engine_properties(seed in any::<u64>(), n in 20usize..250) {
        run(seed, n);
    }
}
