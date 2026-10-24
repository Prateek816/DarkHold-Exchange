use uuid::Uuid;

use crate::command::SubmitOrder;
use crate::config::AssetConfig;
use crate::types::{AssetId, AssetStatus, OrderId, OrderType, Side, Tif, UserId};

pub fn asset(s: &str) -> AssetId {
    AssetId::parse(s).unwrap()
}
pub fn user(s: &str) -> UserId {
    UserId::parse(s).unwrap()
}
pub fn oid_s(n: u128) -> String {
    Uuid::from_u128(n).hyphenated().to_string()
}
pub fn oid(n: u128) -> OrderId {
    OrderId::parse(&oid_s(n)).unwrap()
}
pub fn cfg(tick: u64, min: u64, max: u64) -> AssetConfig {
    AssetConfig {
        tick_size: tick,
        min_qty: min,
        max_qty: max,
        collar_max_price: None,
        status: AssetStatus::Active,
    }
}
pub fn limit(id: u128, a: &str, u: &str, side: Side, qty: u64, price: u64) -> SubmitOrder {
    SubmitOrder {
        order_id: oid(id),
        asset: asset(a),
        user_id: user(u),
        side,
        order_type: OrderType::Limit,
        tif: Tif::Gtc,
        qty,
        price,
    }
}
pub fn market_ioc(
    id: u128,
    a: &str,
    u: &str,
    side: Side,
    qty: u64,
    protection: u64,
) -> SubmitOrder {
    SubmitOrder {
        order_type: OrderType::Market,
        tif: Tif::Ioc,
        ..limit(id, a, u, side, qty, protection)
    }
}
