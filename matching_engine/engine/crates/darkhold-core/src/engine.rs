//! The deterministic state machine. Live processing and WAL replay both call `Engine::process`.
//! No clocks, no randomness, no I/O. `ts` and the epoch are inputs (rules D1 to D8).

use std::collections::{BTreeMap, BTreeSet, HashMap};

use crate::book::{AssetBook, RestingOrder};
use crate::command::{CancelOrder, Command, ConfigureAsset, SubmitOrder};
use crate::config::{validate_config, AssetConfig};
use crate::event::{EventBody, EventEnvelope};
use crate::fingerprint::fingerprint;
use crate::matcher::{match_order, Incoming};
use crate::outcome::Outcome;
use crate::reply::{CommandReply, ReplyStatus};
use crate::types::{
    AdminReplyStatus, AssetId, AssetStatus, CancelCommandReason, CancelEventReason,
    CancelReplyStatus, OrderId, OrderStatus, RejectCode, Seq, Side, SubmitReplyStatus, Tif, TsMs,
};
use crate::validate::validate_submit;
use crate::view::{BookView, OpenOrderView, OpenOrdersView, OrderView};

#[derive(Debug, Clone)]
pub struct Processed {
    pub ts_used: TsMs,
    pub events: Vec<EventEnvelope>,
    pub reply: CommandReply,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BookStats {
    pub asset: AssetId,
    pub bids_levels: usize,
    pub asks_levels: usize,
    pub resting_orders: usize,
}

pub struct Engine {
    epoch: String,
    next_seq: Seq,
    last_ts: TsMs,
    assets: BTreeMap<AssetId, AssetBook>,
    outcomes: HashMap<OrderId, Outcome>, // point lookups only (rule D5)
    dirty: BTreeSet<AssetId>,
}

fn event_reason(r: CancelCommandReason) -> CancelEventReason {
    match r {
        CancelCommandReason::User => CancelEventReason::User,
        CancelCommandReason::PolicyBreach => CancelEventReason::PolicyBreach,
        CancelCommandReason::Admin => CancelEventReason::Admin,
    }
}

impl Engine {
    pub fn new(epoch: impl Into<String>) -> Self {
        Self {
            epoch: epoch.into(),
            next_seq: 1,
            last_ts: 0,
            assets: BTreeMap::new(),
            outcomes: HashMap::new(),
            dirty: BTreeSet::new(),
        }
    }

    // ---------- public read API ----------

    pub fn epoch(&self) -> &str {
        &self.epoch
    }

    pub fn last_seq(&self) -> Seq {
        self.next_seq - 1
    }

    pub fn outcomes_count(&self) -> usize {
        self.outcomes.len()
    }

    pub fn outcomes_len(&self) -> usize {
        self.outcomes.len()
    }

    pub fn asset_statuses(&self) -> Vec<(AssetId, AssetStatus)> {
        self.assets
            .iter()
            .map(|(a, b)| (a.clone(), b.config.status))
            .collect()
    }

    pub fn book_stats(&self) -> Vec<BookStats> {
        self.assets
            .iter()
            .map(|(a, b)| {
                let (bids_levels, asks_levels) = b.level_counts();
                BookStats {
                    asset: a.clone(),
                    bids_levels,
                    asks_levels,
                    resting_orders: b.resting_count(),
                }
            })
            .collect()
    }

    pub fn book_view(&self, asset: &AssetId, depth: usize) -> Option<BookView> {
        self.assets
            .get(asset)
            .map(|b| BookView::build(b, depth, &self.epoch, self.last_seq()))
    }

    pub fn order_view(&self, id: &OrderId) -> Option<OrderView> {
        self.outcomes
            .get(id)
            .map(|o| o.to_view(&self.epoch, self.last_seq()))
    }

    /// Sorted by asset ascending, then `accept_seq` ascending.
    pub fn open_orders(&self, filter: Option<&AssetId>) -> OpenOrdersView {
        let mut orders = Vec::new();
        for (asset, book) in &self.assets {
            if filter.is_some_and(|f| f != asset) {
                continue;
            }
            for r in book.open_orders() {
                let outcome = self
                    .outcomes
                    .get(&r.order_id)
                    .expect("resting order without outcome");
                orders.push(OpenOrderView::from_parts(&r, outcome));
            }
        }
        OpenOrdersView {
            engine_epoch: self.epoch.clone(),
            as_of_seq: self.last_seq(),
            orders,
        }
    }

    /// Returns and clears the dirty set, sorted.
    pub fn take_dirty_assets(&mut self) -> Vec<AssetId> {
        std::mem::take(&mut self.dirty).into_iter().collect()
    }

