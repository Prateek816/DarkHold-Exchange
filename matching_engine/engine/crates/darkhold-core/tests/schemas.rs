//! Every message the core can emit or accept must satisfy `contracts/schemas/`.
//! Code that disagrees with a schema is the bug.

mod support;

use darkhold_core::*;
use serde_json::{json, Value};
use support::*;

fn env(seq: Seq, body: EventBody) -> EventEnvelope {
    EventEnvelope {
        engine_epoch: EPOCH.into(),
        seq,
        ts: 1000 + seq,
        asset: asset("TEST-A"),
        body,
    }
}

fn all_event_bodies() -> Vec<EventBody> {
    let a = fixture_id("A");
    let b = fixture_id("B");
    let mut v = vec![
        EventBody::AssetConfigured {
            tick_size: 1,
            min_qty: 1,
            max_qty: 1000,
            collar_max_price: None,
            status: AssetStatus::Active,
        },
        EventBody::AssetConfigured {
            tick_size: 10,
            min_qty: 1,
            max_qty: 10,
            collar_max_price: Some(200),
            status: AssetStatus::Halted,
        },
        EventBody::AssetHalted,
        EventBody::AssetResumed,
        EventBody::OrderAccepted {
            order_id: a,
            user_id: user("U1"),
            side: Side::Sell,
            order_type: OrderType::Limit,
            tif: Tif::Gtc,
            price: 100,
            qty: 5,
        },
        EventBody::OrderAccepted {
            order_id: b,
            user_id: user("U2"),
            side: Side::Buy,
            order_type: OrderType::Market,
            tif: Tif::Ioc,
            price: 102,
            qty: 10,
        },
        EventBody::TradeExecuted {
            trade_id: format!("{EPOCH}:4"),
            price: 100,
            qty: 5,
            buy_order_id: b,
            sell_order_id: a,
            buy_user_id: user("U2"),
            sell_user_id: user("U1"),
            maker_order_id: a,
            taker_order_id: b,
            taker_side: Side::Buy,
            buy_remaining: 3,
            sell_remaining: 0,
        },
        EventBody::OrderPartiallyFilled {
            order_id: b,
            user_id: user("U2"),
            filled_qty: 5,
            remaining_qty: 3,
        },
        EventBody::OrderFilled {
            order_id: a,
            user_id: user("U1"),
            filled_qty: 5,
        },
    ];
    // Every reject code that can appear on an OrderRejected event.
    for code in [
        RejectCode::UnknownAsset,
        RejectCode::AssetHalted,
        RejectCode::InvalidQty,
        RejectCode::InvalidPrice,
        RejectCode::PriceNotOnTick,
        RejectCode::PriceAboveCollar,
        RejectCode::NotionalOverflow,
        RejectCode::InvalidTif,
    ] {
        v.push(EventBody::OrderRejected {
            order_id: a,
            user_id: user("U1"),
            code,
        });
    }
    for reason in [
        CancelEventReason::User,
        CancelEventReason::PolicyBreach,
        CancelEventReason::Admin,
        CancelEventReason::IocRemainder,
        CancelEventReason::NoLiquidity,
        CancelEventReason::SelfTradePrevented,
    ] {
        v.push(EventBody::OrderCanceled {
            order_id: a,
            user_id: user("U1"),
            filled_qty: 0,
            remaining_qty: 5,
            reason,
        });
    }
    v
}

#[test]
fn every_event_variant_validates_against_the_event_schema() {
    let s = schema("event.envelope.schema.json");
    for (i, body) in all_event_bodies().into_iter().enumerate() {
        let e = env(i as u64 + 1, body);
        assert_valid(&s, &normalize(&e), &format!("event #{}", i + 1));
    }
}

#[test]
fn event_json_string_validates_too() {
    let s = schema("event.envelope.schema.json");
    for (i, body) in all_event_bodies().into_iter().enumerate() {
        let parsed: Value =
            serde_json::from_str(&env(i as u64 + 1, body).to_json_string()).unwrap();
        assert_valid(&s, &parsed, "to_json_string output");
    }
}

#[test]
fn event_schema_rejects_malformed_events() {
    let s = schema("event.envelope.schema.json");
    let good = normalize(&env(1, EventBody::AssetHalted));
    assert_valid(&s, &good, "baseline");
    let mut extra = good.clone();
    extra["surprise"] = json!(1);
    assert_invalid(&s, &extra, "event with extra field");
    let mut bad_type = good.clone();
    bad_type["type"] = json!("Nope");
    assert_invalid(&s, &bad_type, "unknown event type");
    let mut zero_seq = good.clone();
    zero_seq["seq"] = json!(0);
    assert_invalid(&s, &zero_seq, "seq 0");
    let mut too_big = good.clone();
    too_big["ts"] = json!(9_007_199_254_740_992u64);
    assert_invalid(&s, &too_big, "ts above MAX_SAFE");
    let mut bad_epoch = good;
    bad_epoch["engine_epoch"] = json!("E-TEST0001");
    assert_invalid(&s, &bad_epoch, "uppercase epoch");
}

