//! Router assembly. Metrics and queries routes arrive in step 8.
pub mod auth;
pub mod commands;
pub mod errors;
pub mod events;
pub mod health;

use crate::state::AppState;
use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use tower_http::trace::TraceLayer;

/// In-flight limit for command requests.
pub const MAX_IN_FLIGHT: usize = 2048;

pub fn router(state: AppState) -> Router {
    let authed = Router::new()
        .route("/v1/commands", post(commands::post_command))
        .route("/v1/events", get(events::get_events))
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            auth::require_token,
        ));
    Router::new()
        .merge(authed)
        .route("/healthz", get(health::healthz))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