    pub fn check_invariants(&self) -> Result<(), String> {
        for (a, b) in &self.assets {
            b.check_invariants()
                .map_err(|e| format!("book {}: {e}", a.as_str()))?;
        }
        let mut live = 0usize;
        for o in self.outcomes.values() {
            o.check()?;
            let resting = self.assets.get(&o.asset).and_then(|b| b.get(&o.order_id));
            match o.status {
                OrderStatus::Open | OrderStatus::PartiallyFilled => {
                    live += 1;
                    match resting {
                        Some(r) if r.remaining == o.remaining_qty => {}
                        _ => {
                            return Err(format!(
                                "order {:?} is {:?} but book disagrees",
                                o.order_id, o.status
                            ))
                        }
                    }
                }
                _ => {
                    if resting.is_some() {
                        return Err(format!(
                            "order {:?} is {:?} but still rests",
                            o.order_id, o.status
                        ));
                    }
                }
            }
        }
        let resting_total: usize = self.assets.values().map(|b| b.resting_count()).sum();
        if resting_total != live {
            return Err(format!(
                "{resting_total} resting orders but {live} open outcomes"
            ));
        }
        Ok(())
    }

    // ---------- the one entry point ----------

    pub fn process(&mut self, command: Command, ts: TsMs) -> Processed {
        let ts_used = ts.max(self.last_ts);
        self.last_ts = ts_used;
        let (events, reply) = match command {
            Command::SubmitOrder(c) => self.submit(c, ts_used),
            Command::CancelOrder(c) => self.cancel(c, ts_used),
            Command::ConfigureAsset(c) => self.configure(c, ts_used),
            Command::HaltAsset(c) => self.set_status(&c.asset, AssetStatus::Halted, ts_used),
            Command::ResumeAsset(c) => self.set_status(&c.asset, AssetStatus::Active, ts_used),
        };
        Processed {
            ts_used,
            events,
            reply,
        }
    }

    // ---------- helpers ----------

    fn emit(
        &mut self,
        out: &mut Vec<EventEnvelope>,
        ts: TsMs,
        asset: &AssetId,
        body: EventBody,
    ) -> Seq {
        let seq = self.next_seq;
        self.next_seq += 1;
        out.push(EventEnvelope {
            engine_epoch: self.epoch.clone(),
            seq,
            ts,
            asset: asset.clone(),
            body,
        });
        seq
    }

    /// Blank reply at the current stream position. Callers refresh `last_seq` after emitting.
    fn reply_base(&self, status: ReplyStatus) -> CommandReply {
        CommandReply {
            status,
            order_id: None,
            asset: None,
            code: None,
            seq: None,
            last_seq: self.last_seq(),
            remaining_qty: None,
            engine_epoch: self.epoch.clone(),
            duplicate: false,
        }
    }

    // ---------- submit ----------

