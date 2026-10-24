//! Matches one incoming order against a book. Pure: mutates the book, emits nothing.

use crate::book::AssetBook;
use crate::types::{OrderId, Price, Qty, Side, UserId};

#[derive(Debug, Clone)]
pub struct Incoming {
    pub order_id: OrderId,
    pub user_id: UserId,
    pub side: Side,
    pub price: Price,
    pub remaining: Qty,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Fill {
    pub maker_order_id: OrderId,
    pub maker_user_id: UserId,
    /// Always the maker's resting price.
    pub price: Price,
    pub qty: Qty,
    pub maker_remaining_after: Qty,
}

#[derive(Debug, Clone)]
pub struct MatchResult {
    pub fills: Vec<Fill>,
    pub incoming_remaining: Qty,
    pub stp_hit: bool,
}

pub fn match_order(book: &mut AssetBook, incoming: &Incoming) -> MatchResult {
    let opposite = match incoming.side {
        Side::Buy => Side::Sell,
        Side::Sell => Side::Buy,
    };
    let mut remaining = incoming.remaining;
    let mut fills = Vec::new();
    let mut stp_hit = false;

    while remaining > 0 {
        let best = match incoming.side {
            Side::Buy => book.best_ask(),
            Side::Sell => book.best_bid(),
        };
        let Some(level_price) = best else { break };
        let crosses = match incoming.side {
            Side::Buy => level_price <= incoming.price,
            Side::Sell => level_price >= incoming.price,
        };
        if !crosses {
            break;
        }
        // None means the level held only tombstones and was deleted: re-read the best price.
        let Some(maker_id) = book.front_live(opposite, level_price) else {
            continue;
        };
        let (maker_user, maker_rem) = {
            let m = book
                .get(&maker_id)
                .expect("front_live returned an id missing from the index");
            (m.user_id.clone(), m.remaining)
        };
        if maker_user == incoming.user_id {
            stp_hit = true;
            break;
        }
        let qty = remaining.min(maker_rem);
        book.reduce_maker(&maker_id, qty);
        remaining -= qty;
        fills.push(Fill {
            maker_order_id: maker_id,
            maker_user_id: maker_user,
            price: level_price,
            qty,
            maker_remaining_after: maker_rem - qty,
        });
    }

    MatchResult {
        fills,
        incoming_remaining: remaining,
        stp_hit,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::book::RestingOrder;
    use crate::testutil::*;

    fn book() -> AssetBook {
        AssetBook::new(asset("TEST-A"), cfg(1, 1, 1000))
    }

    fn rest(b: &mut AssetBook, id: u128, u: &str, side: Side, price: Price, qty: Qty) {
        b.insert_resting(RestingOrder {
            order_id: oid(id),
            user_id: user(u),
            side,
            price,
            remaining: qty,
            accept_seq: id as u64,
        });
    }

    fn inc(id: u128, u: &str, side: Side, price: Price, qty: Qty) -> Incoming {
        Incoming {
            order_id: oid(id),
            user_id: user(u),
            side,
            price,
            remaining: qty,
        }
    }

    fn summary(r: &MatchResult) -> Vec<(OrderId, Qty, Price)> {
        r.fills
            .iter()
            .map(|f| (f.maker_order_id, f.qty, f.price))
            .collect()
    }

    #[test]
    fn s02_full_match() {
        let mut b = book();
        rest(&mut b, 1, "U1", Side::Sell, 100, 5);
        let r = match_order(&mut b, &inc(2, "U2", Side::Buy, 100, 5));
        assert_eq!(summary(&r), vec![(oid(1), 5, 100)]);
        assert_eq!(r.incoming_remaining, 0);
        assert!(!r.stp_hit);
        assert_eq!(b.best_ask(), None);
    }

    #[test]
    fn s03_incoming_larger_than_maker() {
        let mut b = book();
        rest(&mut b, 1, "U1", Side::Sell, 100, 3);
        let r = match_order(&mut b, &inc(2, "U2", Side::Buy, 100, 5));
        assert_eq!(r.incoming_remaining, 2);
        assert_eq!(r.fills[0].maker_remaining_after, 0);
    }

    #[test]
    fn s04_maker_larger_than_incoming() {
        let mut b = book();
        rest(&mut b, 1, "U1", Side::Sell, 100, 5);
        let r = match_order(&mut b, &inc(2, "U2", Side::Buy, 100, 3));
        assert_eq!(r.incoming_remaining, 0);
        assert_eq!(r.fills[0].maker_remaining_after, 2);
        assert_eq!(b.depth(Side::Sell, 5), vec![(100, 2, 1)]);
    }

    #[test]
    fn s05_walks_levels_in_price_order_and_stops_at_limit() {
        let mut b = book();
        rest(&mut b, 1, "U1", Side::Sell, 100, 2);
        rest(&mut b, 3, "U3", Side::Sell, 101, 2);
        rest(&mut b, 4, "U4", Side::Sell, 102, 2);
        let r = match_order(&mut b, &inc(2, "U2", Side::Buy, 101, 5));
        assert_eq!(summary(&r), vec![(oid(1), 2, 100), (oid(3), 2, 101)]);
        assert_eq!(r.incoming_remaining, 1);
        assert_eq!(b.depth(Side::Sell, 5), vec![(102, 2, 1)]);
    }

    #[test]
    fn s06_fifo_within_level() {
        let mut b = book();
        rest(&mut b, 1, "U1", Side::Sell, 100, 2);
        rest(&mut b, 3, "U3", Side::Sell, 100, 2);
        let r = match_order(&mut b, &inc(2, "U2", Side::Buy, 100, 3));
        assert_eq!(summary(&r), vec![(oid(1), 2, 100), (oid(3), 1, 100)]);
        assert_eq!(b.front_live(Side::Sell, 100), Some(oid(3)));
        assert_eq!(b.get(&oid(3)).unwrap().remaining, 1);
    }

    #[test]
    fn s07_price_priority_beats_time() {
        let mut b = book();
        rest(&mut b, 1, "U1", Side::Sell, 101, 2);
        rest(&mut b, 3, "U3", Side::Sell, 100, 2);
        let r = match_order(&mut b, &inc(2, "U2", Side::Buy, 101, 3));
        assert_eq!(summary(&r), vec![(oid(3), 2, 100), (oid(1), 1, 101)]);
    }

    #[test]
    fn s08_trade_price_is_maker_price() {
        let mut b = book();
        rest(&mut b, 1, "U1", Side::Sell, 100, 2);
        let r = match_order(&mut b, &inc(2, "U2", Side::Buy, 105, 2));
        assert_eq!(r.fills[0].price, 100);
    }

    #[test]
    fn sell_side_matches_best_bid_first() {
        let mut b = book();
        rest(&mut b, 1, "U1", Side::Buy, 99, 2);
        rest(&mut b, 3, "U3", Side::Buy, 100, 2);
        let r = match_order(&mut b, &inc(2, "U2", Side::Sell, 99, 3));
        assert_eq!(summary(&r), vec![(oid(3), 2, 100), (oid(1), 1, 99)]);
    }

    #[test]
    fn no_cross_no_fill() {
        let mut b = book();
        rest(&mut b, 1, "U1", Side::Sell, 101, 2);
        let r = match_order(&mut b, &inc(2, "U2", Side::Buy, 100, 2));
        assert!(r.fills.is_empty());
        assert_eq!(r.incoming_remaining, 2);
    }

    #[test]
    fn s17_self_trade_stops_immediately() {
        let mut b = book();
        rest(&mut b, 1, "U1", Side::Sell, 100, 5);
        let r = match_order(&mut b, &inc(2, "U1", Side::Buy, 100, 5));
        assert!(r.stp_hit);
        assert!(r.fills.is_empty());
        assert_eq!(r.incoming_remaining, 5);
        assert_eq!(b.get(&oid(1)).unwrap().remaining, 5);
    }

    #[test]
    fn s18_self_trade_keeps_earlier_fills() {
        let mut b = book();
        rest(&mut b, 1, "U3", Side::Sell, 100, 2);
        rest(&mut b, 3, "U1", Side::Sell, 101, 2);
        let r = match_order(&mut b, &inc(2, "U1", Side::Buy, 101, 5));
        assert_eq!(summary(&r), vec![(oid(1), 2, 100)]);
        assert!(r.stp_hit);
        assert_eq!(r.incoming_remaining, 3);
        assert_eq!(b.get(&oid(3)).unwrap().remaining, 2);
    }

    #[test]
    fn s23_skips_tombstones() {
        let mut b = book();
        for (id, u) in [(1u128, "U1"), (2, "U2"), (3, "U3"), (4, "U4")] {
            rest(&mut b, id, u, Side::Buy, 100, 1);
        }
        b.remove(&oid(2)).unwrap();
        b.remove(&oid(3)).unwrap();
        let r = match_order(&mut b, &inc(5, "U5", Side::Sell, 100, 3));
        assert_eq!(summary(&r), vec![(oid(1), 1, 100), (oid(4), 1, 100)]);
        assert_eq!(r.incoming_remaining, 1);
        assert_eq!(b.best_bid(), None);
        b.check_invariants().unwrap();
    }
}
