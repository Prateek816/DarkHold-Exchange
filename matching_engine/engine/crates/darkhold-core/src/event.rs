//! Event bodies and the envelope (spec Section 3.3). Serialization only.

use serde::Serialize;

use crate::types::{
    AssetId, AssetStatus, CancelEventReason, OrderId, OrderType, Price, Qty, RejectCode, Seq, Side,
    Tif, TsMs, UserId,
};

/// One variant per event type. The `type` tag is the variant name.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "type")]
pub enum EventBody {
    AssetConfigured {
        tick_size: u64,
        min_qty: Qty,
        max_qty: Qty,
        collar_max_price: Option<Price>,
        status: AssetStatus,
    },
    AssetHalted,
    AssetResumed,
    OrderAccepted {
        order_id: OrderId,
        user_id: UserId,
        side: Side,
        order_type: OrderType,
        tif: Tif,
        price: Price,
        qty: Qty,
    },
    OrderRejected {
        order_id: OrderId,
        user_id: UserId,
        code: RejectCode,
    },
    TradeExecuted {
        trade_id: String,
        price: Price,
        qty: Qty,
        buy_order_id: OrderId,
        sell_order_id: OrderId,
        buy_user_id: UserId,
        sell_user_id: UserId,
        maker_order_id: OrderId,
        taker_order_id: OrderId,
        taker_side: Side,
        buy_remaining: Qty,
        sell_remaining: Qty,
    },
    OrderPartiallyFilled {
        order_id: OrderId,
        user_id: UserId,
        /// Cumulative filled quantity.
        filled_qty: Qty,
        remaining_qty: Qty,
    },
    OrderFilled {
        order_id: OrderId,
        user_id: UserId,
        /// Equals the original order quantity.
        filled_qty: Qty,
    },
    OrderCanceled {
        order_id: OrderId,
        user_id: UserId,
        filled_qty: Qty,
        remaining_qty: Qty,
        reason: CancelEventReason,
    },
}

/// Common fields serialize first; `body` is flattened so its fields (and `type`) follow.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct EventEnvelope {
    pub engine_epoch: String,
    pub seq: Seq,
    pub ts: TsMs,
    pub asset: AssetId,
    #[serde(flatten)]
    pub body: EventBody,
}

impl EventEnvelope {
    /// Compact JSON used for the ring and SSE `data:` lines.
    pub fn to_json_string(&self) -> String {
        serde_json::to_string(self).expect("event serialization is infallible")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value};

    const A: &str = "0000000a-0000-4000-8000-00000000000a";
    const B: &str = "0000000b-0000-4000-8000-00000000000b";

    fn oid(s: &str) -> OrderId {
        OrderId::parse(s).unwrap()
    }
    fn uid(s: &str) -> UserId {
        UserId::parse(s).unwrap()
    }
    fn env(seq: Seq, ts: TsMs, body: EventBody) -> EventEnvelope {
        EventEnvelope {
            engine_epoch: "e-test0001".into(),
            seq,
            ts,
            asset: AssetId::parse("TEST-A").unwrap(),
            body,
        }
    }
    fn value(e: &EventEnvelope) -> Value {
        serde_json::from_str(&e.to_json_string()).unwrap()
    }

    #[test]
    fn trade_executed_matches_worked_example_w1() {
        let e = env(
            4,
            1002,
            EventBody::TradeExecuted {
                trade_id: "e-test0001:4".into(),
                price: 100,
                qty: 5,
                buy_order_id: oid(B),
                sell_order_id: oid(A),
                buy_user_id: uid("U2"),
                sell_user_id: uid("U1"),
                maker_order_id: oid(A),
                taker_order_id: oid(B),
                taker_side: Side::Buy,
                buy_remaining: 3,
                sell_remaining: 0,
            },
        );
        assert_eq!(
            value(&e),
            json!({
                "type": "TradeExecuted", "engine_epoch": "e-test0001", "seq": 4, "ts": 1002, "asset": "TEST-A",
                "trade_id": "e-test0001:4", "price": 100, "qty": 5,
                "buy_order_id": B, "sell_order_id": A, "buy_user_id": "U2", "sell_user_id": "U1",
                "maker_order_id": A, "taker_order_id": B, "taker_side": "BUY",
                "buy_remaining": 3, "sell_remaining": 0
            })
        );
    }