#[test]
fn every_reply_constructor_validates_against_the_reply_schema() {
    let s = schema("reply.command.schema.json");
    let a = fixture_id("A");
    let replies = vec![
        CommandReply::submit_accepted(a, 3, 6, EPOCH),
        CommandReply::submit_rejected(a, RejectCode::InvalidQty, Some(7), 7, EPOCH),
        CommandReply::submit_rejected(a, RejectCode::OrderIdReused, None, 2, EPOCH),
        CommandReply::cancel_result(
            CancelReplyStatus::Canceled,
            a,
            Some(5),
            Some(3),
            3,
            false,
            EPOCH,
        ),
        CommandReply::cancel_result(
            CancelReplyStatus::AlreadyCanceled,
            a,
            None,
            None,
            3,
            true,
            EPOCH,
        ),
        CommandReply::cancel_result(
            CancelReplyStatus::AlreadyFilled,
            a,
            None,
            None,
            6,
            false,
            EPOCH,
        ),
        CommandReply::cancel_result(
            CancelReplyStatus::UnknownOrder,
            a,
            None,
            None,
            1,
            false,
            EPOCH,
        ),
        CommandReply::admin_result(
            AdminReplyStatus::Ok,
            asset("TEST-A"),
            None,
            Some(1),
            1,
            EPOCH,
        ),
        CommandReply::admin_result(
            AdminReplyStatus::Noop,
            asset("TEST-A"),
            None,
            None,
            4,
            EPOCH,
        ),
        CommandReply::admin_result(
            AdminReplyStatus::Rejected,
            asset("NOPE"),
            Some(RejectCode::UnknownAsset),
            None,
            4,
            EPOCH,
        ),
        CommandReply::admin_result(
            AdminReplyStatus::Rejected,
            asset("TEST-A"),
            Some(RejectCode::InvalidConfig),
            None,
            4,
            EPOCH,
        ),
    ];
    for (i, r) in replies.iter().enumerate() {
        assert_valid(&s, &normalize(r), &format!("reply #{i}"));
    }
}

#[test]
fn reply_schema_rejects_malformed_replies() {
    let s = schema("reply.command.schema.json");
    let good = normalize(&CommandReply::submit_accepted(fixture_id("A"), 3, 6, EPOCH));
    assert_valid(&s, &good, "baseline");
    let mut bad_status = good.clone();
    bad_status["status"] = json!("MAYBE");
    assert_invalid(&s, &bad_status, "bad status");
    let mut extra = good.clone();
    extra["surprise"] = json!(true);
    assert_invalid(&s, &extra, "extra field");
    let mut missing = good.clone();
    missing.as_object_mut().unwrap().remove("duplicate");
    assert_invalid(&s, &missing, "missing duplicate");
}

fn command_cases() -> Vec<(&'static str, Command)> {
    let a = fixture_id("A");
    vec![
        (
            "command.submit-order.schema.json",
            Command::SubmitOrder(SubmitOrder {
                order_id: a,
                asset: asset("DFEST-WKND"),
                user_id: user("u-1"),
                side: Side::Buy,
                order_type: OrderType::Limit,
                tif: Tif::Gtc,
                qty: 5,
                price: 10000,
            }),
        ),
        (
            "command.submit-order.schema.json",
            Command::SubmitOrder(SubmitOrder {
                order_id: a,
                asset: asset("TEST-A"),
                user_id: user("U2"),
                side: Side::Sell,
                order_type: OrderType::Market,
                tif: Tif::Ioc,
                qty: 0, // business-rejected, but a valid wire command (scenario S21)
                price: 0,
            }),
        ),
        (
            "command.cancel-order.schema.json",
            Command::CancelOrder(CancelOrder {
                order_id: a,
                reason: CancelCommandReason::PolicyBreach,
            }),
        ),
        (
            "command.configure-asset.schema.json",
            Command::ConfigureAsset(ConfigureAsset {
                asset: asset("TEST-A"),
                tick_size: 1,
                min_qty: 1,
                max_qty: 1000,
                collar_max_price: None,
                status: AssetStatus::Active,
            }),
        ),
        (
            "command.configure-asset.schema.json",
            Command::ConfigureAsset(ConfigureAsset {
                asset: asset("TEST-A"),
                tick_size: 10,
                min_qty: 1,
                max_qty: 10,
                collar_max_price: Some(200),
                status: AssetStatus::Halted,
            }),
        ),
        (
            "command.asset-status.schema.json",
            Command::HaltAsset(HaltAsset {
                asset: asset("TEST-A"),
            }),
        ),
        (
            "command.asset-status.schema.json",
            Command::ResumeAsset(ResumeAsset {
                asset: asset("TEST-A"),
            }),
        ),
    ]
}

