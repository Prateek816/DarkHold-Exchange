//! POST /v1/commands
use super::errors::ApiError;
use crate::jobs::Job;
use crate::state::AppState;
use axum::{
    body::Body,
    extract::State,
    response::{IntoResponse, Response},
};
use crossbeam_channel::TrySendError;
use darkhold_core::Command;
use std::sync::atomic::Ordering;
use std::time::{Duration, Instant};
use tokio::sync::oneshot;

pub async fn post_command(State(st): State<AppState>, body: Body) -> Result<Response, ApiError> {
    let bytes = axum::body::to_bytes(body, st.config.max_body_bytes)
        .await
        .map_err(|_| ApiError::payload_too_large())?;
    let cmd: Command =
        serde_json::from_slice(&bytes).map_err(|e| ApiError::validation(e.to_string()))?;
    if !st.core_alive.load(Ordering::SeqCst) {
        return Err(ApiError::unavailable());
    }
    let (tx, rx) = oneshot::channel();
    match st.tx.try_send(Job::Command {
        cmd,
        enqueued_at: Instant::now(),
        reply_tx: tx,
    }) {
        Ok(()) => {}
        Err(TrySendError::Full(_)) => {
            st.metrics.busy_count.fetch_add(1, Ordering::Relaxed);
            return Err(ApiError::busy());
        }
        Err(TrySendError::Disconnected(_)) => return Err(ApiError::unavailable()),
    }
    match tokio::time::timeout(Duration::from_millis(st.config.command_timeout_ms), rx).await {
        Ok(Ok(reply)) => Ok(axum::Json(reply).into_response()),
        Ok(Err(_)) => Err(ApiError::unavailable()),
        Err(_) => Err(ApiError::timeout()),
    }
}
