//! Step 9: HTTP integration tests against the real engine binary.
mod harness;

use harness::*;
use serde_json::{json, Value};

async fn boot() -> (tempfile::TempDir, Server) {
    let dir = tempfile::tempdir().expect("tempdir");
    let s = Server::start(dir.path(), &[]).await;
    (dir, s)
}

fn err_code(v: &Value) -> &str {
    v["error"]["code"].as_str().unwrap_or("")
}

#[tokio::test]
async fn healthz_needs_no_auth_and_reports_epoch() {
    let (_d, s) = boot().await;
    let (st, v) = s.get_with_token("/healthz", None).await;
    assert_eq!(st, 200);
    assert_eq!(v["status"], "ok");
    let epoch = v["engine_epoch"].as_str().unwrap();
    assert!(epoch.starts_with("e-"));
    assert_eq!(epoch.len(), 10);
    assert!(epoch[2..]
        .chars()
        .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()));
    assert_eq!(v["seq"], 0);
}

#[tokio::test]
async fn protected_routes_require_token() {
    let (_d, s) = boot().await;
    for path in [
        "/metrics",
        "/v1/open-orders",
        "/v1/books/TEST-A",
        "/v1/events",
    ] {
        let (st, v) = s.get_with_token(path, None).await;
        assert_eq!(st, 401, "{path}");
        assert_eq!(err_code(&v), "UNAUTHENTICATED", "{path}");
        let (st, v) = s.get_with_token(path, Some("wrong")).await;
        assert_eq!(st, 401, "{path} wrong token");
        assert_eq!(err_code(&v), "UNAUTHENTICATED");
    }
    let (st, v) = s
        .post_raw(
            serde_json::to_vec(&configure("TEST-A", 1, 1, 10, None)).unwrap(),
            None,
        )
        .await;
    assert_eq!(st, 401);
    assert_eq!(err_code(&v), "UNAUTHENTICATED");
    let (st, _) = s
        .get_with_token(&format!("/v1/orders/{}", oid(1, 1)), None)
        .await;
    assert_eq!(st, 401);
}

#[tokio::test]
async fn malformed_commands_are_400() {
    let (_d, s) = boot().await;
    let good = limit_gtc(&oid(1, 1), "TEST-A", "U1", "BUY", 1, 100);

    // malformed json
    let (st, v) = s.post_raw(b"{not json".to_vec(), Some(TOKEN)).await;
    assert_eq!(st, 400);
    assert_eq!(err_code(&v), "VALIDATION_FAILED");

    // unknown field
    let mut c = good.clone();
    c["surprise"] = json!(1);
    let (st, v) = s.post_command(&c).await;
    assert_eq!(st, 400);
    assert_eq!(err_code(&v), "VALIDATION_FAILED");

    // bad enum
    let mut c = good.clone();
    c["side"] = json!("HOLD");
    let (st, v) = s.post_command(&c).await;
    assert_eq!(st, 400);
    assert_eq!(err_code(&v), "VALIDATION_FAILED");

    // bad uuid
    let mut c = good.clone();
    c["order_id"] = json!("not-a-uuid");
    let (st, v) = s.post_command(&c).await;
    assert_eq!(st, 400);
    assert_eq!(err_code(&v), "VALIDATION_FAILED");

    // bad asset format
    let mut c = good.clone();
    c["asset"] = json!("lower case");
    let (st, v) = s.post_command(&c).await;
    assert_eq!(st, 400);
    assert_eq!(err_code(&v), "VALIDATION_FAILED");

    // bad user id (whitespace)
    let mut c = good.clone();
    c["user_id"] = json!("a b");
    let (st, v) = s.post_command(&c).await;
    assert_eq!(st, 400);
    assert_eq!(err_code(&v), "VALIDATION_FAILED");

    // wrong type for a number
    let mut c = good.clone();
    c["qty"] = json!("five");
    let (st, _) = s.post_command(&c).await;
    assert_eq!(st, 400);

    // unknown command type
    let (st, _) = s.post_command(&json!({"type": "Explode"})).await;
    assert_eq!(st, 400);

    // nothing above may have consumed a seq
    assert_eq!(s.health().await["seq"], 0);
}

#[tokio::test]
async fn oversize_body_is_413() {
    let (_d, s) = boot().await;
    let body = format!("{{\"pad\":\"{}\"}}", "x".repeat(20_000));
    let (st, v) = s.post_raw(body.into_bytes(), Some(TOKEN)).await;
    assert_eq!(st, 413);
    assert_eq!(err_code(&v), "PAYLOAD_TOO_LARGE");
}

