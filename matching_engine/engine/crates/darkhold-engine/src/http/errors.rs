//! Transport error envelope (section 3.8).
use axum::{
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::{json, Value};

pub struct ApiError {
    status: StatusCode,
    code: &'static str,
    message: String,
    details: Value,
    retry_after: bool,
}

impl ApiError {
    fn new(status: StatusCode, code: &'static str, message: impl Into<String>) -> Self {
        ApiError {
            status,
            code,
            message: message.into(),
            details: json!({}),
            retry_after: false,
        }
    }
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::new(StatusCode::BAD_REQUEST, "VALIDATION_FAILED", msg)
    }
    pub fn unauthenticated() -> Self {
        Self::new(
            StatusCode::UNAUTHORIZED,
            "UNAUTHENTICATED",
            "missing or invalid X-Engine-Token",
        )
    }
    pub fn payload_too_large() -> Self {
        Self::new(
            StatusCode::PAYLOAD_TOO_LARGE,
            "PAYLOAD_TOO_LARGE",
            "request body too large",
        )
    }
    pub fn busy() -> Self {
        let mut e = Self::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "ENGINE_BUSY",
            "command queue is full",
        );
        e.retry_after = true;
        e
    }
    pub fn unavailable() -> Self {
        Self::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "ENGINE_UNAVAILABLE",
            "core thread is not running",
        )
    }
    pub fn timeout() -> Self {
        Self::new(
            StatusCode::GATEWAY_TIMEOUT,
            "COMMAND_TIMEOUT",
            "no reply in time; the command may still execute",
        )
    }
    pub fn epoch_mismatch(current: &str) -> Self {
        let mut e = Self::new(
            StatusCode::CONFLICT,
            "EPOCH_MISMATCH",
            "engine epoch differs",
        );
        e.details = json!({ "current_epoch": current });
        e
    }
    pub fn after_in_future(current_seq: u64, current_epoch: &str) -> Self {
        let mut e = Self::new(
            StatusCode::CONFLICT,
            "AFTER_IN_FUTURE",
            "after is ahead of the engine",
        );
        e.details = json!({ "current_seq": current_seq, "current_epoch": current_epoch });
        e
    }
    pub fn gone(ring_start_seq: u64) -> Self {
        let mut e = Self::new(
            StatusCode::GONE,
            "GONE",
            "resume point is older than the retained events",
        );
        e.details = json!({ "ring_start_seq": ring_start_seq });
        e
    }
    pub fn too_many_subscribers() -> Self {
        Self::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "TOO_MANY_SUBSCRIBERS",
            "subscriber limit reached",
        )
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body =
            json!({"error": {"code": self.code, "message": self.message, "details": self.details}});
        let mut resp = (self.status, Json(body)).into_response();
        if self.retry_after {
            resp.headers_mut()
                .insert(header::RETRY_AFTER, HeaderValue::from_static("1"));
        }
        resp
    }
}
