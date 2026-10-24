//! GET /v1/events (SSE, section 3.7). Book snapshots (steps 7 and 9 of the protocol) arrive in step 8.
use super::errors::ApiError;
use crate::ring::ReadResult;
use crate::state::AppState;
use crate::time::now_ms;
use axum::{
    extract::{Query, State},
    response::sse::{Event, Sse},
};
use futures_util::Stream;
use serde::Deserialize;
use serde_json::json;
use std::convert::Infallible;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::Duration;

#[derive(Deserialize)]
pub struct EventsQuery {
    pub after: Option<String>,
    pub epoch: Option<String>,
}

struct SubscriberGuard(Arc<crate::metrics::Metrics>);
impl Drop for SubscriberGuard {
    fn drop(&mut self) {
        self.0.sse_subscribers.fetch_sub(1, Ordering::SeqCst);
    }
}

pub async fn get_events(
    State(st): State<AppState>,
    Query(q): Query<EventsQuery>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, ApiError> {
    if let Some(e) = &q.epoch {
        if **e != *st.epoch {
            return Err(ApiError::epoch_mismatch(&st.epoch));
        }
    }
    let current = st.ring.published_seq();
    let after = match &q.after {
        None => current,
        Some(s) => s
            .parse::<u64>()
            .map_err(|_| ApiError::validation("after must be a non-negative integer"))?,
    };
    if after > current {
        return Err(ApiError::after_in_future(current, &st.epoch));
    }
    if let ReadResult::Gone { start_seq } = st.ring.read_after(after, 1) {
        return Err(ApiError::gone(start_seq));
    }
    let prev = st.metrics.sse_subscribers.fetch_add(1, Ordering::SeqCst);
    if prev as usize >= st.config.sse_max_subscribers {
        st.metrics.sse_subscribers.fetch_sub(1, Ordering::SeqCst);
        return Err(ApiError::too_many_subscribers());
    }
    let guard = SubscriberGuard(st.metrics.clone());
    let mut rx = st.ring.subscribe(); // subscribe before reading: no missed wakeups
    let hb_ms = st.config.sse_heartbeat_ms.max(1);

    let stream = async_stream::stream! {
        let _guard = guard;
        let assets: Vec<_> = st.slot.statuses().into_iter().map(|(a, s)| json!({"asset": a, "status": s})).collect();
        let hello = json!({
            "engine_epoch": &*st.epoch,
            "current_seq": st.ring.published_seq(),
            "ring_start_seq": st.ring.start_seq(),
            "assets": assets,
            "server_time": now_ms(),
        });
        yield Ok::<Event, Infallible>(Event::default().event("hello").data(hello.to_string()));

        let mut cursor = after;
        let mut book_rx = st.slot.subscribe();
        let mut seen: std::collections::HashMap<String, u64> = std::collections::HashMap::new();
        for (a, v, j) in st.slot.snapshot_all() {
            seen.insert(a, v);
            yield Ok(Event::default().event("book").data(j.to_string()));
        }
        let mut hb = tokio::time::interval(Duration::from_millis(hb_ms));
        hb.tick().await; // first tick is immediate
        loop {
            loop {
                match st.ring.read_after(cursor, 500) {
                    ReadResult::Events(v) => {
                        for e in v {
                            cursor = e.seq;
                            yield Ok(Event::default().id(e.seq.to_string()).event(e.kind.to_string()).data(e.data.to_string()));
                        }
                    }
                    ReadResult::UpToDate => break,
                    ReadResult::Gone { start_seq } => {
                        yield Ok(Event::default().event("gone").data(json!({"ring_start_seq": start_seq}).to_string()));
                        return;
                    }
                }
            }
            let mut send_hb = false;
            tokio::select! {
                r = rx.changed() => { if r.is_err() { return; } }
                r = book_rx.changed() => {
                    if r.is_err() { return; }
                    for (_a, j) in st.slot.changed_since(&mut seen) {
                        yield Ok(Event::default().event("book").data(j.to_string()));
                    }
                }
                _ = hb.tick() => { send_hb = true; }
            }
            if send_hb {
                yield Ok(Event::default().comment("hb"));
            }
        }
    };
    Ok(Sse::new(stream))
}
