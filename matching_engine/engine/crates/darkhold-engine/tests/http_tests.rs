mod common;
use common::*;
use serde_json::{json, Value};
use std::time::Duration;

#[tokio::test]
async fn healthz_is_open() {
    let srv = start(cfg()).await;
    let r = reqwest::get(format!("{}/healthz", srv.base)).await.unwrap();
    assert_eq!(r.status(), 200);
    let v: Value = r.json().await.unwrap();
    assert_eq!(v["status"], "ok");
    assert_eq!(v["engine_epoch"], "e-test0001");
}

#[tokio::test]
async fn missing_or_wrong_token_is_401() {
    let srv = start(cfg()).await;
    let c = reqwest::Client::new();
    let r = c
        .post(format!("{}/v1/commands", srv.base))
        .json(&configure_cmd())
        .send()
        .await
        .unwrap();
    assert_eq!(r.status(), 401);
    let v: Value = r.json().await.unwrap();
    assert_eq!(v["error"]["code"], "UNAUTHENTICATED");
    let r = c
        .post(format!("{}/v1/commands", srv.base))
        .header("X-Engine-Token", "nope")
        .json(&configure_cmd())
        .send()
        .await
        .unwrap();
    assert_eq!(r.status(), 401);
}

#[tokio::test]
async fn happy_path_configure_submit_duplicate() {
    let srv = start(cfg()).await;
    let r = post(&srv, &configure_cmd()).await;
    assert_eq!(r.status(), 200);
    let v: Value = r.json().await.unwrap();
    assert_eq!(
        (
            v["status"].as_str(),
            v["seq"].as_u64(),
            v["engine_epoch"].as_str()
        ),
        (Some("OK"), Some(1), Some("e-test0001"))
    );

    let first: Value = post(&srv, &buy_cmd(1, 100)).await.json().await.unwrap();
    assert_eq!(
        (
            first["status"].as_str(),
            first["seq"].as_u64(),
            first["last_seq"].as_u64()
        ),
        (Some("ACCEPTED"), Some(2), Some(2))
    );
    assert_eq!(first["duplicate"], false);

    let dup: Value = post(&srv, &buy_cmd(1, 100)).await.json().await.unwrap();
    assert_eq!(dup["duplicate"], true);
    assert_eq!(dup["seq"], 2);
    assert_eq!(
        srv.state.ring.published_seq(),
        2,
        "duplicate must not produce events"
    );
}

#[tokio::test]
async fn bad_json_and_unknown_field_are_400() {
    let srv = start(cfg()).await;
    let r = reqwest::Client::new()
        .post(format!("{}/v1/commands", srv.base))
        .header("X-Engine-Token", TOKEN)
        .body("{not json")
        .send()
        .await
        .unwrap();
    assert_eq!(r.status(), 400);
    let v: Value = r.json().await.unwrap();
    assert_eq!(v["error"]["code"], "VALIDATION_FAILED");

    let mut bad = configure_cmd();
    bad["bogus"] = json!(1);
    assert_eq!(post(&srv, &bad).await.status(), 400);

    let mut bad_enum = buy_cmd(1, 100);
    bad_enum["side"] = json!("LEFT");
    assert_eq!(post(&srv, &bad_enum).await.status(), 400);
    assert_eq!(
        srv.state.ring.published_seq(),
        0,
        "nothing may enter the queue"
    );
}

#[tokio::test]
async fn oversize_body_is_413() {
    let mut c = cfg();
    c.max_body_bytes = 64;
    let srv = start(c).await;
    let r = post(&srv, &configure_cmd()).await;
    assert_eq!(r.status(), 413);
    let v: Value = r.json().await.unwrap();
    assert_eq!(v["error"]["code"], "PAYLOAD_TOO_LARGE");
}

#[tokio::test]
async fn full_queue_returns_503_with_retry_after() {
    let mut c = cfg();
    c.queue_capacity = 16;
    c.max_batch = 1;
    c.command_timeout_ms = 20_000;
    let srv = start_with_sink(c, Box::new(SlowSink(Duration::from_millis(100)))).await;
    let srv = std::sync::Arc::new(srv);
    let mut tasks = vec![];
    for i in 0..50u64 {
        let s = srv.clone();
        tasks.push(tokio::spawn(async move {
            let r = post(&s, &buy_cmd(i + 1, 100)).await;
            let ra = r
                .headers()
                .get("retry-after")
                .map(|v| v.to_str().unwrap().to_string());
            (r.status().as_u16(), ra)
        }));
    }
    let mut busy = 0;
    for t in tasks {
        let (status, ra) = t.await.unwrap();
        if status == 503 {
            busy += 1;
            assert_eq!(ra.as_deref(), Some("1"));
        } else {
            assert_eq!(status, 200);
        }
    }
    assert!(busy > 0, "expected at least one ENGINE_BUSY");
    assert!(
        srv.state
            .busy_count
            .load(std::sync::atomic::Ordering::Relaxed)
            > 0
    );
}

#[tokio::test]
async fn stalled_core_returns_504_but_command_still_executes() {
    let mut c = cfg();
    c.command_timeout_ms = 100;
    let srv = start_with_sink(c, Box::new(SlowSink(Duration::from_millis(400)))).await;
    let r = post(&srv, &configure_cmd()).await;
    assert_eq!(r.status(), 504);
    let v: Value = r.json().await.unwrap();
    assert_eq!(v["error"]["code"], "COMMAND_TIMEOUT");
    tokio::time::sleep(Duration::from_millis(800)).await;
    assert_eq!(
        srv.state.ring.published_seq(),
        1,
        "the timed-out command still executed"
    );
}