#[tokio::test]
async fn configure_submit_duplicate_and_reuse() {
    let (_d, s) = boot().await;
    let (st, r) = s.post_command(&configure("TEST-A", 1, 1, 1000, None)).await;
    assert_eq!(st, 200);
    assert_eq!(r["status"], "OK");
    assert_eq!(r["seq"], 1);
    assert_eq!(r["last_seq"], 1);
    assert_eq!(r["duplicate"], false);
    assert_eq!(r["asset"], "TEST-A");

    let a = oid(1, 1);
    let cmd = limit_gtc(&a, "TEST-A", "U1", "BUY", 5, 100);
    let (st, r1) = s.post_command(&cmd).await;
    assert_eq!(st, 200);
    assert_eq!(r1["status"], "ACCEPTED");
    assert_eq!(r1["seq"], 2);
    assert_eq!(r1["last_seq"], 2);
    assert_eq!(r1["duplicate"], false);
    assert_eq!(r1["order_id"], a.as_str());

    // identical resubmit: same reply, duplicate true, no new events
    let (st, r2) = s.post_command(&cmd).await;
    assert_eq!(st, 200);
    assert_eq!(r2["status"], "ACCEPTED");
    assert_eq!(r2["seq"], 2);
    assert_eq!(r2["last_seq"], 2);
    assert_eq!(r2["duplicate"], true);
    assert_eq!(s.health().await["seq"], 2);

    // same id, different payload
    let (st, r3) = s
        .post_command(&limit_gtc(&a, "TEST-A", "U1", "BUY", 6, 100))
        .await;
    assert_eq!(st, 200);
    assert_eq!(r3["status"], "REJECTED");
    assert_eq!(r3["code"], "ORDER_ID_REUSED");
    assert!(r3["seq"].is_null());
    assert_eq!(s.health().await["seq"], 2);
}

#[tokio::test]
async fn partial_fill_reply_matches_worked_example_w1() {
    let (_d, s) = boot().await;
    setup_test_asset(&s).await;
    let (_, r) = s
        .post_command(&limit_gtc(&oid(1, 1), "TEST-A", "U1", "SELL", 5, 100))
        .await;
    assert_eq!(r["seq"], 2);
    let (_, r) = s
        .post_command(&limit_gtc(&oid(1, 2), "TEST-A", "U2", "BUY", 8, 100))
        .await;
    assert_eq!(r["status"], "ACCEPTED");
    assert_eq!(r["seq"], 3);
    assert_eq!(r["last_seq"], 6);

    let (st, o) = s.get(&format!("/v1/orders/{}", oid(1, 2))).await;
    assert_eq!(st, 200);
    assert_eq!(o["status"], "PARTIALLY_FILLED");
    assert_eq!(o["filled_qty"], 5);
    assert_eq!(o["remaining_qty"], 3);
    assert_eq!(o["first_seq"], 3);
    let (_, o) = s.get(&format!("/v1/orders/{}", oid(1, 1))).await;
    assert_eq!(o["status"], "FILLED");
}

#[tokio::test]
async fn validation_rejections_are_http_200() {
    let (_d, s) = boot().await;
    setup_test_asset(&s).await;

    let (st, r) = s
        .post_command(&limit_gtc(&oid(1, 1), "TEST-A", "U1", "BUY", 2000, 100))
        .await;
    assert_eq!(st, 200);
    assert_eq!(r["status"], "REJECTED");
    assert_eq!(r["code"], "INVALID_QTY");
    assert!(
        r["seq"].is_u64(),
        "a rejection emits OrderRejected and consumes seq"
    );

    let (st, r) = s
        .post_command(&limit_gtc(&oid(1, 2), "NOPE", "U1", "BUY", 1, 100))
        .await;
    assert_eq!(st, 200);
    assert_eq!(r["code"], "UNKNOWN_ASSET");

    let (st, r) = s
        .post_command(&submit(
            &oid(1, 3),
            "TEST-A",
            "U1",
            "BUY",
            "MARKET",
            "GTC",
            1,
            100,
        ))
        .await;
    assert_eq!(st, 200);
    assert_eq!(r["code"], "INVALID_TIF");

    // rejected order is queryable and has status REJECTED
    let (st, o) = s.get(&format!("/v1/orders/{}", oid(1, 1))).await;
    assert_eq!(st, 200);
    assert_eq!(o["status"], "REJECTED");
    assert_eq!(o["reject_code"], "INVALID_QTY");
}

