use std::collections::{BTreeMap, BTreeSet};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

use crossbeam_channel::{Receiver, RecvTimeoutError};
use darkhold_core::{CommandReply, Engine, EventEnvelope};
use serde_json::{json, Value};
use tokio::sync::oneshot;

use crate::book_slot::BookSlot;
use crate::config::FsyncPolicy;
use crate::jobs::{Job, QueryKind, QueryReply};
use crate::metrics::Metrics;
use crate::ring::Ring;
use crate::time;
use crate::wal::{encode_command_record, WalSink};

/// Last command seen, for the panic hook and fatal logs.
pub static LAST_COMMAND: Mutex<String> = Mutex::new(String::new());

pub struct CoreArgs {
    pub engine: Engine,
    pub wal: Box<dyn WalSink>,
    pub fsync: FsyncPolicy,
    pub ring: Arc<Ring>,
    pub slot: Arc<BookSlot>,
    pub metrics: Arc<Metrics>,
    pub rx: Receiver<Job>,
    pub max_batch: usize,
    pub snapshot_tick_ms: u64,
    pub snapshot_depth: usize,
    pub paranoid: bool,
}

pub fn spawn(args: CoreArgs) -> std::io::Result<JoinHandle<()>> {
    std::thread::Builder::new()
        .name("core".into())
        .spawn(move || run(args))
}

fn fatal(msg: &str) -> ! {
    let last = LAST_COMMAND.lock().map(|g| g.clone()).unwrap_or_default();
    eprintln!("FATAL: {msg}; last command: {last}");
    tracing::error!(last_command = %last, "{msg}");
    std::process::abort()
}

fn policy_str(p: FsyncPolicy) -> &'static str {
    match p {
        FsyncPolicy::Always => "always",
        FsyncPolicy::Batch => "batch",
        FsyncPolicy::Off => "off",
    }
}

fn asset_name(a: &darkhold_core::AssetId) -> String {
    serde_json::to_value(a)
        .ok()
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_default()
}

struct StagedCmd {
    reply: CommandReply,
    tx: oneshot::Sender<CommandReply>,
    enq: Instant,
    queue_wait_us: u64,
    process_us: u64,
}

fn run(mut a: CoreArgs) {
    a.metrics.set_core_alive(true);
    a.metrics.set_wal_policy(policy_str(a.fsync));
    let tick = Duration::from_millis(a.snapshot_tick_ms);
    let mut last_tick = Instant::now();
    let mut last_books = Instant::now();
    let mut since_check: u64 = 0;
    let mut warned_outcomes = false;

    // initial snapshots (every asset touched during replay is dirty)
    publish_dirty(&mut a.engine, &a.slot, a.snapshot_depth);
    refresh_books(&a.engine, &a.metrics);

    loop {
        let first = match a.rx.recv_timeout(tick) {
            Ok(j) => Some(j),
            Err(RecvTimeoutError::Timeout) => None,
            Err(RecvTimeoutError::Disconnected) => break,
        };

        let mut shutdown_ack = None;
        if let Some(job) = first {
            let mut jobs = vec![job];
            while jobs.len() < a.max_batch {
                if matches!(jobs.last(), Some(Job::Shutdown { .. })) {
                    break;
                }
                match a.rx.try_recv() {
                    Ok(j) => jobs.push(j),
                    Err(_) => break,
                }
            }
            let (ack, n_cmds) = process_batch(&mut a, jobs);
            shutdown_ack = ack;
            since_check += n_cmds;
            a.metrics.outcomes_count.store(
                a.engine.outcomes_count() as u64,
                std::sync::atomic::Ordering::Relaxed,
            );
            if !warned_outcomes && a.engine.outcomes_count() >= 2_000_000 {
                tracing::warn!("outcome map reached 2,000,000 entries");
                warned_outcomes = true;
            }
        }

        if last_tick.elapsed() >= tick {
            publish_dirty(&mut a.engine, &a.slot, a.snapshot_depth);
            last_tick = Instant::now();
        }
        if last_books.elapsed() >= Duration::from_millis(1000) {
            refresh_books(&a.engine, &a.metrics);
            last_books = Instant::now();
        }

        if a.paranoid && since_check >= 100_000 {
            since_check = 0;
            if let Err(e) = a.engine.check_invariants() {
                fatal(&format!("invariant violation: {e}"));
            }
        }

        if let Some(ack) = shutdown_ack {
            if a.wal.sync().is_err() {
                fatal("wal fsync failed during shutdown");
            }
            let _ = ack.send(());
            break;
        }
    }
    if a.wal.sync().is_err() {
        fatal("wal fsync failed at exit");
    }
    a.metrics.set_core_alive(false);
}

