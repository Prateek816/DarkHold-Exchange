//! `Command` enum and payloads, exactly as spec Section 3.1.
//! Unknown fields are rejected. Range checks beyond types (qty >= 1, price >= 1, ...) happen in `validate.rs`.

use serde::{Deserialize, Serialize};

use crate::types::{
    AssetId, AssetStatus, CancelCommandReason, OrderId, OrderType, Price, Qty, Side, Tif, UserId,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Command {
    SubmitOrder(SubmitOrder),
    CancelOrder(CancelOrder),
    ConfigureAsset(ConfigureAsset),
    HaltAsset(HaltAsset),
    ResumeAsset(ResumeAsset),
}

impl Command {
    /// Short static name used for metrics.
    pub fn kind(&self) -> &'static str {
        match self {
            Command::SubmitOrder(_) => "submit",
            Command::CancelOrder(_) => "cancel",
            Command::ConfigureAsset(_) => "configure",
            Command::HaltAsset(_) => "halt",
            Command::ResumeAsset(_) => "resume",
        }
    }
}

/// For MARKET orders `price` carries the protection price and the order is treated as IOC at that price.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SubmitOrder {
    pub order_id: OrderId,
    pub asset: AssetId,
    pub user_id: UserId,
    pub side: Side,
    pub order_type: OrderType,
    pub tif: Tif,
    pub qty: Qty,
    pub price: Price,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CancelOrder {
    pub order_id: OrderId,
    pub reason: CancelCommandReason,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ConfigureAsset {
    pub asset: AssetId,
    pub tick_size: u64,
    pub min_qty: Qty,
    pub max_qty: Qty,
    /// `null` (or absent) means no collar.
    pub collar_max_price: Option<Price>,
    pub status: AssetStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HaltAsset {
    pub asset: AssetId,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ResumeAsset {
    pub asset: AssetId,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    const SUBMIT: &str = r#"{"type":"SubmitOrder","order_id":"0b6d5c2e-7c1a-4b9f-8f0a-2f3e9d1a4c11","asset":"DFEST-WKND","user_id":"u-1","side":"BUY","order_type":"LIMIT","tif":"GTC","qty":5,"price":10000}"#;
    const CANCEL: &str = r#"{"type":"CancelOrder","order_id":"0b6d5c2e-7c1a-4b9f-8f0a-2f3e9d1a4c11","reason":"USER"}"#;
    const CONFIGURE: &str = r#"{"type":"ConfigureAsset","asset":"TEST-A","tick_size":1,"min_qty":1,"max_qty":1000,"collar_max_price":null,"status":"ACTIVE"}"#;
    const CONFIGURE_COLLAR: &str = r#"{"type":"ConfigureAsset","asset":"TEST-A","tick_size":10,"min_qty":1,"max_qty":10,"collar_max_price":200,"status":"HALTED"}"#;
    const HALT: &str = r#"{"type":"HaltAsset","asset":"TEST-A"}"#;
    const RESUME: &str = r#"{"type":"ResumeAsset","asset":"TEST-A"}"#;

    fn parse(s: &str) -> Result<Command, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parses_every_example() {
        assert!(matches!(parse(SUBMIT).unwrap(), Command::SubmitOrder(_)));
        assert!(matches!(parse(CANCEL).unwrap(), Command::CancelOrder(_)));
        assert!(matches!(
            parse(CONFIGURE).unwrap(),
            Command::ConfigureAsset(_)
        ));
        assert!(matches!(
            parse(CONFIGURE_COLLAR).unwrap(),
            Command::ConfigureAsset(_)
        ));
        assert!(matches!(parse(HALT).unwrap(), Command::HaltAsset(_)));
        assert!(matches!(parse(RESUME).unwrap(), Command::ResumeAsset(_)));
    }

    #[test]
    fn parsed_values_are_correct() {
        match parse(SUBMIT).unwrap() {
            Command::SubmitOrder(s) => {
                assert_eq!(s.asset.as_str(), "DFEST-WKND");
                assert_eq!(s.user_id.as_str(), "u-1");
                assert_eq!(s.side, Side::Buy);
                assert_eq!(s.order_type, OrderType::Limit);
                assert_eq!(s.tif, Tif::Gtc);
                assert_eq!((s.qty, s.price), (5, 10000));
            }
            other => panic!("wrong variant {other:?}"),
        }
        match parse(CONFIGURE_COLLAR).unwrap() {
            Command::ConfigureAsset(c) => {
                assert_eq!(c.collar_max_price, Some(200));
                assert_eq!(c.status, AssetStatus::Halted);
            }
            other => panic!("wrong variant {other:?}"),
        }
    }

    #[test]
    fn round_trips_to_identical_json() {
        for src in [SUBMIT, CANCEL, CONFIGURE, CONFIGURE_COLLAR, HALT, RESUME] {
            let cmd = parse(src).unwrap();
            let again: Value = serde_json::to_value(&cmd).unwrap();
            let original: Value = serde_json::from_str(src).unwrap();
            assert_eq!(again, original, "round trip changed {src}");
        }
    }

    #[test]
    fn rejects_unknown_field_in_every_command() {
        for src in [SUBMIT, CANCEL, CONFIGURE, HALT, RESUME] {
            let mut v: Value = serde_json::from_str(src).unwrap();
            v.as_object_mut()
                .unwrap()
                .insert("surprise".into(), Value::from(1));
            assert!(
                serde_json::from_value::<Command>(v).is_err(),
                "accepted unknown field in {src}"
            );
        }
    }

    #[test]
    fn rejects_bad_enum_uuid_and_types() {
        assert!(parse(&SUBMIT.replace("\"BUY\"", "\"HOLD\"")).is_err());
        assert!(parse(&SUBMIT.replace("\"LIMIT\"", "\"STOP\"")).is_err());
        assert!(parse(&SUBMIT.replace(
            "0b6d5c2e-7c1a-4b9f-8f0a-2f3e9d1a4c11",
            "0B6D5C2E-7C1A-4B9F-8F0A-2F3E9D1A4C11"
        ))
        .is_err());
        assert!(parse(&SUBMIT.replace("\"qty\":5", "\"qty\":-5")).is_err());
        assert!(parse(&SUBMIT.replace("\"qty\":5", "\"qty\":5.5")).is_err());
        assert!(parse(&SUBMIT.replace("\"qty\":5", "\"qty\":\"5\"")).is_err());
        assert!(parse(&SUBMIT.replace("DFEST-WKND", "dfest")).is_err());
        assert!(parse(&SUBMIT.replace("u-1", "u 1")).is_err());
    }

    #[test]
    fn cancel_reason_is_restricted_for_commands() {
        assert!(parse(&CANCEL.replace("USER", "IOC_REMAINDER")).is_err());
        assert!(parse(&CANCEL.replace("USER", "NO_LIQUIDITY")).is_err());
        assert!(parse(&CANCEL.replace("USER", "SELF_TRADE_PREVENTED")).is_err());
        assert!(parse(&CANCEL.replace("USER", "POLICY_BREACH")).is_ok());
        assert!(parse(&CANCEL.replace("USER", "ADMIN")).is_ok());
    }

    #[test]
    fn rejects_missing_or_unknown_type_tag() {
        assert!(parse(r#"{"asset":"TEST-A"}"#).is_err());
        assert!(parse(r#"{"type":"DeleteEverything","asset":"TEST-A"}"#).is_err());
        assert!(parse("not json").is_err());
        assert!(parse("[]").is_err());
    }

    #[test]
    fn missing_required_field_is_rejected() {
        assert!(parse(r#"{"type":"HaltAsset"}"#).is_err());
        assert!(parse(&SUBMIT.replace(",\"price\":10000", "")).is_err());
    }

    #[test]
    fn absent_collar_parses_as_none() {
        let src = r#"{"type":"ConfigureAsset","asset":"TEST-A","tick_size":1,"min_qty":1,"max_qty":5,"status":"ACTIVE"}"#;
        match parse(src).unwrap() {
            Command::ConfigureAsset(c) => assert_eq!(c.collar_max_price, None),
            other => panic!("wrong variant {other:?}"),
        }
    }

    #[test]
    fn zero_and_large_numbers_parse_so_validation_can_reject_them_as_business_errors() {
        assert!(parse(&SUBMIT.replace("\"qty\":5", "\"qty\":0")).is_ok());
        assert!(parse(&SUBMIT.replace("\"price\":10000", "\"price\":0")).is_ok());
        assert!(parse(&SUBMIT.replace("\"price\":10000", "\"price\":9007199254740000")).is_ok());
    }

    #[test]
    fn kind_names() {
        assert_eq!(parse(SUBMIT).unwrap().kind(), "submit");
        assert_eq!(parse(CANCEL).unwrap().kind(), "cancel");
        assert_eq!(parse(CONFIGURE).unwrap().kind(), "configure");
        assert_eq!(parse(HALT).unwrap().kind(), "halt");
        assert_eq!(parse(RESUME).unwrap().kind(), "resume");
    }
}
