//! Read models (Sections 3.4 to 3.6). `ts` on book snapshots is added by the shell.

use serde::Serialize;

use crate::book::{AssetBook, RestingOrder};
use crate::outcome::Outcome;
use crate::types::{
    AssetId, CancelEventReason, OrderId, OrderStatus, OrderType, Price, Qty, RejectCode, Seq, Side,
    Tif, UserId,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct LevelView {
    pub price: Price,
    pub qty: Qty,
    pub orders: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct BookView {
    pub asset: AssetId,
    pub engine_epoch: String,
    pub as_of_seq: Seq,
    pub depth: usize,
    pub bids: Vec<LevelView>,
    pub asks: Vec<LevelView>,
    pub best_bid: Option<Price>,
    pub best_ask: Option<Price>,
    pub spread: Option<Price>,
}

impl BookView {
    pub fn build(book: &AssetBook, depth: usize, epoch: &str, as_of_seq: Seq) -> Self {
        let lv = |(price, qty, orders): (Price, Qty, usize)| LevelView {
            price,
            qty,
            orders: orders as u64,
        };
        let best_bid = book.best_bid();
        let best_ask = book.best_ask();
        let spread = match (best_bid, best_ask) {
            (Some(b), Some(a)) => a.checked_sub(b),
            _ => None,
        };
        Self {
            asset: book.asset.clone(),
            engine_epoch: epoch.to_string(),
            as_of_seq,
            depth,
            bids: book.depth(Side::Buy, depth).into_iter().map(lv).collect(),
            asks: book.depth(Side::Sell, depth).into_iter().map(lv).collect(),
            best_bid,
            best_ask,
            spread,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct OrderView {
    pub order_id: OrderId,
    pub asset: AssetId,
    pub user_id: UserId,
    pub side: Side,
    pub order_type: OrderType,
    pub tif: Tif,
    pub price: Price,
    pub qty: Qty,
    pub filled_qty: Qty,
    pub remaining_qty: Qty,
    pub status: OrderStatus,
    pub reject_code: Option<RejectCode>,
    pub cancel_reason: Option<CancelEventReason>,
    pub first_seq: Option<Seq>,
    pub engine_epoch: String,
    pub as_of_seq: Seq,
}

impl OrderView {
    pub fn from_outcome(o: &Outcome, epoch: &str, as_of_seq: Seq) -> Self {
        Self {
            order_id: o.order_id,
            asset: o.asset.clone(),
            user_id: o.user_id.clone(),
            side: o.side,
            order_type: o.order_type,
            tif: o.tif,
            price: o.price,
            qty: o.qty,
            filled_qty: o.filled_qty,
            remaining_qty: o.remaining_qty,
            status: o.status,
            reject_code: o.reject_code,
            cancel_reason: o.cancel_reason,
            first_seq: o.first_seq,
            engine_epoch: epoch.to_string(),
            as_of_seq,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct OpenOrderView {
    pub order_id: OrderId,
    pub asset: AssetId,
    pub user_id: UserId,
    pub side: Side,
    pub price: Price,
    pub qty: Qty,
    pub filled_qty: Qty,
    pub remaining_qty: Qty,
    pub accept_seq: Seq,
}

impl OpenOrderView {
    pub fn from_parts(resting: &RestingOrder, outcome: &Outcome) -> Self {
        Self {
            order_id: resting.order_id,
            asset: outcome.asset.clone(),
            user_id: resting.user_id.clone(),
            side: resting.side,
            price: resting.price,
            qty: outcome.qty,
            filled_qty: outcome.filled_qty,
            remaining_qty: resting.remaining,
            accept_seq: resting.accept_seq,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct OpenOrdersView {
    pub engine_epoch: String,
    pub as_of_seq: Seq,
    pub orders: Vec<OpenOrderView>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::*;

    fn rest(b: &mut AssetBook, id: u128, side: Side, price: Price, qty: Qty) {
        b.insert_resting(RestingOrder {
            order_id: oid(id),
            user_id: user("U1"),
            side,
            price,
            remaining: qty,
            accept_seq: id as u64,
        });
    }

    #[test]
    fn empty_book() {
        let b = AssetBook::new(asset("TEST-A"), cfg(1, 1, 1000));
        let v = BookView::build(&b, 15, "e-test0001", 1);
        assert!(v.bids.is_empty() && v.asks.is_empty());
        assert_eq!((v.best_bid, v.best_ask, v.spread), (None, None, None));
        let j = serde_json::to_value(&v).unwrap();
        assert!(j["best_bid"].is_null() && j["spread"].is_null());
    }

    #[test]
    fn one_sided_book_has_no_spread() {
        let mut b = AssetBook::new(asset("TEST-A"), cfg(1, 1, 1000));
        rest(&mut b, 1, Side::Buy, 100, 7);
        let v = BookView::build(&b, 15, "e-test0001", 2);
        assert_eq!(v.best_bid, Some(100));
        assert_eq!((v.best_ask, v.spread), (None, None));
        assert_eq!(
            v.bids,
            vec![LevelView {
                price: 100,
                qty: 7,
                orders: 1
            }]
        );
    }

    #[test]
    fn depth_truncates_and_orders() {
        let mut b = AssetBook::new(asset("TEST-A"), cfg(1, 1, 1000));
        for (i, p) in [97u64, 99, 98].into_iter().enumerate() {
            rest(&mut b, 1 + i as u128, Side::Buy, p, 1);
        }
        for (i, p) in [103u64, 101, 102].into_iter().enumerate() {
            rest(&mut b, 10 + i as u128, Side::Sell, p, 1);
        }
        let v = BookView::build(&b, 2, "e-test0001", 9);
        let bp: Vec<_> = v.bids.iter().map(|l| l.price).collect();
        let ap: Vec<_> = v.asks.iter().map(|l| l.price).collect();
        assert_eq!(bp, vec![99, 98]);
        assert_eq!(ap, vec![101, 102]);
        assert_eq!(v.spread, Some(2));
        assert_eq!(v.depth, 2);
    }
}