#[tokio::test]
async fn cancel_flow() {
    let (_d, s) = boot().await;
    setup_test_asset(&s).await;
    let a = oid(1, 1);
    s.post_command(&limit_gtc(&a, "TEST-A", "U1", "BUY", 5, 100))
        .await;

    let (st, r) = s.post_command(&cancel(&a, "USER")).await;
    assert_eq!(st, 200);
    assert_eq!(r["status"], "CANCELED");
    assert_eq!(r["remaining_qty"], 5);
    assert_eq!(r["seq"], 3);

    let (_, r) = s.post_command(&cancel(&a, "USER")).await;
    assert_eq!(r["status"], "ALREADY_CANCELED");
    assert_eq!(r["duplicate"], true);
    assert!(r["seq"].is_null());

    let (_, r) = s.post_command(&cancel(&oid(9, 9), "USER")).await;
    assert_eq!(r["status"], "UNKNOWN_ORDER");
    assert!(r["seq"].is_null());

    let (_, o) = s.get(&format!("/v1/orders/{a}")).await;
    assert_eq!(o["status"], "CANCELED");
    assert_eq!(o["cancel_reason"], "USER");
}

#[tokio::test]
async fn halt_resume_flow() {
    let (_d, s) = boot().await;
    setup_test_asset(&s).await;
    let a = oid(1, 1);
    s.post_command(&limit_gtc(&a, "TEST-A", "U1", "BUY", 1, 100))
        .await;

    let (_, r) = s.post_command(&halt("TEST-A")).await;
    assert_eq!(r["status"], "OK");
    let (_, r) = s.post_command(&halt("TEST-A")).await;
    assert_eq!(r["status"], "NOOP");
    assert!(r["seq"].is_null());

    let (_, r) = s
        .post_command(&limit_gtc(&oid(1, 2), "TEST-A", "U2", "BUY", 1, 100))
        .await;
    assert_eq!(r["status"], "REJECTED");
    assert_eq!(r["code"], "ASSET_HALTED");

    // cancel is allowed while halted
    let (_, r) = s.post_command(&cancel(&a, "ADMIN")).await;
    assert_eq!(r["status"], "CANCELED");

    let (_, r) = s.post_command(&resume("TEST-A")).await;
    assert_eq!(r["status"], "OK");
    let (_, r) = s.post_command(&resume("TEST-A")).await;
    assert_eq!(r["status"], "NOOP");

    let (_, r) = s.post_command(&halt("NOPE")).await;
    assert_eq!(r["status"], "REJECTED");
    assert_eq!(r["code"], "UNKNOWN_ASSET");
}

#[tokio::test]
async fn invalid_config_is_rejected_without_event() {
    let (_d, s) = boot().await;
    let (st, r) = s.post_command(&configure("TEST-A", 0, 1, 10, None)).await;
    assert_eq!(st, 200);
    assert_eq!(r["status"], "REJECTED");
    assert_eq!(r["code"], "INVALID_CONFIG");
    assert_eq!(s.health().await["seq"], 0);
}

#[tokio::test]
async fn book_query() {
    let (_d, s) = boot().await;
    setup_test_asset(&s).await;
    s.post_command(&limit_gtc(&oid(1, 1), "TEST-A", "U1", "BUY", 5, 100))
        .await;
    s.post_command(&limit_gtc(&oid(1, 2), "TEST-A", "U2", "BUY", 2, 100))
        .await;
    s.post_command(&limit_gtc(&oid(1, 3), "TEST-A", "U3", "SELL", 4, 103))
        .await;

    let (st, b) = s.get("/v1/books/TEST-A").await;
    assert_eq!(st, 200);
    assert_eq!(b["asset"], "TEST-A");
    assert_eq!(b["as_of_seq"], 4);
    assert_eq!(b["bids"], json!([{"price": 100, "qty": 7, "orders": 2}]));
    assert_eq!(b["asks"], json!([{"price": 103, "qty": 4, "orders": 1}]));
    assert_eq!(b["best_bid"], 100);
    assert_eq!(b["best_ask"], 103);
    assert_eq!(b["spread"], 3);

    // depth clamp
    let (st, b) = s.get("/v1/books/TEST-A?depth=1").await;
    assert_eq!(st, 200);
    assert_eq!(b["depth"], 1);

    let (st, v) = s.get("/v1/books/NOPE").await;
    assert_eq!(st, 404);
    assert_eq!(err_code(&v), "NOT_FOUND");

    let (st, v) = s.get("/v1/books/lower").await;
    assert_eq!(st, 400);
    assert_eq!(err_code(&v), "VALIDATION_FAILED");
}