#[test]
fn serialized_commands_validate_against_command_schemas() {
    for (i, (file, cmd)) in command_cases().into_iter().enumerate() {
        assert_valid(
            &schema(file),
            &normalize(&cmd),
            &format!("command #{i} vs {file}"),
        );
    }
}

#[test]
fn schema_valid_commands_parse_in_rust() {
    // The reverse direction: what the schema accepts, the Rust parser accepts.
    let examples = [
        json!({"type":"SubmitOrder","order_id":"0b6d5c2e-7c1a-4b9f-8f0a-2f3e9d1a4c11","asset":"DFEST-WKND","user_id":"u-1","side":"BUY","order_type":"LIMIT","tif":"GTC","qty":5,"price":10000}),
        json!({"type":"CancelOrder","order_id":"0b6d5c2e-7c1a-4b9f-8f0a-2f3e9d1a4c11","reason":"ADMIN"}),
        json!({"type":"ConfigureAsset","asset":"TEST-A","tick_size":1,"min_qty":1,"max_qty":1000,"collar_max_price":null,"status":"ACTIVE"}),
        json!({"type":"HaltAsset","asset":"TEST-A"}),
        json!({"type":"ResumeAsset","asset":"TEST-A"}),
    ];
    let files = [
        "command.submit-order.schema.json",
        "command.cancel-order.schema.json",
        "command.configure-asset.schema.json",
        "command.asset-status.schema.json",
        "command.asset-status.schema.json",
    ];
    for (ex, file) in examples.iter().zip(files) {
        assert_valid(&schema(file), ex, "example command");
        serde_json::from_value::<Command>(ex.clone()).expect("rust parses schema-valid command");
    }
}

#[test]
fn command_schemas_reject_what_rust_rejects() {
    let submit = schema("command.submit-order.schema.json");
    let good = json!({"type":"SubmitOrder","order_id":"0b6d5c2e-7c1a-4b9f-8f0a-2f3e9d1a4c11","asset":"TEST-A","user_id":"U1","side":"BUY","order_type":"LIMIT","tif":"GTC","qty":5,"price":100});
    assert_valid(&submit, &good, "baseline");
    for (field, value) in [
        ("side", json!("HOLD")),
        ("order_id", json!("0B6D5C2E-7C1A-4B9F-8F0A-2F3E9D1A4C11")),
        ("asset", json!("lower")),
        ("user_id", json!("has space")),
        ("qty", json!(-1)),
        ("price", json!(9_007_199_254_740_992u64)),
    ] {
        let mut bad = good.clone();
        bad[field] = value;
        assert_invalid(&submit, &bad, &format!("submit with bad {field}"));
        // Range limits (price above MAX_SAFE) are enforced later, in validate.rs.
        if field != "price" {
            assert!(
                serde_json::from_value::<Command>(bad).is_err(),
                "rust accepted bad {field}"
            );
        }
    }
    let cancel = schema("command.cancel-order.schema.json");
    let bad_reason = json!({"type":"CancelOrder","order_id":"0b6d5c2e-7c1a-4b9f-8f0a-2f3e9d1a4c11","reason":"IOC_REMAINDER"});
    assert_invalid(&cancel, &bad_reason, "cancel with event-only reason");
    assert!(serde_json::from_value::<Command>(bad_reason).is_err());
}

#[test]
fn golden_scenario_commands_parse_in_rust() {
    // Step 1 fixtures are commands only; every one must already be a command the Rust parser accepts.
    let dir = contracts_dir().join("fixtures/engine/scenarios");
    let mut files: Vec<_> = std::fs::read_dir(&dir)
        .expect("scenarios dir")
        .map(|e| e.unwrap().path())
        .collect();
    files.sort();
    assert_eq!(files.len(), 24, "expected 24 scenario files");
    for f in files {
        let sc: Value = serde_json::from_str(&std::fs::read_to_string(&f).unwrap()).unwrap();
        for (n, step) in sc["steps"].as_array().expect("steps").iter().enumerate() {
            serde_json::from_value::<Command>(step["command"].clone())
                .unwrap_or_else(|e| panic!("{} step {}: {e}", f.display(), n + 1));
        }
    }
}
