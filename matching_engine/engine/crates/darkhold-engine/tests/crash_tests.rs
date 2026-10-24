//! Step 9: crash safety. SIGKILL the real engine at random points, restart it
//! on the same WAL, and compare its state with an in-process `Engine` that is
//! fed exactly the acknowledged commands.
//!
//! CRASH_ITERATIONS controls the number of rounds (default 5; use 50 locally).
mod harness;

use std::sync::{Arc, Mutex};
use std::time::Duration;

use darkhold_core::{Command, Engine};
use harness::*;
use serde_json::Value;

// ---------------------------------------------------------------------------
// Seeded command stream (no external rand crate)
// ---------------------------------------------------------------------------

struct Rng(u64);

impl Rng {
    fn new(seed: u64) -> Rng {
        Rng(seed.wrapping_mul(0x9E37_79B9_7F4A_7C15) | 1)
    }
    fn next(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.0 = x;
        x
    }
    fn below(&mut self, n: u64) -> u64 {
        self.next() % n
    }
}

fn gen_stream(seed: u64, n: usize) -> Vec<Value> {
    let mut r = Rng::new(seed + 1);
    let mut out = vec![
        configure("TEST-A", 1, 1, 100, None),
        configure("TEST-B", 1, 1, 100, None),
    ];
    let mut placed: Vec<String> = Vec::new();
    let mut counter = 0u64;
    for _ in 0..n {
        let roll = r.below(100);
        if roll < 15 && !placed.is_empty() {
            let idx = r.below(placed.len() as u64) as usize;
            out.push(cancel(&placed[idx], "USER"));
            continue;
        }
        counter += 1;
        let id = oid(seed + 1, counter);
        let asset = if r.below(2) == 0 { "TEST-A" } else { "TEST-B" };
        let user = format!("U{}", 1 + r.below(5));
        let side = if r.below(2) == 0 { "BUY" } else { "SELL" };
        let qty = 1 + r.below(10);
        let cmd = if roll < 25 {
            let protection = if side == "BUY" { 110 } else { 90 };
            submit(&id, asset, &user, side, "MARKET", "IOC", qty, protection)
        } else {
            let tif = if roll < 35 { "IOC" } else { "GTC" };
            submit(&id, asset, &user, side, "LIMIT", tif, qty, 95 + r.below(11))
        };
        out.push(cmd);
        placed.push(id);
    }
    out
}

// ---------------------------------------------------------------------------
// Model comparison
// ---------------------------------------------------------------------------

fn build_model(epoch: &str, cmds: &[Value]) -> Engine {
    let mut e = Engine::new(epoch.to_string());
    for (i, c) in cmds.iter().enumerate() {
        let cmd: Command = serde_json::from_value(c.clone()).expect("model parse");
        let _ = e.process(cmd, 1_000 + i as u64);
    }
    e
}

/// Project an open-order entry to the fields both sides must agree on.
fn project(o: &Value) -> Value {
    serde_json::json!({
        "order_id": o["order_id"],
        "asset": o["asset"],
        "user_id": o["user_id"],
        "side": o["side"],
        "price": o["price"],
        "remaining_qty": o["remaining_qty"],
    })
}

fn orders_of(v: &Value) -> Vec<Value> {
    let arr = if v.is_array() {
        v.clone()
    } else {
        v["orders"].clone()
    };
    arr.as_array()
        .cloned()
        .unwrap_or_default()
        .iter()
        .map(project)
        .collect()
}

fn model_open_orders(e: &Engine) -> Vec<Value> {
    let v = serde_json::to_value(e.open_orders(None)).expect("serialize model open orders");
    orders_of(&v)
}

// ---------------------------------------------------------------------------
// The crash test
// ---------------------------------------------------------------------------

