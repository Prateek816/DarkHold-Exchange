//! Shared primitive types, validated newtypes and enums (spec Section 2).

use std::fmt;

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use uuid::Uuid;

use crate::error::ParseError;

pub type Price = u64;
pub type Qty = u64;
pub type Seq = u64;
pub type TsMs = u64;

/// 2^53 - 1: the largest integer Node can read exactly. Maximum of any price, quantity, notional, seq, ts on the wire.
pub const MAX_SAFE: u64 = 9_007_199_254_740_991;

pub const ASSET_MAX_LEN: usize = 32;
pub const USER_ID_MAX_LEN: usize = 64;

// ---------------------------------------------------------------- AssetId

/// Asset symbol matching `^[A-Z0-9_-]{1,32}$`.
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct AssetId(String);

impl AssetId {
    pub fn parse(s: &str) -> Result<Self, ParseError> {
        let len_ok = !s.is_empty() && s.len() <= ASSET_MAX_LEN;
        let chars_ok = s
            .bytes()
            .all(|b| b.is_ascii_uppercase() || b.is_ascii_digit() || b == b'_' || b == b'-');
        if len_ok && chars_ok {
            Ok(Self(s.to_owned()))
        } else {
            Err(ParseError::new(format!(
                "invalid asset {s:?}: must match ^[A-Z0-9_-]{{1,32}}$"
            )))
        }
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for AssetId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl Serialize for AssetId {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for AssetId {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let s = String::deserialize(deserializer)?;
        Self::parse(&s).map_err(serde::de::Error::custom)
    }
}

// ----------------------------------------------------------------- UserId

/// Opaque user id: 1 to 64 printable ASCII characters, no whitespace.
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct UserId(String);

impl UserId {
    pub fn parse(s: &str) -> Result<Self, ParseError> {
        let len_ok = !s.is_empty() && s.len() <= USER_ID_MAX_LEN;
        // is_ascii_graphic: 0x21..=0x7E, which excludes space and control characters.
        let chars_ok = s.bytes().all(|b| b.is_ascii_graphic());
        if len_ok && chars_ok {
            Ok(Self(s.to_owned()))
        } else {
            Err(ParseError::new(format!(
                "invalid user_id {s:?}: must be 1 to 64 printable ASCII characters without whitespace"
            )))
        }
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for UserId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl Serialize for UserId {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for UserId {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let s = String::deserialize(deserializer)?;
        Self::parse(&s).map_err(serde::de::Error::custom)
    }
}

// ---------------------------------------------------------------- OrderId

/// Order id: a UUID in canonical lowercase hyphenated form.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct OrderId(Uuid);

impl OrderId {
    pub fn parse(s: &str) -> Result<Self, ParseError> {
        let canonical = s.len() == 36 && s == s.to_ascii_lowercase();
        match Uuid::parse_str(s) {
            // At length 36 `Uuid::parse_str` only accepts the hyphenated form.
            Ok(u) if canonical => Ok(Self(u)),
            _ => Err(ParseError::new(format!(
                "invalid order_id {s:?}: must be a lowercase hyphenated UUID"
            ))),
        }
    }

    pub fn as_uuid(&self) -> Uuid {
        self.0
    }
}

impl fmt::Display for OrderId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0.hyphenated())
    }
}

impl Serialize for OrderId {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.collect_str(&self.0.hyphenated())
    }
}

impl<'de> Deserialize<'de> for OrderId {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let s = String::deserialize(deserializer)?;
        Self::parse(&s).map_err(serde::de::Error::custom)
    }
}

// ------------------------------------------------------------------ enums

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Side {
    Buy,
    Sell,
}

