//! Submit validation. Returns the first failing code, in the exact order of Section 4.1.

use crate::command::SubmitOrder;
use crate::config::AssetConfig;
use crate::types::{AssetStatus, OrderType, RejectCode, Tif, MAX_SAFE};

pub fn validate_submit(cfg: Option<&AssetConfig>, cmd: &SubmitOrder) -> Result<(), RejectCode> {
    let cfg = cfg.ok_or(RejectCode::UnknownAsset)?;
    if cfg.status != AssetStatus::Active {
        return Err(RejectCode::AssetHalted);
    }
    if cmd.order_type == OrderType::Market && cmd.tif != Tif::Ioc {
        return Err(RejectCode::InvalidTif);
    }
    if cmd.qty < cfg.min_qty || cmd.qty > cfg.max_qty || cmd.qty > MAX_SAFE {
        return Err(RejectCode::InvalidQty);
    }
    if cmd.price < 1 || cmd.price > MAX_SAFE {
        return Err(RejectCode::InvalidPrice);
    }
    if cfg.tick_size == 0 || cmd.price % cfg.tick_size != 0 {
        return Err(RejectCode::PriceNotOnTick);
    }
    if let Some(collar) = cfg.collar_max_price {
        if cmd.price > collar {
            return Err(RejectCode::PriceAboveCollar);
        }
    }
    match cmd.price.checked_mul(cmd.qty) {
        Some(n) if n <= MAX_SAFE => Ok(()),
        _ => Err(RejectCode::NotionalOverflow),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::*;
    use crate::types::Side;

    fn base() -> AssetConfig {
        let mut c = cfg(10, 1, 1000);
        c.collar_max_price = Some(200);
        c
    }

    fn check(c: Option<&AssetConfig>, s: &SubmitOrder) -> Result<(), RejectCode> {
        validate_submit(c, s)
    }

    #[test]
    fn valid_order_passes() {
        let c = base();
        assert_eq!(
            check(Some(&c), &limit(1, "TEST-A", "U1", Side::Buy, 5, 100)),
            Ok(())
        );
    }

    #[test]
    fn unknown_asset() {
        let s = limit(1, "NOPE", "U1", Side::Buy, 5, 100);
        assert_eq!(check(None, &s), Err(RejectCode::UnknownAsset));
    }

    #[test]
    fn halted_asset() {
        let mut c = base();
        c.status = AssetStatus::Halted;
        let s = limit(1, "TEST-A", "U1", Side::Buy, 5, 100);
        assert_eq!(check(Some(&c), &s), Err(RejectCode::AssetHalted));
    }

    #[test]
    fn market_requires_ioc() {
        let c = base();
        let mut s = market_ioc(1, "TEST-A", "U1", Side::Buy, 5, 100);
        s.tif = Tif::Gtc;
        assert_eq!(check(Some(&c), &s), Err(RejectCode::InvalidTif));
    }

    #[test]
    fn qty_bounds() {
        let c = base();
        for q in [0u64, 1001] {
            let s = limit(1, "TEST-A", "U1", Side::Buy, q, 100);
            assert_eq!(check(Some(&c), &s), Err(RejectCode::InvalidQty), "qty {q}");
        }
    }

    #[test]
    fn price_bounds() {
        let c = base();
        for p in [0u64, MAX_SAFE + 1] {
            let s = limit(1, "TEST-A", "U1", Side::Buy, 1, p);
            assert_eq!(
                check(Some(&c), &s),
                Err(RejectCode::InvalidPrice),
                "price {p}"
            );
        }
    }

    #[test]
    fn tick() {
        let c = base();
        let s = limit(1, "TEST-A", "U1", Side::Buy, 1, 105);
        assert_eq!(check(Some(&c), &s), Err(RejectCode::PriceNotOnTick));
    }

    #[test]
    fn collar() {
        let c = base();
        let s = limit(1, "TEST-A", "U1", Side::Buy, 1, 250);
        assert_eq!(check(Some(&c), &s), Err(RejectCode::PriceAboveCollar));
        let s = limit(2, "TEST-A", "U1", Side::Buy, 1, 200);
        assert_eq!(check(Some(&c), &s), Ok(()));
    }

    #[test]
    fn notional_overflow() {
        let c = cfg(1, 1, 1000);
        let s = limit(1, "TEST-A", "U1", Side::Buy, 10, 9_007_199_254_740_000);
        assert_eq!(check(Some(&c), &s), Err(RejectCode::NotionalOverflow));
    }

    #[test]
    fn first_failing_check_wins() {
        let mut c = base();
        c.status = AssetStatus::Halted;
        let s = limit(1, "TEST-A", "U1", Side::Buy, 0, 0);
        assert_eq!(check(Some(&c), &s), Err(RejectCode::AssetHalted));

        let c = base();
        let mut s = market_ioc(2, "TEST-A", "U1", Side::Buy, 0, 105);
        s.tif = Tif::Gtc;
        assert_eq!(check(Some(&c), &s), Err(RejectCode::InvalidTif));

        let s = limit(3, "TEST-A", "U1", Side::Buy, 0, 105);
        assert_eq!(check(Some(&c), &s), Err(RejectCode::InvalidQty));
    }
}