#[tokio::test]
async fn order_query_errors() {
    let (_d, s) = boot().await;
    let (st, v) = s.get(&format!("/v1/orders/{}", oid(7, 7))).await;
    assert_eq!(st, 404);
    assert_eq!(err_code(&v), "NOT_FOUND");
    let (st, v) = s.get("/v1/orders/not-a-uuid").await;
    assert_eq!(st, 400);
    assert_eq!(err_code(&v), "VALIDATION_FAILED");
}

#[tokio::test]
async fn open_orders_sorted_and_filtered() {
    let (_d, s) = boot().await;
    s.post_command(&configure("TEST-A", 1, 1, 1000, None)).await;
    s.post_command(&configure("TEST-B", 1, 1, 1000, None)).await;
    // accept order: B1, A1, B2, A2
    s.post_command(&limit_gtc(&oid(1, 1), "TEST-B", "U1", "BUY", 1, 10))
        .await;
    s.post_command(&limit_gtc(&oid(1, 2), "TEST-A", "U1", "BUY", 1, 10))
        .await;
    s.post_command(&limit_gtc(&oid(1, 3), "TEST-B", "U2", "SELL", 1, 50))
        .await;
    s.post_command(&limit_gtc(&oid(1, 4), "TEST-A", "U2", "SELL", 1, 50))
        .await;

    let (st, v) = s.get("/v1/open-orders").await;
    assert_eq!(st, 200);
    assert_eq!(v["as_of_seq"], 6);
    let orders = v["orders"].as_array().unwrap();
    assert_eq!(orders.len(), 4);
    let key: Vec<(String, u64)> = orders
        .iter()
        .map(|o| {
            (
                o["asset"].as_str().unwrap().to_string(),
                o["accept_seq"].as_u64().unwrap(),
            )
        })
        .collect();
    let mut sorted = key.clone();
    sorted.sort();
    assert_eq!(key, sorted, "sorted by asset then accept_seq");
    assert_eq!(key[0].0, "TEST-A");
    assert_eq!(orders[0]["remaining_qty"], 1);

    let (_, v) = s.get("/v1/open-orders?asset=TEST-B").await;
    assert_eq!(v["orders"].as_array().unwrap().len(), 2);
    assert!(v["orders"]
        .as_array()
        .unwrap()
        .iter()
        .all(|o| o["asset"] == "TEST-B"));
}

#[tokio::test]
async fn metrics_shape() {
    let (_d, s) = boot().await;
    setup_test_asset(&s).await;
    s.post_command(&limit_gtc(&oid(1, 1), "TEST-A", "U1", "BUY", 1, 100))
        .await;
    let (st, m) = s.get("/metrics").await;
    assert_eq!(st, 200);
    for k in [
        "engine_epoch",
        "seq",
        "ring_start_seq",
        "ring_len",
        "uptime_s",
        "queue",
        "commands",
        "events",
        "rejects",
        "cancels",
        "latency_us",
        "batch",
        "wal",
        "sse",
        "books",
        "outcomes",
    ] {
        assert!(m.get(k).is_some(), "metrics missing key {k}: {m}");
    }
    assert!(m["queue"]["capacity"].as_u64().unwrap() >= 16);
    assert!(m["commands"]["total"].as_u64().unwrap() >= 2);
    assert!(m["events"]["total"].as_u64().unwrap() >= 2);
    for h in ["queue_wait", "process", "wal", "total"] {
        for f in ["count", "min", "p50", "p95", "p99", "max"] {
            assert!(m["latency_us"][h].get(f).is_some(), "latency_us.{h}.{f}");
        }
    }
    assert_eq!(m["wal"]["fsync_policy"], "batch");
    assert_eq!(m["outcomes"]["count"], 1);
}

#[tokio::test]
async fn concurrent_submits_get_contiguous_seq() {
    let (_d, s) = boot().await;
    setup_test_asset(&s).await;
    let (client, base) = s.handle();
    let mut tasks = Vec::new();
    for i in 0..50u64 {
        let c = client.clone();
        let b = base.clone();
        tasks.push(tokio::spawn(async move {
            let cmd = limit_gtc(&oid(2, i + 1), "TEST-A", "U1", "BUY", 1, 100);
            post_command_to(&c, &b, &cmd).await.expect("post")
        }));
    }
    let mut seqs = Vec::new();
    for t in tasks {
        let (st, r) = t.await.unwrap();
        assert_eq!(st, 200);
        assert_eq!(r["status"], "ACCEPTED");
        seqs.push(r["seq"].as_u64().unwrap());
    }
    seqs.sort();
    assert_eq!(seqs, (2..52).collect::<Vec<u64>>());
    assert_eq!(s.health().await["seq"], 51);
}
