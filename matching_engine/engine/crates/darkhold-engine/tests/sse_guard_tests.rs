//! Step 9: SSE protocol and guard tests (Section 3.7), real engine binary.
mod harness;

use std::time::Duration;

use harness::*;
use serde_json::Value;

fn err_code(v: &Value) -> &str {
    v["error"]["code"].as_str().unwrap_or("")
}

async fn boot(extra: &[(&str, &str)]) -> (tempfile::TempDir, Server) {
    let dir = tempfile::tempdir().expect("tempdir");
    let s = Server::start(dir.path(), extra).await;
    (dir, s)
}

#[tokio::test]
async fn sse_requires_token() {
    let (_d, s) = boot(&[]).await;
    let err = s
        .open_sse_with_token("", None)
        .await
        .err()
        .expect("must fail");
    assert_eq!(err.0, 401);
    assert_eq!(err_code(&err.1), "UNAUTHENTICATED");
}

#[tokio::test]
async fn epoch_mismatch_is_409() {
    let (_d, s) = boot(&[]).await;
    let epoch = s.epoch().await;
    let err = s
        .open_sse("epoch=e-00000000")
        .await
        .err()
        .expect("must fail");
    assert_eq!(err.0, 409);
    assert_eq!(err_code(&err.1), "EPOCH_MISMATCH");
    assert_eq!(err.1["error"]["details"]["current_epoch"], epoch.as_str());
}

#[tokio::test]
async fn after_in_future_is_409() {
    let (_d, s) = boot(&[]).await;
    setup_test_asset(&s).await; // seq 1
    let epoch = s.epoch().await;
    let err = s.open_sse("after=999").await.err().expect("must fail");
    assert_eq!(err.0, 409);
    assert_eq!(err_code(&err.1), "AFTER_IN_FUTURE");
    assert_eq!(err.1["error"]["details"]["current_seq"], 1);
    assert_eq!(err.1["error"]["details"]["current_epoch"], epoch.as_str());
}

#[tokio::test]
async fn hello_then_books() {
    let (_d, s) = boot(&[]).await;
    setup_test_asset(&s).await;
    s.post_command(&limit_gtc(&oid(1, 1), "TEST-A", "U1", "BUY", 5, 100))
        .await;
    let epoch = s.epoch().await;

    let mut st = s.open_sse("").await.expect("open");
    let hello = st.next_frame(Duration::from_secs(5)).await.expect("hello");
    assert_eq!(hello.event.as_deref(), Some("hello"));
    assert!(hello.id.is_none(), "hello carries no id");
    let h = hello.json();
    assert_eq!(h["engine_epoch"], epoch.as_str());
    assert_eq!(h["current_seq"], 2);
    assert!(h["ring_start_seq"].is_u64());
    assert!(h["server_time"].is_u64());
    let assets = h["assets"].as_array().unwrap();
    assert_eq!(assets.len(), 1);
    assert_eq!(assets[0]["asset"], "TEST-A");
    assert_eq!(assets[0]["status"], "ACTIVE");

    // a book snapshot for every asset follows the hello
    let mut got_book = false;
    for _ in 0..5 {
        match st.next_frame(Duration::from_secs(3)).await {
            Some(f) if f.event.as_deref() == Some("book") => {
                assert!(f.id.is_none(), "book frames carry no id");
                let b = f.json();
                assert_eq!(b["asset"], "TEST-A");
                got_book = true;
                break;
            }
            Some(_) => continue,
            None => break,
        }
    }
    assert!(got_book, "expected a book frame after hello");
}