async fn run_iteration(seed: u64) {
    let dir = tempfile::tempdir().expect("tempdir");
    let mut srv = Server::start(dir.path(), &[]).await;
    let epoch = srv.epoch().await;

    let cmds = gen_stream(seed, 400);
    let acked: Arc<Mutex<Vec<Value>>> = Arc::new(Mutex::new(Vec::new()));
    let inflight: Arc<Mutex<Option<Value>>> = Arc::new(Mutex::new(None));

    let (client, base) = srv.handle();
    let (a2, i2, c2) = (acked.clone(), inflight.clone(), cmds.clone());
    let sender = tokio::spawn(async move {
        for cmd in c2 {
            *i2.lock().unwrap() = Some(cmd.clone());
            match post_command_to(&client, &base, &cmd).await {
                Ok((200, _)) => {
                    a2.lock().unwrap().push(cmd);
                    *i2.lock().unwrap() = None;
                }
                _ => break, // connection error or non-200: stop, leave inflight set
            }
        }
    });

    let delay = 20 + Rng::new(seed + 99).below(130);
    tokio::time::sleep(Duration::from_millis(delay)).await;
    srv.kill(); // SIGKILL
    let _ = sender.await;

    srv.restart().await;
    assert_eq!(
        srv.epoch().await,
        epoch,
        "epoch must survive a restart (seed {seed})"
    );

    let acked_cmds = acked.lock().unwrap().clone();
    let pending = inflight.lock().unwrap().clone();

    // model A: acknowledged commands only. model B: plus the in-flight command.
    let model_a = build_model(&epoch, &acked_cmds);
    let mut with_inflight = acked_cmds.clone();
    if let Some(p) = pending.clone() {
        with_inflight.push(p);
    }
    let model_b = build_model(&epoch, &with_inflight);

    // server state
    let (st, oo) = srv.get("/v1/open-orders").await;
    assert_eq!(st, 200);
    let server_orders = orders_of(&oo);
    let server_seq = srv.health().await["seq"].as_u64().unwrap();

    let ok_a = server_orders == model_open_orders(&model_a) && server_seq == model_a.last_seq();
    let ok_b = server_orders == model_open_orders(&model_b) && server_seq == model_b.last_seq();
    assert!(
        ok_a || ok_b,
        "seed {seed}: recovered state matches neither model (acked {}, inflight {}).\n server seq {server_seq}, model A seq {}, model B seq {}",
        acked_cmds.len(),
        pending.is_some(),
        model_a.last_seq(),
        model_b.last_seq()
    );

    // every acknowledged submit must be known to the engine
    for c in &acked_cmds {
        if c["type"] == "SubmitOrder" {
            let id = c["order_id"].as_str().unwrap();
            let (st, o) = srv.get(&format!("/v1/orders/{id}")).await;
            assert_eq!(st, 200, "seed {seed}: acknowledged order {id} lost");
            let status = o["status"].as_str().unwrap();
            if matches!(status, "OPEN" | "PARTIALLY_FILLED" | "FILLED") {
                assert_eq!(
                    o["filled_qty"].as_u64().unwrap() + o["remaining_qty"].as_u64().unwrap(),
                    o["qty"].as_u64().unwrap()
                );
            }
        }
    }

    // the recovered engine keeps working and continues the sequence
    let (st, r) = srv
        .post_command(&limit_gtc(
            &oid(seed + 1, 9_999),
            "TEST-A",
            "U9",
            "BUY",
            1,
            1,
        ))
        .await;
    assert_eq!(st, 200);
    assert_eq!(r["status"], "ACCEPTED");
    assert_eq!(r["seq"].as_u64().unwrap(), server_seq + 1);
}

#[tokio::test]
async fn sigkill_recovery_matches_acknowledged_commands() {
    let iterations: u64 = std::env::var("CRASH_ITERATIONS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(5);
    for seed in 0..iterations {
        run_iteration(seed).await;
    }
}

#[cfg(unix)]
#[tokio::test]
async fn sigterm_drains_and_exits_zero_and_state_survives() {
    let dir = tempfile::tempdir().expect("tempdir");
    let mut srv = Server::start(dir.path(), &[]).await;
    let epoch = srv.epoch().await;
    setup_test_asset(&srv).await;
    for i in 1..=20u64 {
        let (st, r) = srv
            .post_command(&limit_gtc(&oid(5, i), "TEST-A", "U1", "BUY", 1, 100))
            .await;
        assert_eq!(st, 200);
        assert_eq!(r["status"], "ACCEPTED");
    }
    let status = srv
        .terminate_and_wait(10)
        .expect("engine did not exit after SIGTERM");
    assert!(status.success(), "expected exit 0, got {status}");

    srv.spawn().await;
    assert_eq!(srv.epoch().await, epoch);
    assert_eq!(srv.health().await["seq"], 21);
    let (_, oo) = srv.get("/v1/open-orders").await;
    assert_eq!(oo["orders"].as_array().unwrap().len(), 20);
}

#[tokio::test]
async fn deleting_the_wal_creates_a_new_epoch() {
    let dir = tempfile::tempdir().expect("tempdir");
    let mut srv = Server::start(dir.path(), &[]).await;
    let first = srv.epoch().await;
    setup_test_asset(&srv).await;
    srv.kill();
    std::fs::remove_file(dir.path().join("commands.wal")).expect("remove wal");
    srv.spawn().await;
    let second = srv.epoch().await;
    assert_ne!(first, second);
    assert_eq!(srv.health().await["seq"], 0);
    // an old resume point is now refused
    let err = srv
        .open_sse(&format!("epoch={first}"))
        .await
        .err()
        .expect("old epoch must be refused");
    assert_eq!(err.0, 409);
}