fn process_batch(a: &mut CoreArgs, jobs: Vec<Job>) -> (Option<oneshot::Sender<()>>, u64) {
    let mut cmds: Vec<StagedCmd> = Vec::new();
    let mut queries: Vec<(oneshot::Sender<QueryReply>, QueryReply)> = Vec::new();
    let mut events: Vec<EventEnvelope> = Vec::new();
    let mut buf: Vec<u8> = Vec::new();
    let mut wal_us: u64 = 0;
    let mut ack = None;
    let mut kinds: Vec<&'static str> = Vec::new();

    for job in jobs {
        match job {
            Job::Command {
                cmd,
                enqueued_at,
                reply_tx,
            } => {
                let queue_wait_us = Instant::now().duration_since(enqueued_at).as_micros() as u64;
                let kind = cmd.kind();
                let cmd_json = match serde_json::to_string(&cmd) {
                    Ok(s) => s,
                    Err(e) => fatal(&format!("cannot serialize command: {e}")),
                };
                let ts = time::now_ms();
                let t = Instant::now();
                let p = a.engine.process(cmd, ts);
                let process_us = t.elapsed().as_micros() as u64;

                let rec = encode_command_record(p.ts_used, &cmd_json);
                if let Ok(mut g) = LAST_COMMAND.lock() {
                    g.clear();
                    g.push_str(&cmd_json);
                }
                if a.fsync == FsyncPolicy::Always {
                    let w = Instant::now();
                    if let Err(e) = a.wal.append(&rec) {
                        fatal(&format!("wal write failed: {e}"));
                    }
                    if let Err(e) = a.wal.sync() {
                        fatal(&format!("wal fsync failed: {e}"));
                    }
                    wal_us += w.elapsed().as_micros() as u64;
                } else {
                    buf.extend_from_slice(&rec);
                }
                events.extend(p.events);
                kinds.push(kind);
                cmds.push(StagedCmd {
                    reply: p.reply,
                    tx: reply_tx,
                    enq: enqueued_at,
                    queue_wait_us,
                    process_us,
                });
            }
            Job::Query {
                kind,
                enqueued_at: _,
                reply_tx,
            } => {
                queries.push((reply_tx, answer_query(&a.engine, kind)));
            }
            Job::Shutdown { ack_tx } => {
                ack = Some(ack_tx);
                break;
            }
        }
    }

    // group commit: one write, fsync per policy
    if !buf.is_empty() {
        let w = Instant::now();
        if let Err(e) = a.wal.append(&buf) {
            fatal(&format!("wal write failed: {e}"));
        }
        if a.fsync == FsyncPolicy::Batch {
            if let Err(e) = a.wal.sync() {
                fatal(&format!("wal fsync failed: {e}"));
            }
        }
        wal_us += w.elapsed().as_micros() as u64;
    }

    // release only after durable: ring first, then replies
    if !events.is_empty() {
        let entries: Vec<(u64, Arc<str>)> = events
            .iter()
            .map(|e| (e.seq, Arc::from(e.to_json_string())))
            .collect();
        a.metrics.record_events(entries.len() as u64);
        a.ring.push_batch(entries);
    }

    let n = cmds.len() as u64;
    if n > 0 {
        a.metrics.record_batch(n);
        a.metrics.record_wal(wal_us);
        a.metrics
            .set_wal(a.wal.bytes_written(), a.wal.fsync_count());
    }
    for (c, kind) in cmds.into_iter().zip(kinds.into_iter()) {
        a.metrics.record_command(kind);
        if let Ok(v) = serde_json::to_value(&c.reply) {
            let status = v.get("status").and_then(|s| s.as_str()).unwrap_or("");
            if kind == "submit" && status == "REJECTED" {
                if let Some(code) = v.get("code").and_then(|s| s.as_str()) {
                    a.metrics.record_reject(code);
                }
            }
            if kind == "cancel" {
                a.metrics.record_cancel(status);
            }
        }
        let _ = c.tx.send(c.reply);
        a.metrics.record_latency(
            c.queue_wait_us,
            c.process_us,
            c.enq.elapsed().as_micros() as u64,
        );
    }
    for (tx, reply) in queries {
        let _ = tx.send(reply);
    }
    (ack, n)
}