#[tokio::test]
async fn resume_after_n_receives_only_later_events() {
    let (_d, s) = boot(&[]).await;
    setup_test_asset(&s).await; // 1
    for i in 1..=3u64 {
        s.post_command(&limit_gtc(&oid(1, i), "TEST-A", "U1", "BUY", 1, 100))
            .await; // 2,3,4
    }
    let epoch = s.epoch().await;
    let mut st = s
        .open_sse(&format!("after=2&epoch={epoch}"))
        .await
        .expect("open");
    let frames = st.collect_sequenced(2).await;
    let ids: Vec<&str> = frames.iter().map(|f| f.id.as_deref().unwrap()).collect();
    assert_eq!(ids, vec!["3", "4"]);
    for f in &frames {
        let j = f.json();
        assert_eq!(
            j["seq"].as_u64().unwrap().to_string(),
            f.id.clone().unwrap()
        );
        assert_eq!(j["type"], f.event.clone().unwrap().as_str());
        assert_eq!(j["engine_epoch"], epoch.as_str());
        assert_eq!(j["type"], "OrderAccepted");
    }
}

#[tokio::test]
async fn live_events_are_delivered() {
    let (_d, s) = boot(&[]).await;
    setup_test_asset(&s).await;
    let mut st = s.open_sse("").await.expect("open");
    // default is live only, so nothing sequenced yet
    let (_, r) = s
        .post_command(&limit_gtc(&oid(1, 1), "TEST-A", "U1", "BUY", 3, 100))
        .await;
    let seq = r["seq"].as_u64().unwrap();
    let frames = st.collect_sequenced(1).await;
    assert_eq!(frames[0].id.as_deref(), Some(seq.to_string().as_str()));
    assert_eq!(frames[0].event.as_deref(), Some("OrderAccepted"));
    let j = frames[0].json();
    assert_eq!(j["order_id"], oid(1, 1).as_str());
    assert_eq!(j["qty"], 3);
}

#[tokio::test]
async fn trade_events_arrive_in_fixed_order() {
    let (_d, s) = boot(&[]).await;
    setup_test_asset(&s).await;
    let mut st = s.open_sse("").await.expect("open");
    s.post_command(&limit_gtc(&oid(1, 1), "TEST-A", "U1", "SELL", 5, 100))
        .await;
    s.post_command(&limit_gtc(&oid(1, 2), "TEST-A", "U2", "BUY", 8, 100))
        .await;
    // seq 2 | 3 accepted, 4 trade, 5 filled A, 6 partially filled B
    let frames = st.collect_sequenced(5).await;
    let names: Vec<String> = frames.iter().map(|f| f.event.clone().unwrap()).collect();
    assert_eq!(
        names,
        vec![
            "OrderAccepted",
            "OrderAccepted",
            "TradeExecuted",
            "OrderFilled",
            "OrderPartiallyFilled"
        ]
    );
    let trade = frames[2].json();
    let epoch = s.epoch().await;
    assert_eq!(trade["trade_id"], format!("{epoch}:4").as_str());
    assert_eq!(trade["price"], 100);
    assert_eq!(trade["qty"], 5);
    assert_eq!(trade["taker_side"], "BUY");
    assert_eq!(trade["buy_remaining"], 3);
    assert_eq!(trade["sell_remaining"], 0);
}

#[tokio::test]
async fn heartbeat_arrives_when_idle() {
    let (_d, s) = boot(&[("SSE_HEARTBEAT_MS", "200")]).await;
    setup_test_asset(&s).await;
    let mut st = s.open_sse("").await.expect("open");
    let mut saw = false;
    for _ in 0..40 {
        match st.next_frame(Duration::from_secs(2)).await {
            Some(f) if f.comment => {
                saw = true;
                break;
            }
            Some(_) => continue,
            None => break,
        }
    }
    assert!(saw, "no heartbeat comment received");
}

