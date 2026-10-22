//! Deterministic order fingerprint: FNV-1a 64-bit over the canonical string
//! `asset|user_id|side|order_type|tif|qty|price`. Never `DefaultHasher`.

use crate::command::SubmitOrder;

pub const FNV_OFFSET_BASIS: u64 = 14_695_981_039_346_656_037;
pub const FNV_PRIME: u64 = 1_099_511_628_211;

pub fn fnv1a64(bytes: &[u8]) -> u64 {
    let mut hash = FNV_OFFSET_BASIS;
    for b in bytes {
        hash ^= u64::from(*b);
        hash = hash.wrapping_mul(FNV_PRIME);
    }
    hash
}

/// Enum wire spellings and decimal integers, `|` separated. `order_id` is deliberately excluded.
pub fn canonical_string(o: &SubmitOrder) -> String {
    format!(
        "{}|{}|{}|{}|{}|{}|{}",
        o.asset,
        o.user_id,
        o.side.as_str(),
        o.order_type.as_str(),
        o.tif.as_str(),
        o.qty,
        o.price
    )
}

pub fn fingerprint(o: &SubmitOrder) -> u64 {
    fnv1a64(canonical_string(o).as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{AssetId, OrderId, OrderType, Side, Tif, UserId};

    fn order() -> SubmitOrder {
        SubmitOrder {
            order_id: OrderId::parse("0000000a-0000-4000-8000-00000000000a").unwrap(),
            asset: AssetId::parse("TEST-A").unwrap(),
            user_id: UserId::parse("U1").unwrap(),
            side: Side::Buy,
            order_type: OrderType::Limit,
            tif: Tif::Gtc,
            qty: 5,
            price: 100,
        }
    }

    #[test]
    fn fnv1a64_standard_test_vectors() {
        assert_eq!(fnv1a64(b""), 0xcbf2_9ce4_8422_2325);
        assert_eq!(fnv1a64(b""), 14_695_981_039_346_656_037);
        assert_eq!(fnv1a64(b"a"), 0xaf63_dc4c_8601_ec8c);
        assert_eq!(fnv1a64(b"foobar"), 0x8594_4171_f739_67e8);
    }

    #[test]
    fn canonical_string_is_exact() {
        assert_eq!(canonical_string(&order()), "TEST-A|U1|BUY|LIMIT|GTC|5|100");
    }

    #[test]
    fn known_input_gives_known_hash() {
        assert_eq!(fingerprint(&order()), 7_739_092_965_818_673_428);
    }

    #[test]
    fn quantity_change_changes_hash() {
        let mut o = order();
        let base = fingerprint(&o);
        o.qty = 6;
        assert_ne!(fingerprint(&o), base);
        assert_eq!(fingerprint(&o), 11_199_896_104_455_874_021);
    }

    #[test]
    fn every_field_but_order_id_changes_the_hash() {
        let base = fingerprint(&order());
        let mut o = order();
        o.asset = AssetId::parse("TEST-B").unwrap();
        assert_ne!(fingerprint(&o), base);
        let mut o = order();
        o.user_id = UserId::parse("U2").unwrap();
        assert_ne!(fingerprint(&o), base);
        let mut o = order();
        o.side = Side::Sell;
        assert_ne!(fingerprint(&o), base);
        let mut o = order();
        o.order_type = OrderType::Market;
        assert_ne!(fingerprint(&o), base);
        let mut o = order();
        o.tif = Tif::Ioc;
        assert_ne!(fingerprint(&o), base);
        let mut o = order();
        o.price = 101;
        assert_ne!(fingerprint(&o), base);
        let mut o = order();
        o.order_id = OrderId::parse("0000000b-0000-4000-8000-00000000000b").unwrap();
        assert_eq!(
            fingerprint(&o),
            base,
            "order_id must not affect the fingerprint"
        );
    }
}
