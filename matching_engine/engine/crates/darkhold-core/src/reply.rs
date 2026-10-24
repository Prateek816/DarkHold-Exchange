//! `CommandReply` (spec Section 3.2): the body of the HTTP 200 response to `POST /v1/commands`.

use serde::Serialize;

use crate::types::{
    AdminReplyStatus, AssetId, CancelReplyStatus, OrderId, Qty, RejectCode, Seq, SubmitReplyStatus,
};

/// Status of a reply, flattened to a single wire string regardless of command kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(untagged)]
pub enum ReplyStatus {
    Submit(SubmitReplyStatus),
    Cancel(CancelReplyStatus),
    Admin(AdminReplyStatus),
}

/// Absent optional fields are omitted. `seq` (null when none), `last_seq`, `engine_epoch`, `duplicate` always appear.
/// Fields are public so the engine can mark a stored reply as a duplicate.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct CommandReply {
    pub status: ReplyStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub order_id: Option<OrderId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub asset: Option<AssetId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<RejectCode>,
    pub seq: Option<Seq>,
    pub last_seq: Seq,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remaining_qty: Option<Qty>,
    pub engine_epoch: String,
    pub duplicate: bool,
}

impl CommandReply {
    pub fn submit_accepted(order_id: OrderId, seq: Seq, last_seq: Seq, engine_epoch: &str) -> Self {
        Self {
            status: ReplyStatus::Submit(SubmitReplyStatus::Accepted),
            order_id: Some(order_id),
            asset: None,
            code: None,
            seq: Some(seq),
            last_seq,
            remaining_qty: None,
            engine_epoch: engine_epoch.to_owned(),
            duplicate: false,
        }
    }

    /// `seq` is `None` for rejections that emit no event (for example `ORDER_ID_REUSED`).
    pub fn submit_rejected(
        order_id: OrderId,
        code: RejectCode,
        seq: Option<Seq>,
        last_seq: Seq,
        engine_epoch: &str,
    ) -> Self {
        Self {
            status: ReplyStatus::Submit(SubmitReplyStatus::Rejected),
            order_id: Some(order_id),
            asset: None,
            code: Some(code),
            seq,
            last_seq,
            remaining_qty: None,
            engine_epoch: engine_epoch.to_owned(),
            duplicate: false,
        }
    }

    /// `remaining_qty` is present only for status `CANCELED`; `duplicate` is true for repeated cancels.
    pub fn cancel_result(
        status: CancelReplyStatus,
        order_id: OrderId,
        remaining_qty: Option<Qty>,
        seq: Option<Seq>,
        last_seq: Seq,
        duplicate: bool,
        engine_epoch: &str,
    ) -> Self {
        Self {
            status: ReplyStatus::Cancel(status),
            order_id: Some(order_id),
            asset: None,
            code: None,
            seq,
            last_seq,
            remaining_qty,
            engine_epoch: engine_epoch.to_owned(),
            duplicate,
        }
    }

    pub fn admin_result(
        status: AdminReplyStatus,
        asset: AssetId,
        code: Option<RejectCode>,
        seq: Option<Seq>,
        last_seq: Seq,
        engine_epoch: &str,
    ) -> Self {
        Self {
            status: ReplyStatus::Admin(status),
            order_id: None,
            asset: Some(asset),
            code,
            seq,
            last_seq,
            remaining_qty: None,
            engine_epoch: engine_epoch.to_owned(),
            duplicate: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value};

    const A: &str = "0000000a-0000-4000-8000-00000000000a";

    fn oid() -> OrderId {
        OrderId::parse(A).unwrap()
    }
    fn v(r: &CommandReply) -> Value {
        serde_json::to_value(r).unwrap()
    }

    #[test]
    fn submit_accepted_shape() {
        let r = CommandReply::submit_accepted(oid(), 3, 6, "e-test0001");
        assert_eq!(
            v(&r),
            json!({"status":"ACCEPTED","order_id":A,"seq":3,"last_seq":6,"engine_epoch":"e-test0001","duplicate":false})
        );
    }

    #[test]
    fn submit_rejected_with_and_without_seq() {
        let r =
            CommandReply::submit_rejected(oid(), RejectCode::InvalidQty, Some(7), 7, "e-test0001");
        assert_eq!(
            v(&r),
            json!({"status":"REJECTED","order_id":A,"code":"INVALID_QTY","seq":7,"last_seq":7,"engine_epoch":"e-test0001","duplicate":false})
        );
        let r =
            CommandReply::submit_rejected(oid(), RejectCode::OrderIdReused, None, 2, "e-test0001");
        assert_eq!(v(&r)["seq"], Value::Null);
        assert!(
            v(&r).as_object().unwrap().contains_key("seq"),
            "seq must be present as null"
        );
    }

    #[test]
    fn cancel_shapes() {
        let r = CommandReply::cancel_result(
            CancelReplyStatus::Canceled,
            oid(),
            Some(5),
            Some(3),
            3,
            false,
            "e-test0001",
        );
        assert_eq!(
            v(&r),
            json!({"status":"CANCELED","order_id":A,"seq":3,"last_seq":3,"remaining_qty":5,"engine_epoch":"e-test0001","duplicate":false})
        );
        let r = CommandReply::cancel_result(
            CancelReplyStatus::AlreadyFilled,
            oid(),
            None,
            None,
            6,
            false,
            "e-test0001",
        );
        assert_eq!(
            v(&r),
            json!({"status":"ALREADY_FILLED","order_id":A,"seq":null,"last_seq":6,"engine_epoch":"e-test0001","duplicate":false})
        );
        let r = CommandReply::cancel_result(
            CancelReplyStatus::AlreadyCanceled,
            oid(),
            None,
            None,
            3,
            true,
            "e-test0001",
        );
        assert_eq!(v(&r)["duplicate"], true);
        assert_eq!(v(&r)["status"], "ALREADY_CANCELED");
    }

    #[test]
    fn admin_shapes_omit_order_id_and_include_asset() {
        let a = AssetId::parse("TEST-A").unwrap();
        let r = CommandReply::admin_result(
            AdminReplyStatus::Ok,
            a.clone(),
            None,
            Some(1),
            1,
            "e-test0001",
        );
        assert_eq!(
            v(&r),
            json!({"status":"OK","asset":"TEST-A","seq":1,"last_seq":1,"engine_epoch":"e-test0001","duplicate":false})
        );
        let r = CommandReply::admin_result(
            AdminReplyStatus::Noop,
            a.clone(),
            None,
            None,
            4,
            "e-test0001",
        );
        assert_eq!(v(&r)["status"], "NOOP");
        let r = CommandReply::admin_result(
            AdminReplyStatus::Rejected,
            a,
            Some(RejectCode::UnknownAsset),
            None,
            4,
            "e-test0001",
        );
        assert_eq!(v(&r)["code"], "UNKNOWN_ASSET");
        assert!(v(&r).get("order_id").is_none());
    }

    #[test]
    fn absent_optionals_are_omitted() {
        let r = CommandReply::submit_accepted(oid(), 1, 1, "e-test0001");
        let obj = v(&r);
        for k in ["asset", "code", "remaining_qty"] {
            assert!(obj.get(k).is_none(), "{k} should be omitted");
        }
    }

    #[test]
    fn duplicate_flag_can_be_set_on_a_stored_reply() {
        let mut r = CommandReply::submit_accepted(oid(), 2, 2, "e-test0001");
        r.duplicate = true;
        assert_eq!(v(&r)["duplicate"], true);
    }
}
