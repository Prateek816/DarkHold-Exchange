use std::sync::atomic::Ordering;
use std::time::{Duration, Instant};

use axum::extract::{Path, Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use crossbeam_channel::TrySendError;
use darkhold_core::{AssetId, OrderId};
use serde::Deserialize;
use serde_json::json;
use tokio::sync::oneshot;

use crate::jobs::{Job, QueryKind, QueryReply};
use crate::state::AppState;

fn err(status: StatusCode, code: &str, msg: impl Into<String>) -> Response {
    let body = Json(json!({"error": {"code": code, "message": msg.into(), "details": {}}}));
    let mut r = (status, body).into_response();
    if code == "ENGINE_BUSY" {
        r.headers_mut()
            .insert(header::RETRY_AFTER, "1".parse().unwrap());
    }
    r
}

async fn run_query(s: &AppState, kind: QueryKind) -> Result<QueryReply, Response> {
    if !s.core_alive.load(Ordering::SeqCst) {
        return Err(err(
            StatusCode::SERVICE_UNAVAILABLE,
            "ENGINE_UNAVAILABLE",
            "core thread not alive",
        ));
    }
    let (tx, rx) = oneshot::channel();
    match s.tx.try_send(Job::Query {
        kind,
        enqueued_at: Instant::now(),
        reply_tx: tx,
    }) {
        Ok(()) => {}
        Err(TrySendError::Full(_)) => {
            s.metrics.busy_count.fetch_add(1, Ordering::Relaxed);
            return Err(err(
                StatusCode::SERVICE_UNAVAILABLE,
                "ENGINE_BUSY",
                "command queue full",
            ));
        }
        Err(TrySendError::Disconnected(_)) => {
            return Err(err(
                StatusCode::SERVICE_UNAVAILABLE,
                "ENGINE_UNAVAILABLE",
                "core thread not alive",
            ));
        }
    }
    match tokio::time::timeout(Duration::from_millis(s.config.command_timeout_ms), rx).await {
        Ok(Ok(r)) => Ok(r),
        Ok(Err(_)) => Err(err(
            StatusCode::SERVICE_UNAVAILABLE,
            "ENGINE_UNAVAILABLE",
            "core thread dropped the query",
        )),
        Err(_) => Err(err(
            StatusCode::GATEWAY_TIMEOUT,
            "COMMAND_TIMEOUT",
            "query timed out",
        )),
    }
}

#[derive(Deserialize)]
pub struct DepthQ {
    depth: Option<usize>,
}

#[derive(Deserialize)]
pub struct OpenQ {
    asset: Option<String>,
}

pub async fn get_book(
    State(s): State<AppState>,
    Path(asset): Path<String>,
    Query(q): Query<DepthQ>,
) -> Response {
    let asset = match AssetId::parse(&asset) {
        Ok(a) => a,
        Err(e) => return err(StatusCode::BAD_REQUEST, "VALIDATION_FAILED", e.to_string()),
    };
    let depth = q.depth.unwrap_or(s.config.snapshot_depth).clamp(1, 100);
    match run_query(&s, QueryKind::Book { asset, depth }).await {
        Ok(QueryReply::Book(v)) => Json(v).into_response(),
        Ok(QueryReply::NotFound) => err(StatusCode::NOT_FOUND, "NOT_FOUND", "unknown asset"),
        Ok(_) => err(
            StatusCode::INTERNAL_SERVER_ERROR,
            "INTERNAL",
            "unexpected reply",
        ),
        Err(r) => r,
    }
}

pub async fn get_order(State(s): State<AppState>, Path(id): Path<String>) -> Response {
    let order_id = match OrderId::parse(&id) {
        Ok(o) => o,
        Err(e) => return err(StatusCode::BAD_REQUEST, "VALIDATION_FAILED", e.to_string()),
    };
    match run_query(&s, QueryKind::Order { order_id }).await {
        Ok(QueryReply::Order(v)) => Json(v).into_response(),
        Ok(QueryReply::NotFound) => err(StatusCode::NOT_FOUND, "NOT_FOUND", "unknown order"),
        Ok(_) => err(
            StatusCode::INTERNAL_SERVER_ERROR,
            "INTERNAL",
            "unexpected reply",
        ),
        Err(r) => r,
    }
}

pub async fn get_open_orders(State(s): State<AppState>, Query(q): Query<OpenQ>) -> Response {
    let asset = match q.asset {
        Some(a) => match AssetId::parse(&a) {
            Ok(a) => Some(a),
            Err(e) => return err(StatusCode::BAD_REQUEST, "VALIDATION_FAILED", e.to_string()),
        },
        None => None,
    };
    match run_query(&s, QueryKind::OpenOrders { asset }).await {
        Ok(QueryReply::OpenOrders(v)) => Json(v).into_response(),
        Ok(_) => err(
            StatusCode::INTERNAL_SERVER_ERROR,
            "INTERNAL",
            "unexpected reply",
        ),
        Err(r) => r,
    }
}