    fn submit(&mut self, cmd: SubmitOrder, ts: TsMs) -> (Vec<EventEnvelope>, CommandReply) {
        let mut events = Vec::new();
        let fp = fingerprint(&cmd);

        // 1. Dedup
        if let Some(existing) = self.outcomes.get(&cmd.order_id) {
            if existing.fingerprint == fp {
                let status = if existing.status == OrderStatus::Rejected {
                    ReplyStatus::Submit(SubmitReplyStatus::Rejected)
                } else {
                    ReplyStatus::Submit(SubmitReplyStatus::Accepted)
                };
                let mut r = self.reply_base(status);
                r.order_id = Some(cmd.order_id);
                r.code = existing.reject_code;
                r.seq = existing.first_seq;
                r.last_seq = existing.submit_last_seq;
                r.duplicate = true;
                return (events, r);
            }
            let mut r = self.reply_base(ReplyStatus::Submit(SubmitReplyStatus::Rejected));
            r.order_id = Some(cmd.order_id);
            r.code = Some(RejectCode::OrderIdReused);
            return (events, r);
        }

        // 2. Validate
        let verdict = validate_submit(self.assets.get(&cmd.asset).map(|b| &b.config), &cmd);
        if let Err(code) = verdict {
            let seq = self.emit(
                &mut events,
                ts,
                &cmd.asset,
                EventBody::OrderRejected {
                    order_id: cmd.order_id,
                    user_id: cmd.user_id.clone(),
                    code,
                },
            );
            self.outcomes
                .insert(cmd.order_id, Outcome::rejected(&cmd, code, fp, seq));
            let mut r = self.reply_base(ReplyStatus::Submit(SubmitReplyStatus::Rejected));
            r.order_id = Some(cmd.order_id);
            r.code = Some(code);
            r.seq = Some(seq);
            return (events, r);
        }

        // 3. Accept
        let first_seq = self.emit(
            &mut events,
            ts,
            &cmd.asset,
            EventBody::OrderAccepted {
                order_id: cmd.order_id,
                user_id: cmd.user_id.clone(),
                side: cmd.side,
                order_type: cmd.order_type,
                tif: cmd.tif,
                price: cmd.price,
                qty: cmd.qty,
            },
        );
        self.outcomes
            .insert(cmd.order_id, Outcome::open(&cmd, fp, first_seq));

        // 4. Match
        let incoming = Incoming {
            order_id: cmd.order_id,
            user_id: cmd.user_id.clone(),
            side: cmd.side,
            price: cmd.price,
            remaining: cmd.qty,
        };
        let result = {
            let book = self
                .assets
                .get_mut(&cmd.asset)
                .expect("validated asset must exist");
            match_order(book, &incoming)
        };

        // 5. Fills: TradeExecuted, then the maker's status event
        for f in &result.fills {
            let taker_rem = {
                let t = self
                    .outcomes
                    .get_mut(&cmd.order_id)
                    .expect("taker outcome exists");
                t.apply_fill(f.qty);
                t.remaining_qty
            };
            let (maker_rem, maker_filled) = {
                let m = self
                    .outcomes
                    .get_mut(&f.maker_order_id)
                    .expect("maker outcome exists");
                m.apply_fill(f.qty);
                (m.remaining_qty, m.filled_qty)
            };
            debug_assert_eq!(maker_rem, f.maker_remaining_after);

            let (
                buy_order_id,
                sell_order_id,
                buy_user_id,
                sell_user_id,
                buy_remaining,
                sell_remaining,
            ) = match cmd.side {
                Side::Buy => (
                    cmd.order_id,
                    f.maker_order_id,
                    cmd.user_id.clone(),
                    f.maker_user_id.clone(),
                    taker_rem,
                    maker_rem,
                ),
                Side::Sell => (
                    f.maker_order_id,
                    cmd.order_id,
                    f.maker_user_id.clone(),
                    cmd.user_id.clone(),
                    maker_rem,
                    taker_rem,
                ),
            };
            let trade_id = format!("{}:{}", self.epoch, self.next_seq);
            self.emit(
                &mut events,
                ts,
                &cmd.asset,
                EventBody::TradeExecuted {
                    trade_id,
                    price: f.price,
                    qty: f.qty,
                    buy_order_id,
                    sell_order_id,
                    buy_user_id,
                    sell_user_id,
                    maker_order_id: f.maker_order_id,
                    taker_order_id: cmd.order_id,
                    taker_side: cmd.side,
                    buy_remaining,
                    sell_remaining,
                },
            );
            let maker_body = if maker_rem == 0 {
                EventBody::OrderFilled {
                    order_id: f.maker_order_id,
                    user_id: f.maker_user_id.clone(),
                    filled_qty: maker_filled,
                }
            } else {
                EventBody::OrderPartiallyFilled {
                    order_id: f.maker_order_id,
                    user_id: f.maker_user_id.clone(),
                    filled_qty: maker_filled,
                    remaining_qty: maker_rem,
                }
            };
            self.emit(&mut events, ts, &cmd.asset, maker_body);
        }

        // 6. Taker disposition
        let (filled_qty, remaining) = {
            let t = &self.outcomes[&cmd.order_id];
            (t.filled_qty, t.remaining_qty)
        };
        debug_assert_eq!(remaining, result.incoming_remaining);

        if remaining == 0 {
            self.emit(
                &mut events,
                ts,
                &cmd.asset,
                EventBody::OrderFilled {
                    order_id: cmd.order_id,
                    user_id: cmd.user_id.clone(),
                    filled_qty,
                },
            );
        } else if result.stp_hit {
            self.cancel_remainder(
                &mut events,
                ts,
                &cmd,
                filled_qty,
                remaining,
                CancelEventReason::SelfTradePrevented,
            );
        } else if cmd.tif == Tif::Gtc {
            self.assets
                .get_mut(&cmd.asset)
                .expect("asset exists")
                .insert_resting(RestingOrder {
                    order_id: cmd.order_id,
                    user_id: cmd.user_id.clone(),
                    side: cmd.side,
                    price: cmd.price,
                    remaining,
                    accept_seq: first_seq,
                });
            if !result.fills.is_empty() {
                self.emit(
                    &mut events,
                    ts,
                    &cmd.asset,
                    EventBody::OrderPartiallyFilled {
                        order_id: cmd.order_id,
                        user_id: cmd.user_id.clone(),
                        filled_qty,
                        remaining_qty: remaining,
                    },
                );
            }
        } else {
            let reason = if result.fills.is_empty() {
                CancelEventReason::NoLiquidity
            } else {
                CancelEventReason::IocRemainder
            };
            self.cancel_remainder(&mut events, ts, &cmd, filled_qty, remaining, reason);
        }

        // 7. Stored reply fields
        let last = self.last_seq();
        self.outcomes
            .get_mut(&cmd.order_id)
            .expect("taker outcome exists")
            .submit_last_seq = last;

        // 8. Dirty
        self.dirty.insert(cmd.asset.clone());

        let mut r = self.reply_base(ReplyStatus::Submit(SubmitReplyStatus::Accepted));
        r.order_id = Some(cmd.order_id);
        r.seq = Some(first_seq);
        (events, r)
    }

