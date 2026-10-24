use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use darkhold_engine::book_slot::BookSlot;
use darkhold_engine::config::Config;
use darkhold_engine::core_thread::{self, CoreArgs, LAST_COMMAND};
use darkhold_engine::jobs::Job;
use darkhold_engine::metrics::Metrics;
use darkhold_engine::state::AppState;
use darkhold_engine::{http, recovery, shutdown};

fn install_panic_hook() {
    std::panic::set_hook(Box::new(|info| {
        let last = LAST_COMMAND.lock().map(|g| g.clone()).unwrap_or_default();
        eprintln!("PANIC: {info}; last command: {last}");
        tracing::error!(panic = %info, last_command = %last, "panic in engine");
        std::process::abort();
    }));
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 1. config (fails fast when ENGINE_TOKEN is missing)
    let cfg = Config::from_env().map_err(anyhow::Error::msg)?;
    // 2. tracing
    let filter = tracing_subscriber::EnvFilter::new(&cfg.log_level);
    if cfg.log_format == "json" {
        tracing_subscriber::fmt()
            .json()
            .with_env_filter(filter)
            .init();
    } else {
        tracing_subscriber::fmt()
            .pretty()
            .with_env_filter(filter)
            .init();
    }
    install_panic_hook();

    // 3. recovery
    let rec = recovery::recover(std::path::Path::new(&cfg.wal_dir), cfg.ring_capacity)?;
    tracing::info!(
        records = rec.stats.records_replayed,
        events = rec.stats.events_regenerated,
        last_seq = rec.stats.last_seq,
        epoch = %rec.stats.epoch,
        truncated_bytes = rec.stats.truncated_bytes,
        duration_ms = rec.stats.duration_ms as u64,
        fresh = rec.fresh,
        "recovery complete"
    );

    // 4. shared state
    let core_alive = Arc::new(AtomicBool::new(true));
    let metrics = Arc::new(Metrics::new(core_alive.clone()));
    let slot = Arc::new(BookSlot::new());
    let ring = Arc::new(rec.ring);
    let (tx, rx) = crossbeam_channel::bounded::<Job>(cfg.queue_capacity);
    let epoch: Arc<str> = Arc::from(rec.engine.epoch());
    let cfg = Arc::new(cfg);

    // 5. core thread (publishes the initial snapshot of every asset on start)
    let handle = core_thread::spawn(CoreArgs {
        engine: rec.engine,
        wal: Box::new(rec.wal),
        fsync: cfg.fsync_policy,
        ring: ring.clone(),
        slot: slot.clone(),
        metrics: metrics.clone(),
        rx,
        max_batch: cfg.max_batch,
        snapshot_tick_ms: cfg.snapshot_tick_ms,
        snapshot_depth: cfg.snapshot_depth,
        paranoid: cfg.paranoid,
    })?;
    core_alive.store(true, Ordering::SeqCst);

    // 7. serve
    let state = AppState {
        tx: tx.clone(),
        config: cfg.clone(),
        ring,
        slot,
        metrics,
        core_alive,
        epoch,
    };
    let listener = tokio::net::TcpListener::bind(&cfg.bind).await?;
    tracing::info!(bind = %cfg.bind, "engine listening");
    let server = axum::serve(listener, http::router(state));
    tokio::select! {
        r = server => { r?; }
        _ = shutdown::signal() => { tracing::info!("shutdown signal received"); }
    }

    // 8. drain and flush
    let (ack_tx, ack_rx) = tokio::sync::oneshot::channel();
    if tx
        .send_timeout(Job::Shutdown { ack_tx }, Duration::from_secs(5))
        .is_ok()
    {
        let _ = tokio::time::timeout(Duration::from_secs(10), ack_rx).await;
    }
    let _ = handle.join();
    Ok(())
}
