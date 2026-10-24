//! Per-order record backing dedup, cancel replies and queries.

use crate::command::SubmitOrder;
use crate::types::{
    AssetId, CancelEventReason, OrderId, OrderStatus, OrderType, Price, Qty, RejectCode, Seq, Side,
    Tif, UserId,
};
use crate::view::OrderView;

#[derive(Debug, Clone)]
pub struct Outcome {
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
    pub fingerprint: u64,
    pub first_seq: Option<Seq>,
    pub submit_last_seq: Seq,
}

impl Outcome {
    pub fn open(cmd: &SubmitOrder, fingerprint: u64, first_seq: Seq) -> Self {
        Self {
            order_id: cmd.order_id,
            asset: cmd.asset.clone(),
            user_id: cmd.user_id.clone(),
            side: cmd.side,
            order_type: cmd.order_type,
            tif: cmd.tif,
            price: cmd.price,
            qty: cmd.qty,
            filled_qty: 0,
            remaining_qty: cmd.qty,
            status: OrderStatus::Open,
            reject_code: None,
            cancel_reason: None,
            fingerprint,
            first_seq: Some(first_seq),
            submit_last_seq: first_seq,
        }
    }

    pub fn rejected(cmd: &SubmitOrder, code: RejectCode, fingerprint: u64, seq: Seq) -> Self {
        let mut o = Self::open(cmd, fingerprint, seq);
        o.status = OrderStatus::Rejected;
        o.reject_code = Some(code);
        o
    }

    /// Records a fill. Violating `qty <= remaining_qty` is an engine bug, so it aborts.
    pub fn apply_fill(&mut self, qty: Qty) {
        assert!(qty > 0 && qty <= self.remaining_qty, "apply_fill: bad qty");
        self.filled_qty += qty;
        self.remaining_qty -= qty;
        self.status = if self.remaining_qty == 0 {
            OrderStatus::Filled
        } else {
            OrderStatus::PartiallyFilled
        };
    }

    /// `remaining_qty` keeps the unfilled amount at cancel time.
    pub fn mark_canceled(&mut self, reason: CancelEventReason) {
        self.status = OrderStatus::Canceled;
        self.cancel_reason = Some(reason);
    }

    pub fn to_view(&self, epoch: &str, as_of_seq: Seq) -> OrderView {
        OrderView::from_outcome(self, epoch, as_of_seq)
    }

    pub fn check(&self) -> Result<(), String> {
        if self.filled_qty + self.remaining_qty != self.qty {
            return Err(format!(
                "order {:?}: filled + remaining != qty",
                self.order_id
            ));
        }
        let ok = match self.status {
            OrderStatus::Open => self.filled_qty == 0,
            OrderStatus::PartiallyFilled => self.filled_qty > 0 && self.remaining_qty > 0,
            OrderStatus::Filled => self.remaining_qty == 0,
            OrderStatus::Canceled => self.cancel_reason.is_some(),
            OrderStatus::Rejected => self.filled_qty == 0 && self.reject_code.is_some(),
        };
        if ok {
            Ok(())
        } else {
            Err(format!(
                "order {:?}: inconsistent status {:?}",
                self.order_id, self.status
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::*;

    fn open10() -> Outcome {
        Outcome::open(&limit(1, "TEST-A", "U1", Side::Buy, 10, 100), 7, 2)
    }

    #[test]
    fn fill_transitions() {
        let mut o = open10();
        o.check().unwrap();
        o.apply_fill(4);
        assert_eq!(
            (o.status, o.filled_qty, o.remaining_qty),
            (OrderStatus::PartiallyFilled, 4, 6)
        );
        o.check().unwrap();
        o.apply_fill(6);
        assert_eq!(
            (o.status, o.filled_qty, o.remaining_qty),
            (OrderStatus::Filled, 10, 0)
        );
        o.check().unwrap();
    }

    #[test]
    fn cancel_keeps_remaining() {
        let mut o = open10();
        o.apply_fill(3);
        o.mark_canceled(CancelEventReason::IocRemainder);
        assert_eq!(
            (o.status, o.filled_qty, o.remaining_qty),
            (OrderStatus::Canceled, 3, 7)
        );
        o.check().unwrap();
    }

    #[test]
    fn rejected_shape() {
        let o = Outcome::rejected(
            &limit(1, "TEST-A", "U1", Side::Buy, 10, 100),
            RejectCode::InvalidQty,
            7,
            5,
        );
        assert_eq!(
            (o.status, o.filled_qty, o.remaining_qty),
            (OrderStatus::Rejected, 0, 10)
        );
        assert_eq!(o.first_seq, Some(5));
        o.check().unwrap();
    }

    #[test]
    #[should_panic]
    fn overfill_aborts() {
        let mut o = open10();
        o.apply_fill(11);
    }
}