impl Side {
    pub fn as_str(&self) -> &'static str {
        match self {
            Side::Buy => "BUY",
            Side::Sell => "SELL",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OrderType {
    Limit,
    Market,
}

impl OrderType {
    pub fn as_str(&self) -> &'static str {
        match self {
            OrderType::Limit => "LIMIT",
            OrderType::Market => "MARKET",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Tif {
    Gtc,
    Ioc,
}

impl Tif {
    pub fn as_str(&self) -> &'static str {
        match self {
            Tif::Gtc => "GTC",
            Tif::Ioc => "IOC",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AssetStatus {
    Active,
    Halted,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OrderStatus {
    Open,
    PartiallyFilled,
    Filled,
    Canceled,
    Rejected,
}

/// Reasons a caller may put on a `CancelOrder` command.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CancelCommandReason {
    User,
    PolicyBreach,
    Admin,
}

/// Reasons that appear on an `OrderCanceled` event.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CancelEventReason {
    User,
    PolicyBreach,
    Admin,
    IocRemainder,
    NoLiquidity,
    SelfTradePrevented,
}

impl From<CancelCommandReason> for CancelEventReason {
    fn from(r: CancelCommandReason) -> Self {
        match r {
            CancelCommandReason::User => CancelEventReason::User,
            CancelCommandReason::PolicyBreach => CancelEventReason::PolicyBreach,
            CancelCommandReason::Admin => CancelEventReason::Admin,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CancelReplyStatus {
    Canceled,
    AlreadyCanceled,
    AlreadyFilled,
    UnknownOrder,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SubmitReplyStatus {
    Accepted,
    Rejected,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AdminReplyStatus {
    Ok,
    Noop,
    Rejected,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RejectCode {
    UnknownAsset,
    AssetHalted,
    InvalidQty,
    InvalidPrice,
    PriceNotOnTick,
    PriceAboveCollar,
    NotionalOverflow,
    InvalidTif,
    OrderIdReused,
    InvalidConfig,
}

// ------------------------------------------------------------------ tests

#[cfg(test)]
mod tests {
    use super::*;

    const UUID_OK: &str = "0b6d5c2e-7c1a-4b9f-8f0a-2f3e9d1a4c11";

    #[test]
    fn asset_accepts_valid() {
        let max = "X".repeat(32);
        for s in ["A", "DFEST-WKND", "TEST_A1", "BENCH-A", max.as_str()] {
            assert!(AssetId::parse(s).is_ok(), "should accept {s}");
        }
    }

    #[test]
    fn asset_rejects_invalid() {
        let long = "X".repeat(33);
        for s in ["", "test-a", "A B", "A.B", "ÄSSET", "A\n", long.as_str()] {
            assert!(AssetId::parse(s).is_err(), "should reject {s:?}");
        }
    }

    #[test]
    fn user_accepts_valid() {
        let max = "u".repeat(64);
        for s in ["u-1", "U1", "bench-0001@x", "~!", max.as_str()] {
            assert!(UserId::parse(s).is_ok(), "should accept {s}");
        }
    }

    #[test]
    fn user_rejects_invalid() {
        let long = "u".repeat(65);
        for s in ["", "a b", "a\tb", "a\u{7f}", "ünï", " lead", long.as_str()] {
            assert!(UserId::parse(s).is_err(), "should reject {s:?}");
        }
    }

    #[test]
    fn order_id_accepts_canonical_only() {
        assert!(OrderId::parse(UUID_OK).is_ok());
        for s in [
            "0B6D5C2E-7C1A-4B9F-8F0A-2F3E9D1A4C11",   // uppercase
            "0b6d5c2e7c1a4b9f8f0a2f3e9d1a4c11",       // simple
            "{0b6d5c2e-7c1a-4b9f-8f0a-2f3e9d1a4c11}", // braced
            "urn:uuid:0b6d5c2e-7c1a-4b9f-8f0a-2f3e9d1a4c11",
            "not-a-uuid",
            "",
        ] {
            assert!(OrderId::parse(s).is_err(), "should reject {s}");
        }
    }

    #[test]
    fn newtypes_round_trip_through_json() {
        let a = AssetId::parse("TEST-A").unwrap();
        assert_eq!(serde_json::to_string(&a).unwrap(), "\"TEST-A\"");
        assert_eq!(serde_json::from_str::<AssetId>("\"TEST-A\"").unwrap(), a);
        let u = UserId::parse("U1").unwrap();
        assert_eq!(serde_json::to_string(&u).unwrap(), "\"U1\"");
        let o = OrderId::parse(UUID_OK).unwrap();
        assert_eq!(serde_json::to_string(&o).unwrap(), format!("\"{UUID_OK}\""));
        assert_eq!(
            serde_json::from_str::<OrderId>(&format!("\"{UUID_OK}\"")).unwrap(),
            o
        );
        assert_eq!(o.to_string(), UUID_OK);
    }

    #[test]
    fn newtype_deserialize_failures_carry_a_clear_message() {
        let e = serde_json::from_str::<AssetId>("\"bad asset\"")
            .unwrap_err()
            .to_string();
        assert!(e.contains("invalid asset"), "{e}");
        let e = serde_json::from_str::<UserId>("\"a b\"")
            .unwrap_err()
            .to_string();
        assert!(e.contains("invalid user_id"), "{e}");
        let e = serde_json::from_str::<OrderId>("\"zzz\"")
            .unwrap_err()
            .to_string();
        assert!(e.contains("invalid order_id"), "{e}");
        assert!(serde_json::from_str::<AssetId>("5").is_err());
    }

    fn assert_spelling<T>(value: T, wire: &str)
    where
        T: Serialize + serde::de::DeserializeOwned + PartialEq + fmt::Debug,
    {
        let json = serde_json::to_string(&value).unwrap();
        assert_eq!(json, format!("\"{wire}\""));
        assert_eq!(serde_json::from_str::<T>(&json).unwrap(), value);
    }

    #[test]
    fn enum_spellings_round_trip() {
        assert_spelling(Side::Buy, "BUY");
        assert_spelling(Side::Sell, "SELL");
        assert_spelling(OrderType::Limit, "LIMIT");
        assert_spelling(OrderType::Market, "MARKET");
        assert_spelling(Tif::Gtc, "GTC");
        assert_spelling(Tif::Ioc, "IOC");
        assert_spelling(AssetStatus::Active, "ACTIVE");
        assert_spelling(AssetStatus::Halted, "HALTED");
        assert_spelling(OrderStatus::Open, "OPEN");
        assert_spelling(OrderStatus::PartiallyFilled, "PARTIALLY_FILLED");
        assert_spelling(OrderStatus::Filled, "FILLED");
        assert_spelling(OrderStatus::Canceled, "CANCELED");
        assert_spelling(OrderStatus::Rejected, "REJECTED");
        assert_spelling(CancelCommandReason::User, "USER");
        assert_spelling(CancelCommandReason::PolicyBreach, "POLICY_BREACH");
        assert_spelling(CancelCommandReason::Admin, "ADMIN");
        assert_spelling(CancelEventReason::IocRemainder, "IOC_REMAINDER");
        assert_spelling(CancelEventReason::NoLiquidity, "NO_LIQUIDITY");
        assert_spelling(
            CancelEventReason::SelfTradePrevented,
            "SELF_TRADE_PREVENTED",
        );
        assert_spelling(CancelReplyStatus::Canceled, "CANCELED");
        assert_spelling(CancelReplyStatus::AlreadyCanceled, "ALREADY_CANCELED");
        assert_spelling(CancelReplyStatus::AlreadyFilled, "ALREADY_FILLED");
        assert_spelling(CancelReplyStatus::UnknownOrder, "UNKNOWN_ORDER");
        assert_spelling(SubmitReplyStatus::Accepted, "ACCEPTED");
        assert_spelling(SubmitReplyStatus::Rejected, "REJECTED");
        assert_spelling(AdminReplyStatus::Ok, "OK");
        assert_spelling(AdminReplyStatus::Noop, "NOOP");
        assert_spelling(AdminReplyStatus::Rejected, "REJECTED");
        assert_spelling(RejectCode::UnknownAsset, "UNKNOWN_ASSET");
        assert_spelling(RejectCode::AssetHalted, "ASSET_HALTED");
        assert_spelling(RejectCode::InvalidQty, "INVALID_QTY");
        assert_spelling(RejectCode::InvalidPrice, "INVALID_PRICE");
        assert_spelling(RejectCode::PriceNotOnTick, "PRICE_NOT_ON_TICK");
        assert_spelling(RejectCode::PriceAboveCollar, "PRICE_ABOVE_COLLAR");
        assert_spelling(RejectCode::NotionalOverflow, "NOTIONAL_OVERFLOW");
        assert_spelling(RejectCode::InvalidTif, "INVALID_TIF");
        assert_spelling(RejectCode::OrderIdReused, "ORDER_ID_REUSED");
        assert_spelling(RejectCode::InvalidConfig, "INVALID_CONFIG");
    }

    #[test]
    fn enum_rejects_wrong_spelling() {
        assert!(serde_json::from_str::<Side>("\"buy\"").is_err());
        assert!(serde_json::from_str::<Tif>("\"FOK\"").is_err());
        assert!(serde_json::from_str::<CancelCommandReason>("\"IOC_REMAINDER\"").is_err());
    }

    #[test]
    fn as_str_matches_wire_spelling() {
        assert_eq!(Side::Sell.as_str(), "SELL");
        assert_eq!(OrderType::Market.as_str(), "MARKET");
        assert_eq!(Tif::Ioc.as_str(), "IOC");
    }

    #[test]
    fn command_reason_maps_to_event_reason() {
        assert_eq!(
            CancelEventReason::from(CancelCommandReason::PolicyBreach),
            CancelEventReason::PolicyBreach
        );
    }

    #[test]
    fn max_safe_is_2_pow_53_minus_1() {
        assert_eq!(MAX_SAFE, (1u64 << 53) - 1);
    }
}
