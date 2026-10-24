//! Router assembly.
pub mod auth;
pub mod commands;
pub mod errors;
pub mod events;
pub mod health;
pub mod queries;

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
        .route("/v1/books/:asset", get(queries::get_book))
        .route("/v1/orders/:order_id", get(queries::get_order))
        .route("/v1/open-orders", get(queries::get_open_orders))
        .route("/metrics", get(health::metrics))
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