#[tokio::test]
async fn resume_point_too_old_is_410_and_boundary_is_allowed() {
    let (_d, s) = boot(&[("RING_CAPACITY", "1000")]).await;
    setup_test_asset(&s).await; // seq 1
    for i in 1..=1100u64 {
        let (st, r) = s
            .post_command(&limit_gtc(&oid(3, i), "TEST-A", "U1", "BUY", 1, 100))
            .await;
        assert_eq!(st, 200);
        assert_eq!(r["status"], "ACCEPTED");
    }
    // 1101 events total, ring holds 1000, so ring_start_seq is 102
    let err = s.open_sse("after=0").await.err().expect("must be gone");
    assert_eq!(err.0, 410);
    assert_eq!(err_code(&err.1), "GONE");
    let start = err.1["error"]["details"]["ring_start_seq"]
        .as_u64()
        .unwrap();
    assert!(start > 1);

    // exactly after + 1 == ring_start_seq is allowed
    let mut st = s
        .open_sse(&format!("after={}", start - 1))
        .await
        .expect("boundary resume must be accepted");
    let f = st.collect_sequenced(1).await;
    assert_eq!(f[0].id.as_deref(), Some(start.to_string().as_str()));

    // one below the boundary is gone
    let err = s
        .open_sse(&format!("after={}", start - 2))
        .await
        .err()
        .expect("gone");
    assert_eq!(err.0, 410);
}

#[tokio::test]
async fn subscriber_cap_is_503() {
    let (_d, s) = boot(&[("SSE_MAX_SUBSCRIBERS", "2"), ("SSE_HEARTBEAT_MS", "200")]).await;
    setup_test_asset(&s).await;
    let mut a = s.open_sse("").await.expect("first");
    let b = s.open_sse("").await.expect("second");
    let _ = a.next_frame(Duration::from_secs(2)).await;

    let err = s.open_sse("").await.err().expect("third must be refused");
    assert_eq!(err.0, 503);
    assert_eq!(err_code(&err.1), "TOO_MANY_SUBSCRIBERS");

    // dropping a subscriber frees a slot (detected on the next heartbeat write)
    drop(b);
    let mut ok = false;
    for _ in 0..30 {
        tokio::time::sleep(Duration::from_millis(200)).await;
        if s.open_sse("").await.is_ok() {
            ok = true;
            break;
        }
    }
    assert!(ok, "slot was never released");
}

#[tokio::test]
async fn two_subscribers_receive_identical_events() {
    let (_d, s) = boot(&[]).await;
    setup_test_asset(&s).await;
    for i in 1..=5u64 {
        let side = if i % 2 == 0 { "SELL" } else { "BUY" };
        let price = if side == "SELL" { 120 } else { 100 };
        s.post_command(&limit_gtc(&oid(4, i), "TEST-A", "U1", side, 1, price))
            .await;
    }
    let epoch = s.epoch().await;
    let q = format!("after=0&epoch={epoch}");
    let mut a = s.open_sse(&q).await.expect("a");
    let mut b = s.open_sse(&q).await.expect("b");
    let fa = a.collect_sequenced(6).await;
    let fb = b.collect_sequenced(6).await;
    assert_eq!(fa, fb);
    let ids: Vec<String> = fa.iter().map(|f| f.id.clone().unwrap()).collect();
    assert_eq!(ids, vec!["1", "2", "3", "4", "5", "6"]);
}

#[tokio::test]
async fn book_snapshots_follow_changes() {
    let (_d, s) = boot(&[("SNAPSHOT_TICK_MS", "50")]).await;
    setup_test_asset(&s).await;
    let mut st = s.open_sse("").await.expect("open");
    s.post_command(&limit_gtc(&oid(1, 1), "TEST-A", "U1", "BUY", 5, 100))
        .await;
    let mut saw = false;
    for _ in 0..30 {
        match st.next_frame(Duration::from_secs(2)).await {
            Some(f) if f.event.as_deref() == Some("book") => {
                let b = f.json();
                if b["best_bid"] == 100 {
                    assert_eq!(b["bids"][0]["qty"], 5);
                    saw = true;
                    break;
                }
            }
            Some(_) => continue,
            None => break,
        }
    }
    assert!(saw, "book snapshot reflecting the new order never arrived");
}