    #[test]
    fn asset_events_serialize() {
        let e = env(
            1,
            1000,
            EventBody::AssetConfigured {
                tick_size: 1,
                min_qty: 1,
                max_qty: 1000,
                collar_max_price: None,
                status: AssetStatus::Active,
            },
        );
        assert_eq!(
            value(&e),
            json!({"type":"AssetConfigured","engine_epoch":"e-test0001","seq":1,"ts":1000,"asset":"TEST-A",
                   "tick_size":1,"min_qty":1,"max_qty":1000,"collar_max_price":null,"status":"ACTIVE"})
        );
        assert_eq!(
            value(&env(9, 5, EventBody::AssetHalted)),
            json!({"type":"AssetHalted","engine_epoch":"e-test0001","seq":9,"ts":5,"asset":"TEST-A"})
        );
        assert_eq!(
            value(&env(10, 6, EventBody::AssetResumed)),
            json!({"type":"AssetResumed","engine_epoch":"e-test0001","seq":10,"ts":6,"asset":"TEST-A"})
        );
    }

    #[test]
    fn order_events_serialize() {
        let accepted = env(
            2,
            1001,
            EventBody::OrderAccepted {
                order_id: oid(A),
                user_id: uid("U1"),
                side: Side::Sell,
                order_type: OrderType::Limit,
                tif: Tif::Gtc,
                price: 100,
                qty: 5,
            },
        );
        assert_eq!(
            value(&accepted),
            json!({"type":"OrderAccepted","engine_epoch":"e-test0001","seq":2,"ts":1001,"asset":"TEST-A",
                   "order_id":A,"user_id":"U1","side":"SELL","order_type":"LIMIT","tif":"GTC","price":100,"qty":5})
        );
        let rejected = env(
            3,
            1002,
            EventBody::OrderRejected {
                order_id: oid(A),
                user_id: uid("U1"),
                code: RejectCode::PriceNotOnTick,
            },
        );
        assert_eq!(value(&rejected)["code"], "PRICE_NOT_ON_TICK");
        let partial = env(
            6,
            1002,
            EventBody::OrderPartiallyFilled {
                order_id: oid(B),
                user_id: uid("U2"),
                filled_qty: 5,
                remaining_qty: 3,
            },
        );
        assert_eq!(value(&partial)["type"], "OrderPartiallyFilled");
        assert_eq!(value(&partial)["filled_qty"], 5);
        let filled = env(
            5,
            1002,
            EventBody::OrderFilled {
                order_id: oid(A),
                user_id: uid("U1"),
                filled_qty: 5,
            },
        );
        assert_eq!(value(&filled)["type"], "OrderFilled");
        let canceled = env(
            9,
            1003,
            EventBody::OrderCanceled {
                order_id: oid(B),
                user_id: uid("U2"),
                filled_qty: 7,
                remaining_qty: 3,
                reason: CancelEventReason::IocRemainder,
            },
        );
        assert_eq!(value(&canceled)["reason"], "IOC_REMAINDER");
        assert_eq!(value(&canceled)["remaining_qty"], 3);
    }

    #[test]
    fn every_event_carries_the_common_fields() {
        let e = env(77, 123, EventBody::AssetHalted);
        let v = value(&e);
        for k in ["type", "engine_epoch", "seq", "ts", "asset"] {
            assert!(v.get(k).is_some(), "missing {k}");
        }
    }

    #[test]
    fn json_string_is_compact_single_line() {
        let s = env(1, 1, EventBody::AssetHalted).to_json_string();
        assert!(!s.contains('\n') && !s.contains(": "), "{s}");
    }
}
