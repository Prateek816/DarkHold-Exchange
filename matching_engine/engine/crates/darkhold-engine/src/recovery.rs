use std::fs;
use std::path::Path;
use std::sync::Arc;
use std::time::Instant;

use anyhow::Context;
use darkhold_core::Engine;

use crate::ring::Ring;
use crate::time::now_ms;
use crate::wal::{read_all, truncate_to, wal_path, Wal};

#[derive(Debug, Clone)]
pub struct RecoveryStats {
    pub records_replayed: u64,
    pub events_regenerated: u64,
    pub last_seq: u64,
    pub epoch: String,
    pub truncated_bytes: u64,
    pub duration_ms: u128,
}

pub struct Recovered {
    pub engine: Engine,
    pub wal: Wal,
    pub ring: Ring,
    pub stats: RecoveryStats,
    pub fresh: bool,
}

fn new_epoch() -> String {
    let u = uuid::Uuid::new_v4().simple().to_string();
    format!("e-{}", &u[..8])
}

pub fn recover(dir: &Path, ring_capacity: usize) -> anyhow::Result<Recovered> {
    let start = Instant::now();
    let path = wal_path(dir);
    let non_empty = fs::metadata(&path).map(|m| m.len() > 0).unwrap_or(false);

    if !non_empty {
        if path.exists() {
            fs::remove_file(&path).context("removing empty wal file")?;
        }
        let epoch = new_epoch();
        tracing::warn!(epoch = %epoch, "no WAL found: creating a new WAL and a NEW engine epoch");
        let wal = Wal::create(dir, &epoch, now_ms())?;
        let engine = Engine::new(epoch.clone());
        return Ok(Recovered {
            engine,
            wal,
            ring: Ring::new(ring_capacity),
            stats: RecoveryStats {
                records_replayed: 0,
                events_regenerated: 0,
                last_seq: 0,
                epoch,
                truncated_bytes: 0,
                duration_ms: start.elapsed().as_millis(),
            },
            fresh: true,
        });
    }

    let contents = read_all(&path)?;
    if contents.discarded > 0 {
        tracing::warn!(
            bytes = contents.discarded,
            offset = contents.valid_end,
            "torn or corrupt WAL tail: truncating"
        );
        truncate_to(&path, contents.valid_end)?;
    }

    let epoch = contents.header.engine_epoch.clone();
    let mut engine = Engine::new(epoch.clone());
    let ring = Ring::new(ring_capacity);
    let mut replayed = 0u64;
    let mut events_total = 0u64;

    for rec in contents.records {
        let p = engine.process(rec.cmd, rec.ts);
        if p.ts_used != rec.ts {
            tracing::warn!(
                ts = rec.ts,
                used = p.ts_used,
                "clock regression in WAL file"
            );
        }
        let mut entries: Vec<(u64, Arc<str>)> = Vec::with_capacity(p.events.len());
        for ev in &p.events {
            entries.push((ev.seq, Arc::from(ev.to_json_string())));
        }
        events_total += entries.len() as u64;
        if !entries.is_empty() {
            ring.push_batch(entries);
        }
        replayed += 1;
    }

    let wal = Wal::open_for_append(&path)?;
    let stats = RecoveryStats {
        records_replayed: replayed,
        events_regenerated: events_total,
        last_seq: engine.last_seq(),
        epoch,
        truncated_bytes: contents.discarded,
        duration_ms: start.elapsed().as_millis(),
    };
    Ok(Recovered {
        engine,
        wal,
        ring,
        stats,
        fresh: false,
    })
}
