use std::io;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use darkhold_core::{Command, CommandReply, Engine};
use darkhold_engine::book_slot::BookSlot;
use darkhold_engine::config::FsyncPolicy;
use darkhold_engine::core_thread::{spawn, CoreArgs};
use darkhold_engine::jobs::Job;
use darkhold_engine::metrics::Metrics;
use darkhold_engine::ring::Ring;
use darkhold_engine::wal::WalSink;
use serde_json::json;
use tokio::sync::oneshot;

#[derive(Clone, Default)]
struct Log(Arc<Mutex<Vec<String>>>);
struct Fake {
    log: Log,
    bytes: u64,
    syncs: u64,
}
impl WalSink for Fake {
    fn append(&mut self, b: &[u8]) -> io::Result<()> {
        self.bytes += b.len() as u64;
        self.log.0.lock().unwrap().push("append".into());
        Ok(())
    }
    fn sync(&mut self) -> io::Result<Duration> {
        self.syncs += 1;
        self.log.0.lock().unwrap().push("sync".into());
        Ok(Duration::from_micros(1))
    }
    fn bytes_written(&self) -> u64 {
        self.bytes
    }
    fn fsync_count(&self) -> u64 {
        self.syncs
    }
}

fn cfg() -> Command {
    serde_json::from_value(json!({"type":"ConfigureAsset","asset":"TEST-A","tick_size":1,"min_qty":1,"max_qty":1000,"collar_max_price":null,"status":"ACTIVE"})).unwrap()
}
fn submit(i: u64) -> Command {
    serde_json::from_value(json!({
        "type":"SubmitOrder","order_id":uuid::Uuid::new_v4().to_string(),"asset":"TEST-A",
        "user_id":format!("u-{i}"),"side":"BUY","order_type":"LIMIT","tif":"GTC","qty":1,"price":100
    }))
    .unwrap()
}

struct Rig {
    tx: crossbeam_channel::Sender<Job>,
    rxs: Vec<oneshot::Receiver<CommandReply>>,
    log: Log,
    handle: std::thread::JoinHandle<()>,
}

fn rig(policy: FsyncPolicy, n: u64, with_shutdown: bool) -> (Rig, Option<oneshot::Receiver<()>>) {
    let (tx, rx) = crossbeam_channel::bounded::<Job>(1000);
    let mut rxs = Vec::new();
    let mut cmds = vec![cfg()];
    cmds.extend((0..n).map(submit));
    for c in cmds {
        let (rtx, rrx) = oneshot::channel();
        tx.send(Job::Command {
            cmd: c,
            enqueued_at: Instant::now(),
            reply_tx: rtx,
        })
        .unwrap();
        rxs.push(rrx);
    }
    let ack = if with_shutdown {
        let (atx, arx) = oneshot::channel();
        tx.send(Job::Shutdown { ack_tx: atx }).unwrap();
        Some(arx)
    } else {
        None
    };
    let log = Log::default();
    let handle = spawn(CoreArgs {
        engine: Engine::new("e-test0001".to_string()),
        wal: Box::new(Fake {
            log: log.clone(),
            bytes: 0,
            syncs: 0,
        }),
        fsync: policy,
        ring: Arc::new(Ring::new(1000)),
        slot: Arc::new(BookSlot::new()),
        metrics: Arc::new(Metrics::new(Arc::new(AtomicBool::new(true)))),
        rx,
        max_batch: 256,
        snapshot_tick_ms: 50,
        snapshot_depth: 15,
        paranoid: false,
    })
    .unwrap();
    (
        Rig {
            tx,
            rxs,
            log,
            handle,
        },
        ack,
    )
}

fn count(log: &Log, what: &str) -> usize {
    log.0
        .lock()
        .unwrap()
        .iter()
        .filter(|s| s.as_str() == what)
        .count()
}

#[test]
fn replies_released_only_after_wal_sync_batch() {
    let (mut r, _) = rig(FsyncPolicy::Batch, 5, false);
    for rx in r.rxs.drain(..) {
        rx.blocking_recv().unwrap();
        assert!(count(&r.log, "sync") >= 1);
        assert!(count(&r.log, "append") >= 1);
    }
    assert_eq!(count(&r.log, "sync"), 1);
    drop(r.tx);
    r.handle.join().unwrap();
}

#[test]
fn always_policy_syncs_per_command() {
    let (mut r, _) = rig(FsyncPolicy::Always, 4, false);
    for rx in r.rxs.drain(..) {
        rx.blocking_recv().unwrap();
    }
    assert_eq!(count(&r.log, "sync"), 5);
    drop(r.tx);
    r.handle.join().unwrap();
}

#[test]
fn shutdown_drains_queue() {
    let (mut r, ack) = rig(FsyncPolicy::Batch, 3, true);
    ack.unwrap().blocking_recv().unwrap();
    for rx in r.rxs.drain(..) {
        rx.blocking_recv().unwrap();
    }
    r.handle.join().unwrap();
}
