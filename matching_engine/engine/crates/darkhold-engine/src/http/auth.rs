use super::errors::ApiError;
use crate::state::AppState;
use axum::{
    extract::{Request, State},
    middleware::Next,
    response::{IntoResponse, Response},
};
use subtle::ConstantTimeEq;

pub async fn require_token(State(state): State<AppState>, req: Request, next: Next) -> Response {
    let ok = req.headers().get("x-engine-token").map_or(false, |v| {
        bool::from(v.as_bytes().ct_eq(state.config.token.as_bytes()))
    });
    if ok {
        next.run(req).await
    } else {
        ApiError::unauthenticated().into_response()
    }
}