    fn cancel_remainder(
        &mut self,
        events: &mut Vec<EventEnvelope>,
        ts: TsMs,
        cmd: &SubmitOrder,
        filled_qty: u64,
        remaining: u64,
        reason: CancelEventReason,
    ) {
        self.emit(
            events,
            ts,
            &cmd.asset,
            EventBody::OrderCanceled {
                order_id: cmd.order_id,
                user_id: cmd.user_id.clone(),
                filled_qty,
                remaining_qty: remaining,
                reason,
            },
        );
        self.outcomes
            .get_mut(&cmd.order_id)
            .expect("taker outcome exists")
            .mark_canceled(reason);
    }

    // ---------- cancel ----------

    fn cancel(&mut self, cmd: CancelOrder, ts: TsMs) -> (Vec<EventEnvelope>, CommandReply) {
        let mut events = Vec::new();
        let status = self.outcomes.get(&cmd.order_id).map(|o| o.status);
        let simple = |e: &Self, s: ReplyStatus, dup: bool| {
            let mut r = e.reply_base(s);
            r.order_id = Some(cmd.order_id);
            r.duplicate = dup;
            r
        };
        match status {
            None | Some(OrderStatus::Rejected) => (
                events,
                simple(
                    self,
                    ReplyStatus::Cancel(CancelReplyStatus::UnknownOrder),
                    false,
                ),
            ),
            Some(OrderStatus::Filled) => (
                events,
                simple(
                    self,
                    ReplyStatus::Cancel(CancelReplyStatus::AlreadyFilled),
                    false,
                ),
            ),
            Some(OrderStatus::Canceled) => (
                events,
                simple(
                    self,
                    ReplyStatus::Cancel(CancelReplyStatus::AlreadyCanceled),
                    true,
                ),
            ),
            Some(OrderStatus::Open) | Some(OrderStatus::PartiallyFilled) => {
                let (asset, user_id, filled_qty, remaining_qty) = {
                    let o = &self.outcomes[&cmd.order_id];
                    (
                        o.asset.clone(),
                        o.user_id.clone(),
                        o.filled_qty,
                        o.remaining_qty,
                    )
                };
                let removed = self
                    .assets
                    .get_mut(&asset)
                    .and_then(|b| b.remove(&cmd.order_id));
                assert!(removed.is_some(), "open outcome without resting order");
                let reason = event_reason(cmd.reason);
                let seq = self.emit(
                    &mut events,
                    ts,
                    &asset,
                    EventBody::OrderCanceled {
                        order_id: cmd.order_id,
                        user_id,
                        filled_qty,
                        remaining_qty,
                        reason,
                    },
                );
                self.outcomes
                    .get_mut(&cmd.order_id)
                    .expect("outcome exists")
                    .mark_canceled(reason);
                self.dirty.insert(asset);
                let mut r = self.reply_base(ReplyStatus::Cancel(CancelReplyStatus::Canceled));
                r.order_id = Some(cmd.order_id);
                r.remaining_qty = Some(remaining_qty);
                r.seq = Some(seq);
                (events, r)
            }
        }
    }

    // ---------- admin ----------

    fn configure(&mut self, c: ConfigureAsset, ts: TsMs) -> (Vec<EventEnvelope>, CommandReply) {
        let mut events = Vec::new();
        let cfg = AssetConfig {
            tick_size: c.tick_size,
            min_qty: c.min_qty,
            max_qty: c.max_qty,
            collar_max_price: c.collar_max_price,
            status: c.status,
        };
        let mut r = self.reply_base(ReplyStatus::Admin(AdminReplyStatus::Ok));
        r.asset = Some(c.asset.clone());
        if let Err(code) = validate_config(&cfg) {
            r.status = ReplyStatus::Admin(AdminReplyStatus::Rejected);
            r.code = Some(code);
            return (events, r);
        }
        match self.assets.get_mut(&c.asset) {
            Some(book) => book.config = cfg.clone(), // resting orders untouched
            None => {
                self.assets.insert(
                    c.asset.clone(),
                    AssetBook::new(c.asset.clone(), cfg.clone()),
                );
            }
        }
        let seq = self.emit(
            &mut events,
            ts,
            &c.asset,
            EventBody::AssetConfigured {
                tick_size: cfg.tick_size,
                min_qty: cfg.min_qty,
                max_qty: cfg.max_qty,
                collar_max_price: cfg.collar_max_price,
                status: cfg.status,
            },
        );
        self.dirty.insert(c.asset);
        r.seq = Some(seq);
        r.last_seq = self.last_seq();
        (events, r)
    }

