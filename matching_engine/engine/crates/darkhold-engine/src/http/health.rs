use std::sync::atomic::Ordering;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

use crate::metrics::MetricsExtra;
use crate::state::AppState;

fn ring_seq(s: &AppState) -> u64 {
    (s.ring.start_seq() + s.ring.len() as u64).saturating_sub(1)
}

pub async fn healthz(State(s): State<AppState>) -> Response {
    let alive = s.core_alive.load(Ordering::SeqCst);
    let body = json!({
        "status": if alive { "ok" } else { "down" },
        "engine_epoch": s.epoch.to_string(),
        "seq": ring_seq(&s),
        "uptime_s": s.metrics.uptime_s(),
    });
    let code = if alive {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    (code, Json(body)).into_response()
}

pub async fn metrics(State(s): State<AppState>) -> Response {
    let extra = MetricsExtra {
        engine_epoch: s.epoch.to_string(),
        seq: ring_seq(&s),
        ring_start_seq: s.ring.start_seq(),
        ring_len: s.ring.len() as u64,
        queue_depth: s.tx.len() as u64,
        queue_capacity: s.tx.capacity().unwrap_or(0) as u64,
    };
    Json(s.metrics.snapshot_json(&extra)).into_response()
}
