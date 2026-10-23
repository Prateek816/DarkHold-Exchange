use std::path::Path;

use darkhold_core::{Command, Engine};
use darkhold_engine::recovery::recover;
use darkhold_engine::wal::{encode_command_record, wal_path};
use serde_json::json;

fn cfg() -> Command {
    serde_json::from_value(json!({"type":"ConfigureAsset","asset":"TEST-A","tick_size":1,"min_qty":1,"max_qty":1000,"collar_max_price":null,"status":"ACTIVE"})).unwrap()
}
fn submit(user: &str, side: &str, qty: u64, price: u64) -> Command {
    serde_json::from_value(json!({
        "type":"SubmitOrder","order_id":uuid::Uuid::new_v4().to_string(),"asset":"TEST-A",
        "user_id":user,"side":side,"order_type":"LIMIT","tif":"GTC","qty":qty,"price":price
    }))
    .unwrap()
}

/// Writes commands the way the core thread does; returns (live engine, live event count).
fn write_live(dir: &Path, cmds: &[Command]) -> (Engine, usize) {
    let mut rec = recover(dir, 10_000).unwrap();
    let epoch = rec.engine.epoch().to_string();
    let mut live = Engine::new(epoch);
    let mut events = 0;
    for (i, c) in cmds.iter().enumerate() {
        let json = serde_json::to_string(c).unwrap();
        let p = live.process(c.clone(), 1000 + i as u64);
        events += p.events.len();
        rec.wal
            .append_batch(&encode_command_record(p.ts_used, &json))
            .unwrap();
    }
    rec.wal.sync().unwrap();
    (live, events)
}

fn script() -> Vec<Command> {
    vec![
        cfg(),
        submit("U1", "SELL", 5, 100),
        submit("U2", "BUY", 3, 100),
        submit("U3", "BUY", 2, 99),
    ]
}

#[test]
fn fresh_start_creates_epoch() {
    let d = tempfile::tempdir().unwrap();
    let r = recover(d.path(), 1000).unwrap();
    assert!(r.fresh);
    let e = r.engine.epoch().to_string();
    assert!(e.starts_with("e-") && e.len() == 10);
    assert!(wal_path(d.path()).exists());
}

#[test]
fn restart_keeps_epoch() {
    let d = tempfile::tempdir().unwrap();
    let e1 = recover(d.path(), 1000).unwrap().engine.epoch().to_string();
    let r2 = recover(d.path(), 1000).unwrap();
    assert!(!r2.fresh);
    assert_eq!(r2.engine.epoch(), e1);
}

#[test]
fn replay_equals_live_run() {
    let d = tempfile::tempdir().unwrap();
    let (live, events) = write_live(d.path(), &script());
    let r = recover(d.path(), 10_000).unwrap();
    assert_eq!(r.stats.records_replayed, 4);
    assert_eq!(r.ring.len(), events);
    assert_eq!(r.engine.last_seq(), live.last_seq());
    assert_eq!(
        serde_json::to_value(r.engine.open_orders(None)).unwrap(),
        serde_json::to_value(live.open_orders(None)).unwrap()
    );
}

#[test]
fn torn_tail_recovery() {
    let d = tempfile::tempdir().unwrap();
    write_live(d.path(), &script());
    let p = wal_path(d.path());
    let len = std::fs::metadata(&p).unwrap().len();
    std::fs::OpenOptions::new()
        .write(true)
        .open(&p)
        .unwrap()
        .set_len(len - 3)
        .unwrap();
    let r = recover(d.path(), 10_000).unwrap();
    assert!(r.stats.truncated_bytes > 0);
    assert_eq!(r.stats.records_replayed, 3);
}
