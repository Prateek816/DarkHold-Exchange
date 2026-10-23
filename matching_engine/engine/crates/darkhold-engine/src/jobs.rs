use std::time::Instant;

use darkhold_core::{AssetId, Command, CommandReply, OrderId};
use serde_json::Value;
use tokio::sync::oneshot;

pub enum QueryKind {
    Book { asset: AssetId, depth: usize },
    Order { order_id: OrderId },
    OpenOrders { asset: Option<AssetId> },
}

pub enum QueryReply {
    Book(Value),
    Order(Value),
    OpenOrders(Value),
    NotFound,
}

pub enum Job {
    Command {
        cmd: Command,
        enqueued_at: Instant,
        reply_tx: oneshot::Sender<CommandReply>,
    },
    Query {
        kind: QueryKind,
        enqueued_at: Instant,
        reply_tx: oneshot::Sender<QueryReply>,
    },
    Shutdown {
        ack_tx: oneshot::Sender<()>,
    },
}
