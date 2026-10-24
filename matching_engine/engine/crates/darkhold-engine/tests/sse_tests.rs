mod common;
use common::*;
use serde_json::Value;
use std::time::Duration;

async fn seed(srv: &Server, orders: u64) {
    post(srv, &configure_cmd()).await;
    for i in 1..=orders {
        post(srv, &buy_cmd(i, 100)).await;
    }
}

#[tokio::test]
async fn hello_then_replay_from_zero() {
    let srv = start(cfg()).await;
    seed(&srv, 2).await; // seq 1..3
    let mut r = sse_open(&srv, "?after=0").await;
    assert_eq!(r.status(), 200);
    let text = read_until(&mut r, "id: 3").await;
    assert!(text.contains("event: hello"));
    assert!(text.contains("\"current_seq\":3"));
    assert!(text.contains("event: AssetConfigured"));
    assert!(text.contains("event: OrderAccepted"));
}

#[tokio::test]
async fn resume_receives_only_later_events() {
    let srv = start(cfg()).await;
    seed(&srv, 2).await;
    let mut r = sse_open(&srv, "?after=2&epoch=e-test0001").await;
    let text = read_until(&mut r, "id: 3").await;
    assert!(!text.contains("id: 1\n") && !text.contains("id: 2\n"));
}

#[tokio::test]
async fn live_events_arrive_after_hello() {
    let srv = start(cfg()).await;
    seed(&srv, 0).await;
    let mut r = sse_open(&srv, "").await; // live only
    read_until(&mut r, "event: hello").await;
    post(&srv, &buy_cmd(1, 100)).await;
    let text = read_until(&mut r, "event: OrderAccepted").await;
    assert!(text.contains("id: 2"));
}

#[tokio::test]
async fn guards_epoch_future_gone() {
    let mut c = cfg();
    c.ring_capacity = 3;
    let srv = start(c).await;
    seed(&srv, 5).await; // seq 1..6, ring keeps 4..6

    let r = sse_open(&srv, "?epoch=e-other").await;
    assert_eq!(r.status(), 409);
    let v: Value = r.json().await.unwrap();
    assert_eq!(v["error"]["code"], "EPOCH_MISMATCH");
    assert_eq!(v["error"]["details"]["current_epoch"], "e-test0001");

    let r = sse_open(&srv, "?after=99").await;
    assert_eq!(r.status(), 409);
    let v: Value = r.json().await.unwrap();
    assert_eq!(v["error"]["code"], "AFTER_IN_FUTURE");
    assert_eq!(v["error"]["details"]["current_seq"], 6);

    let r = sse_open(&srv, "?after=0").await;
    assert_eq!(r.status(), 410);
    let v: Value = r.json().await.unwrap();
    assert_eq!(v["error"]["details"]["ring_start_seq"], 4);

    // boundary: after + 1 == start is allowed
    let r = sse_open(&srv, "?after=3").await;
    assert_eq!(r.status(), 200);

    assert_eq!(sse_open(&srv, "?after=abc").await.status(), 400);
}

#[tokio::test]
async fn heartbeat_arrives_when_idle() {
    let mut c = cfg();
    c.sse_heartbeat_ms = 100;
    let srv = start(c).await;
    seed(&srv, 0).await;
    let mut r = sse_open(&srv, "").await;
    read_until(&mut r, ": hb").await;
}

#[tokio::test]
async fn subscriber_cap_returns_503_and_frees_on_drop() {
    let mut c = cfg();
    c.sse_max_subscribers = 1;
    let srv = start(c).await;
    seed(&srv, 0).await;
    let mut first = sse_open(&srv, "").await;
    read_until(&mut first, "event: hello").await;
    let second = sse_open(&srv, "").await;
    assert_eq!(second.status(), 503);
    let v: Value = second.json().await.unwrap();
    assert_eq!(v["error"]["code"], "TOO_MANY_SUBSCRIBERS");
    drop(first);
    tokio::time::sleep(Duration::from_millis(300)).await;
    // the stream notices the closed connection on its next send; poke it with an event
    post(&srv, &buy_cmd(1, 100)).await;
    tokio::time::sleep(Duration::from_millis(300)).await;
    assert_eq!(sse_open(&srv, "").await.status(), 200);
}

#[tokio::test]
async fn two_subscribers_see_identical_events() {
    let srv = start(cfg()).await;
    seed(&srv, 3).await; // seq 1..4
    let mut a = sse_open(&srv, "?after=0").await;
    let mut b = sse_open(&srv, "?after=0").await;
    let ta = read_until(&mut a, "id: 4").await;
    let tb = read_until(&mut b, "id: 4").await;
    let blocks = |t: &str| -> Vec<String> {
        t.split("\n\n")
            .filter(|x| x.contains("id: "))
            .map(|x| x.to_string())
            .collect()
    };
    let (ba, bb) = (blocks(&ta), blocks(&tb));
    assert!(ba.len() >= 4);
    assert_eq!(ba[..4], bb[..4]);
}