    fn set_status(
        &mut self,
        asset: &AssetId,
        target: AssetStatus,
        ts: TsMs,
    ) -> (Vec<EventEnvelope>, CommandReply) {
        let mut events = Vec::new();
        let mut r = self.reply_base(ReplyStatus::Admin(AdminReplyStatus::Ok));
        r.asset = Some(asset.clone());
        match self.assets.get(asset).map(|b| b.config.status) {
            None => {
                r.status = ReplyStatus::Admin(AdminReplyStatus::Rejected);
                r.code = Some(RejectCode::UnknownAsset);
            }
            Some(current) if current == target => {
                r.status = ReplyStatus::Admin(AdminReplyStatus::Noop);
            }
            Some(_) => {
                self.assets
                    .get_mut(asset)
                    .expect("asset exists")
                    .config
                    .status = target;
                let body = match target {
                    AssetStatus::Halted => EventBody::AssetHalted,
                    AssetStatus::Active => EventBody::AssetResumed,
                };
                let seq = self.emit(&mut events, ts, asset, body);
                self.dirty.insert(asset.clone());
                r.seq = Some(seq);
                r.last_seq = self.last_seq();
            }
        }
        (events, r)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::command::{HaltAsset, ResumeAsset};
    use crate::testutil::*;
    use crate::view::LevelView;
    use serde_json::{json, Value};

    const A: &str = "TEST-A";

    fn engine() -> Engine {
        Engine::new("e-test0001")
    }
    fn configure() -> Command {
        Command::ConfigureAsset(ConfigureAsset {
            asset: asset(A),
            tick_size: 1,
            min_qty: 1,
            max_qty: 1000,
            collar_max_price: None,
            status: AssetStatus::Active,
        })
    }
    fn sub(s: SubmitOrder) -> Command {
        Command::SubmitOrder(s)
    }
    fn buy(id: u128, u: &str, qty: u64, price: u64) -> Command {
        sub(limit(id, A, u, Side::Buy, qty, price))
    }
    fn sell(id: u128, u: &str, qty: u64, price: u64) -> Command {
        sub(limit(id, A, u, Side::Sell, qty, price))
    }
    fn cancel(id: u128) -> Command {
        Command::CancelOrder(CancelOrder {
            order_id: oid(id),
            reason: CancelCommandReason::User,
        })
    }
    fn types(p: &Processed) -> Vec<String> {
        p.events
            .iter()
            .map(|e| {
                serde_json::to_value(e).unwrap()["type"]
                    .as_str()
                    .unwrap()
                    .to_string()
            })
            .collect()
    }
    fn seqs(p: &Processed) -> Vec<u64> {
        p.events.iter().map(|e| e.seq).collect()
    }
    fn reply(p: &Processed) -> Value {
        serde_json::to_value(&p.reply).unwrap()
    }
    fn run(e: &mut Engine, c: Command, ts: u64) -> Processed {
        let p = e.process(c, ts);
        e.check_invariants().unwrap();
        p
    }

    #[test]
    fn w1_partial_fill_example() {
        let mut e = engine();
        let p = run(&mut e, configure(), 1000);
        assert_eq!(reply(&p)["status"], "OK");
        assert_eq!(p.reply.seq, Some(1));

        let p = run(&mut e, sell(1, "U1", 5, 100), 1001);
        assert_eq!((p.reply.seq, p.reply.last_seq), (Some(2), 2));

        let p = run(&mut e, buy(2, "U2", 8, 100), 1002);
        assert_eq!(
            types(&p),
            [
                "OrderAccepted",
                "TradeExecuted",
                "OrderFilled",
                "OrderPartiallyFilled"
            ]
        );
        assert_eq!(seqs(&p), [3, 4, 5, 6]);
        assert_eq!((p.reply.seq, p.reply.last_seq), (Some(3), 6));
        let t = serde_json::to_value(&p.events[1]).unwrap();
        assert_eq!(t["trade_id"], "e-test0001:4");
        assert_eq!(t["price"], 100);
        assert_eq!(t["qty"], 5);
        assert_eq!(t["taker_side"], "BUY");
        assert_eq!(
            (t["buy_remaining"].clone(), t["sell_remaining"].clone()),
            (json!(3), json!(0))
        );
        assert_eq!(t["maker_order_id"], oid_s(1));
        assert_eq!(t["taker_order_id"], oid_s(2));
        let last = serde_json::to_value(&p.events[3]).unwrap();
        assert_eq!(
            (last["filled_qty"].clone(), last["remaining_qty"].clone()),
            (json!(5), json!(3))
        );
        let bv = e.book_view(&asset(A), 15).unwrap();
        assert_eq!(
            bv.bids,
            vec![LevelView {
                price: 100,
                qty: 3,
                orders: 1
            }]
        );
        assert!(bv.asks.is_empty());
    }

    #[test]
    fn w2_market_ioc_remainder() {
        let mut e = engine();
        run(&mut e, configure(), 1000);
        run(&mut e, sell(1, "U1", 3, 100), 1001);
        run(&mut e, sell(2, "U3", 4, 101), 1002);
        let p = run(
            &mut e,
            sub(market_ioc(3, A, "U2", Side::Buy, 10, 102)),
            1003,
        );
        assert_eq!(
            types(&p),
            [
                "OrderAccepted",
                "TradeExecuted",
                "OrderFilled",
                "TradeExecuted",
                "OrderFilled",
                "OrderCanceled"
            ]
        );
        assert_eq!(seqs(&p), [4, 5, 6, 7, 8, 9]);
        assert_eq!((p.reply.seq, p.reply.last_seq), (Some(4), 9));
        let c = serde_json::to_value(&p.events[5]).unwrap();
        assert_eq!(c["reason"], "IOC_REMAINDER");
        assert_eq!(
            (c["filled_qty"].clone(), c["remaining_qty"].clone()),
            (json!(7), json!(3))
        );
        assert_eq!(e.order_view(&oid(3)).unwrap().status, OrderStatus::Canceled);
    }

    #[test]
    fn s10_market_no_liquidity() {
        let mut e = engine();
        run(&mut e, configure(), 1000);
        let p = run(&mut e, sub(market_ioc(1, A, "U2", Side::Buy, 5, 100)), 1001);
        assert_eq!(types(&p), ["OrderAccepted", "OrderCanceled"]);
        let c = serde_json::to_value(&p.events[1]).unwrap();
        assert_eq!(c["reason"], "NO_LIQUIDITY");
        assert_eq!(c["remaining_qty"], 5);
    }

    #[test]
    fn w3_self_trade_prevented() {
        let mut e = engine();
        run(&mut e, configure(), 1000);
        run(&mut e, sell(1, "U1", 5, 100), 1001);
        let p = run(&mut e, buy(2, "U1", 5, 100), 1002);
        assert_eq!(types(&p), ["OrderAccepted", "OrderCanceled"]);
        assert_eq!((p.reply.seq, p.reply.last_seq), (Some(3), 4));
        let c = serde_json::to_value(&p.events[1]).unwrap();
        assert_eq!(c["reason"], "SELF_TRADE_PREVENTED");
        let bv = e.book_view(&asset(A), 15).unwrap();
        assert_eq!(
            bv.asks,
            vec![LevelView {
                price: 100,
                qty: 5,
                orders: 1
            }]
        );
        assert!(bv.bids.is_empty());
    }

    #[test]
    fn w4_cancel_after_fill() {
        let mut e = engine();
        run(&mut e, configure(), 1000);
        run(&mut e, sell(1, "U1", 5, 100), 1001);
        let p = run(&mut e, buy(2, "U2", 5, 100), 1002);
        assert_eq!(seqs(&p), [3, 4, 5, 6]);
        let p = run(&mut e, cancel(1), 1003);
        assert!(p.events.is_empty());
        assert_eq!(
            reply(&p),
            json!({"status":"ALREADY_FILLED","order_id":oid_s(1),"seq":null,"last_seq":6,
                   "engine_epoch":"e-test0001","duplicate":false})
        );
    }

    #[test]
    fn cancel_flows() {
        let mut e = engine();
        run(&mut e, configure(), 1000);
        run(&mut e, buy(1, "U1", 5, 100), 1001);
        let p = run(&mut e, cancel(1), 1002);
        assert_eq!(types(&p), ["OrderCanceled"]);
        assert_eq!(reply(&p)["status"], "CANCELED");
        assert_eq!(p.reply.remaining_qty, Some(5));
        assert_eq!(e.book_view(&asset(A), 15).unwrap().bids.len(), 0);

        let p = run(&mut e, cancel(1), 1003);
        assert!(p.events.is_empty());
        assert_eq!(reply(&p)["status"], "ALREADY_CANCELED");
        assert!(p.reply.duplicate);

        let p = run(&mut e, cancel(99), 1004);
        assert!(p.events.is_empty());
        assert_eq!(reply(&p)["status"], "UNKNOWN_ORDER");
    }

    #[test]
    fn partial_cancel_reports_filled_and_remaining() {
        let mut e = engine();
        run(&mut e, configure(), 1000);
        run(&mut e, sell(1, "U1", 5, 100), 1001);
        run(&mut e, buy(2, "U2", 2, 100), 1002);
        let p = run(&mut e, cancel(1), 1003);
        let c = serde_json::to_value(&p.events[0]).unwrap();
        assert_eq!(
            (c["filled_qty"].clone(), c["remaining_qty"].clone()),
            (json!(2), json!(3))
        );
        assert_eq!(c["reason"], "USER");
    }

    #[test]
    fn duplicate_and_reuse() {
        let mut e = engine();
        run(&mut e, configure(), 1000);
        let first = run(&mut e, buy(1, "U1", 5, 100), 1001);
        let dup = run(&mut e, buy(1, "U1", 5, 100), 1002);
        assert!(dup.events.is_empty());
        assert!(dup.reply.duplicate);
        assert_eq!(dup.reply.seq, first.reply.seq);
        assert_eq!(dup.reply.last_seq, first.reply.last_seq);
        assert_eq!(reply(&dup)["status"], "ACCEPTED");

        let reuse = run(&mut e, buy(1, "U1", 6, 100), 1003);
        assert!(reuse.events.is_empty());
        let r = reply(&reuse);
        assert_eq!(
            (r["status"].clone(), r["code"].clone()),
            (json!("REJECTED"), json!("ORDER_ID_REUSED"))
        );
        assert!(r["seq"].is_null());
        assert_eq!(e.order_view(&oid(1)).unwrap().qty, 5);
        assert_eq!(e.last_seq(), 2);
    }

    #[test]
    fn validation_rejections_emit_events_and_are_deduped() {
        let mut e = engine();
        run(&mut e, configure(), 1000);
        let p = run(&mut e, buy(1, "U1", 0, 100), 1001);
        assert_eq!(types(&p), ["OrderRejected"]);
        assert_eq!(p.reply.code, Some(RejectCode::InvalidQty));
        assert_eq!(p.reply.seq, Some(2));
        let p = run(&mut e, sub(limit(2, "NOPE", "U1", Side::Buy, 1, 100)), 1002);
        assert_eq!(p.reply.code, Some(RejectCode::UnknownAsset));
        assert_eq!(types(&p), ["OrderRejected"]);
        let dup = run(&mut e, buy(1, "U1", 0, 100), 1003);
        assert!(dup.events.is_empty() && dup.reply.duplicate);
        assert_eq!(dup.reply.code, Some(RejectCode::InvalidQty));
        // rejected orders cannot be canceled
        let c = run(&mut e, cancel(1), 1004);
        assert_eq!(reply(&c)["status"], "UNKNOWN_ORDER");
    }

    #[test]
    fn s22_halt_and_resume() {
        let mut e = engine();
        run(&mut e, configure(), 1000);
        run(&mut e, buy(1, "U1", 5, 100), 1001);
        let halt = |a: &str| Command::HaltAsset(HaltAsset { asset: asset(a) });
        let resume = |a: &str| Command::ResumeAsset(ResumeAsset { asset: asset(a) });

        let p = run(&mut e, halt(A), 1002);
        assert_eq!(types(&p), ["AssetHalted"]);
        let p = run(&mut e, halt(A), 1003);
        assert!(p.events.is_empty());
        assert_eq!(reply(&p)["status"], "NOOP");
        let p = run(&mut e, buy(2, "U2", 1, 100), 1004);
        assert_eq!(p.reply.code, Some(RejectCode::AssetHalted));
        let p = run(&mut e, cancel(1), 1005); // cancel allowed while halted
        assert_eq!(types(&p), ["OrderCanceled"]);
        let p = run(&mut e, resume(A), 1006);
        assert_eq!(types(&p), ["AssetResumed"]);
        let p = run(&mut e, buy(3, "U2", 1, 100), 1007);
        assert_eq!(types(&p), ["OrderAccepted"]);
        let p = run(&mut e, halt("NOPE"), 1008);
        assert_eq!(p.reply.code, Some(RejectCode::UnknownAsset));
        assert!(p.events.is_empty());
    }

    #[test]
    fn configure_rejects_invalid_and_keeps_resting_orders_on_reconfigure() {
        let mut e = engine();
        let bad = Command::ConfigureAsset(ConfigureAsset {
            asset: asset(A),
            tick_size: 0,
            min_qty: 1,
            max_qty: 10,
            collar_max_price: None,
            status: AssetStatus::Active,
        });
        let p = run(&mut e, bad, 1000);
        assert_eq!(p.reply.code, Some(RejectCode::InvalidConfig));
        assert!(p.events.is_empty());

        run(&mut e, configure(), 1001);
        run(&mut e, buy(1, "U1", 5, 105), 1002);
        let tick10 = Command::ConfigureAsset(ConfigureAsset {
            asset: asset(A),
            tick_size: 10,
            min_qty: 1,
            max_qty: 1000,
            collar_max_price: None,
            status: AssetStatus::Active,
        });
        let p = run(&mut e, tick10, 1003);
        assert_eq!(types(&p), ["AssetConfigured"]);
        assert_eq!(e.open_orders(None).orders.len(), 1); // old order untouched
        let p = run(&mut e, buy(2, "U1", 1, 105), 1004);
        assert_eq!(p.reply.code, Some(RejectCode::PriceNotOnTick));
    }

    #[test]
    fn s23_tombstones_do_not_break_priority() {
        let mut e = engine();
        run(&mut e, configure(), 1000);
        for (id, u) in [(1u128, "U1"), (2, "U2"), (3, "U3"), (4, "U4")] {
            run(&mut e, buy(id, u, 1, 100), 1001);
        }
        run(&mut e, cancel(2), 1002);
        run(&mut e, cancel(3), 1003);
        let p = run(&mut e, sell(5, "U5", 3, 100), 1004);
        assert_eq!(
            types(&p),
            [
                "OrderAccepted",
                "TradeExecuted",
                "OrderFilled",
                "TradeExecuted",
                "OrderFilled",
                "OrderPartiallyFilled"
            ]
        );
        let makers: Vec<Value> = [1usize, 3]
            .iter()
            .map(|&i| serde_json::to_value(&p.events[i]).unwrap()["maker_order_id"].clone())
            .collect();
        assert_eq!(makers, vec![json!(oid_s(1)), json!(oid_s(4))]);
        let bv = e.book_view(&asset(A), 15).unwrap();
        assert_eq!(
            bv.asks,
            vec![LevelView {
                price: 100,
                qty: 1,
                orders: 1
            }]
        );
    }

    #[test]
    fn open_orders_sorted_and_dirty_assets() {
        let mut e = engine();
        run(&mut e, configure(), 1000);
        let cfg_b = Command::ConfigureAsset(ConfigureAsset {
            asset: asset("TEST-B"),
            tick_size: 1,
            min_qty: 1,
            max_qty: 1000,
            collar_max_price: None,
            status: AssetStatus::Active,
        });
        run(&mut e, cfg_b, 1001);
        run(
            &mut e,
            sub(limit(1, "TEST-B", "U1", Side::Buy, 1, 50)),
            1002,
        );
        run(&mut e, buy(2, "U1", 1, 100), 1003);
        run(&mut e, buy(3, "U1", 1, 99), 1004);
        let o = e.open_orders(None);
        let keys: Vec<(String, u64)> = o
            .orders
            .iter()
            .map(|x| (x.asset.as_str().to_string(), x.accept_seq))
            .collect();
        assert_eq!(
            keys,
            vec![
                ("TEST-A".into(), 4),
                ("TEST-A".into(), 5),
                ("TEST-B".into(), 3)
            ]
        );
        assert_eq!(e.open_orders(Some(&asset("TEST-B"))).orders.len(), 1);
        let dirty: Vec<String> = e
            .take_dirty_assets()
            .iter()
            .map(|a| a.as_str().to_string())
            .collect();
        assert_eq!(dirty, vec!["TEST-A", "TEST-B"]);
        assert!(e.take_dirty_assets().is_empty());
    }

    #[test]
    fn ts_is_clamped_nondecreasing() {
        let mut e = engine();
        let p = run(&mut e, configure(), 5000);
        assert_eq!(p.ts_used, 5000);
        let p = run(&mut e, buy(1, "U1", 1, 100), 4000);
        assert_eq!(p.ts_used, 5000);
        assert_eq!(serde_json::to_value(&p.events[0]).unwrap()["ts"], 5000);
    }

    #[test]
    fn replay_is_deterministic() {
        let script = || -> Vec<(Command, u64)> {
            vec![
                (configure(), 1000),
                (sell(1, "U1", 2, 100), 1001),
                (sell(2, "U3", 2, 101), 1002),
                (sell(3, "U4", 2, 102), 1003),
                (buy(4, "U2", 5, 101), 1004),
                (cancel(3), 1005),
                (buy(4, "U2", 5, 101), 1006),
                (sub(market_ioc(5, A, "U2", Side::Sell, 9, 90)), 1007),
            ]
        };
        let run_all = |cmds: Vec<(Command, u64)>| {
            let mut e = engine();
            let mut out: Vec<Value> = Vec::new();
            for (c, ts) in cmds {
                let p = e.process(c, ts);
                out.push(json!({"events": p.events.iter().map(|x| serde_json::to_value(x).unwrap()).collect::<Vec<_>>(),
                                "reply": serde_json::to_value(&p.reply).unwrap()}));
            }
            (
                out,
                serde_json::to_value(e.book_view(&asset(A), 15).unwrap()).unwrap(),
            )
        };
        assert_eq!(run_all(script()), run_all(script()));
    }
}
