use std::collections::BTreeMap;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;

use hdrhistogram::Histogram;
use parking_lot::Mutex;
use serde_json::{json, Value};

struct Inner {
    commands_total: u64,
    by_type: BTreeMap<String, u64>,
    events_total: u64,
    rejects: BTreeMap<String, u64>,
    cancels: BTreeMap<String, u64>,
    queue_wait: Histogram<u64>,
    process: Histogram<u64>,
    wal: Histogram<u64>,
    total: Histogram<u64>,
    batch: Histogram<u64>,
    wal_bytes: u64,
    fsync_count: u64,
    fsync_policy: String,
    books: Value,
}

pub struct MetricsExtra {
    pub engine_epoch: String,
    pub seq: u64,
    pub ring_start_seq: u64,
    pub ring_len: u64,
    pub queue_depth: u64,
    pub queue_capacity: u64,
}

pub struct Metrics {
    inner: Mutex<Inner>,
    core_alive: Arc<AtomicBool>,
    pub sse_subscribers: AtomicU64,
    pub sse_slowest_lag: AtomicU64,
    pub outcomes_count: AtomicU64,
    pub busy_count: AtomicU64,
    started: Instant,
}

fn hist(max: u64) -> Histogram<u64> {
    Histogram::new_with_max(max, 3).expect("histogram")
}

fn stats(h: &Histogram<u64>) -> Value {
    if h.len() == 0 {
        return json!({"count":0,"min":0,"p50":0,"p95":0,"p99":0,"max":0});
    }
    json!({
        "count": h.len(),
        "min": h.min(),
        "p50": h.value_at_quantile(0.50),
        "p95": h.value_at_quantile(0.95),
        "p99": h.value_at_quantile(0.99),
        "max": h.max(),
    })
}

impl Metrics {
    pub fn new(core_alive: Arc<AtomicBool>) -> Self {
        Metrics {
            inner: Mutex::new(Inner {
                commands_total: 0,
                by_type: BTreeMap::new(),
                events_total: 0,
                rejects: BTreeMap::new(),
                cancels: BTreeMap::new(),
                queue_wait: hist(60_000_000),
                process: hist(60_000_000),
                wal: hist(60_000_000),
                total: hist(60_000_000),
                batch: hist(1_000_000),
                wal_bytes: 0,
                fsync_count: 0,
                fsync_policy: "batch".into(),
                books: json!({}),
            }),
            core_alive,
            sse_subscribers: AtomicU64::new(0),
            sse_slowest_lag: AtomicU64::new(0),
            outcomes_count: AtomicU64::new(0),
            busy_count: AtomicU64::new(0),
            started: Instant::now(),
        }
    }

    pub fn core_alive(&self) -> bool {
        self.core_alive.load(Ordering::SeqCst)
    }
    pub fn set_core_alive(&self, v: bool) {
        self.core_alive.store(v, Ordering::SeqCst);
    }
    pub fn uptime_s(&self) -> u64 {
        self.started.elapsed().as_secs()
    }

    pub fn record_command(&self, kind: &str) {
        let mut g = self.inner.lock();
        g.commands_total += 1;
        *g.by_type.entry(kind.to_string()).or_insert(0) += 1;
    }
    pub fn record_events(&self, n: u64) {
        self.inner.lock().events_total += n;
    }
    pub fn record_reject(&self, code: &str) {
        *self
            .inner
            .lock()
            .rejects
            .entry(code.to_string())
            .or_insert(0) += 1;
    }
    pub fn record_cancel(&self, outcome: &str) {
        *self
            .inner
            .lock()
            .cancels
            .entry(outcome.to_string())
            .or_insert(0) += 1;
    }
    pub fn record_latency(&self, queue_wait_us: u64, process_us: u64, total_us: u64) {
        let mut g = self.inner.lock();
        g.queue_wait.saturating_record(queue_wait_us);
        g.process.saturating_record(process_us);
        g.total.saturating_record(total_us);
    }
    pub fn record_wal(&self, us: u64) {
        self.inner.lock().wal.saturating_record(us);
    }
    pub fn record_batch(&self, n: u64) {
        self.inner.lock().batch.saturating_record(n);
    }
    pub fn set_wal(&self, bytes: u64, fsync_count: u64) {
        let mut g = self.inner.lock();
        g.wal_bytes = bytes;
        g.fsync_count = fsync_count;
    }
    pub fn set_wal_policy(&self, p: &str) {
        self.inner.lock().fsync_policy = p.to_string();
    }
    pub fn set_books(&self, v: Value) {
        self.inner.lock().books = v;
    }

    pub fn snapshot_json(&self, x: &MetricsExtra) -> Value {
        let g = self.inner.lock();
        json!({
            "engine_epoch": x.engine_epoch,
            "seq": x.seq,
            "ring_start_seq": x.ring_start_seq,
            "ring_len": x.ring_len,
            "uptime_s": self.uptime_s(),
            "queue": {"depth": x.queue_depth, "capacity": x.queue_capacity},
            "commands": {"total": g.commands_total, "by_type": g.by_type},
            "events": {"total": g.events_total},
            "rejects": {"by_code": g.rejects},
            "cancels": {"by_outcome": g.cancels},
            "latency_us": {
                "queue_wait": stats(&g.queue_wait),
                "process": stats(&g.process),
                "wal": stats(&g.wal),
                "total": stats(&g.total),
            },
            "batch": {"size": stats(&g.batch)},
            "wal": {"bytes": g.wal_bytes, "fsync_policy": g.fsync_policy, "fsync_count": g.fsync_count},
            "sse": {
                "subscribers": self.sse_subscribers.load(Ordering::Relaxed),
                "slowest_lag": self.sse_slowest_lag.load(Ordering::Relaxed),
            },
            "books": g.books,
            "outcomes": {"count": self.outcomes_count.load(Ordering::Relaxed)},
            "busy_count": self.busy_count.load(Ordering::Relaxed),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percentile_shape() {
        let m = Metrics::new(Arc::new(AtomicBool::new(true)));
        for i in 1..=100 {
            m.record_latency(i, i, i);
        }
        m.record_command("submit");
        let v = m.snapshot_json(&MetricsExtra {
            engine_epoch: "e-test0001".into(),
            seq: 1,
            ring_start_seq: 1,
            ring_len: 1,
            queue_depth: 0,
            queue_capacity: 16,
        });
        let s = &v["latency_us"]["total"];
        assert_eq!(s["count"], 100);
        assert!(s["p99"].as_u64().unwrap() >= s["p50"].as_u64().unwrap());
        assert_eq!(v["commands"]["by_type"]["submit"], 1);
        assert_eq!(v["latency_us"]["wal"]["count"], 0);
    }
}