fn with_ts(v: &impl serde::Serialize) -> Value {
    let mut val = serde_json::to_value(v).unwrap_or(Value::Null);
    if let Some(o) = val.as_object_mut() {
        o.insert("ts".into(), json!(time::now_ms()));
    }
    val
}

fn answer_query(e: &Engine, kind: QueryKind) -> QueryReply {
    match kind {
        QueryKind::Book { asset, depth } => match e.book_view(&asset, depth) {
            Some(v) => QueryReply::Book(with_ts(&v)),
            None => QueryReply::NotFound,
        },
        QueryKind::Order { order_id } => match e.order_view(&order_id) {
            Some(v) => QueryReply::Order(serde_json::to_value(&v).unwrap_or(Value::Null)),
            None => QueryReply::NotFound,
        },
        QueryKind::OpenOrders { asset } => {
            let orders = e.open_orders(asset.as_ref());
            QueryReply::OpenOrders(json!({
                "engine_epoch": e.epoch(),
                "as_of_seq": e.last_seq(),
                "orders": orders,
            }))
        }
    }
}

/// Builds and stores a snapshot for every dirty asset (sorted by the engine).
pub fn publish_dirty(e: &mut Engine, slot: &BookSlot, depth: usize) {
    for asset in e.take_dirty_assets() {
        if let Some(v) = e.book_view(&asset, depth) {
            let val = with_ts(&v);
            slot.store(&asset_name(&asset), val.to_string());
        }
    }
}

fn refresh_books(e: &Engine, m: &Metrics) {
    let mut per: BTreeMap<String, (BTreeSet<u64>, BTreeSet<u64>, u64)> = BTreeMap::new();
    if let Ok(Value::Array(items)) = serde_json::to_value(e.asset_statuses()) {
        for it in items {
            let name = it
                .get("asset")
                .and_then(|x| x.as_str())
                .or_else(|| it.get(0).and_then(|x| x.as_str()));
            if let Some(n) = name {
                per.entry(n.to_string()).or_default();
            }
        }
    }
    if let Ok(Value::Array(orders)) = serde_json::to_value(e.open_orders(None)) {
        for o in orders {
            let asset = o
                .get("asset")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string();
            let side = o.get("side").and_then(|x| x.as_str()).unwrap_or("");
            let price = o.get("price").and_then(|x| x.as_u64()).unwrap_or(0);
            let ent = per.entry(asset).or_default();
            if side == "BUY" {
                ent.0.insert(price);
            } else {
                ent.1.insert(price);
            }
            ent.2 += 1;
        }
    }
    let mut out = serde_json::Map::new();
    for (a, (b, s, n)) in per {
        out.insert(
            a,
            json!({"bids_levels": b.len(), "asks_levels": s.len(), "resting_orders": n}),
        );
    }
    m.set_books(Value::Object(out));
}
