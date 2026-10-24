//! Order book for one asset. Pure data structure: no matching policy, no I/O.

use std::collections::{BTreeMap, HashMap, HashSet, VecDeque};

use crate::config::AssetConfig;
use crate::types::{AssetId, OrderId, Price, Qty, Seq, Side, UserId};

/// Queue is compacted when it holds more than `2 * live_count + COMPACT_SLACK` ids.
const COMPACT_SLACK: usize = 32;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RestingOrder {
    pub order_id: OrderId,
    pub user_id: UserId,
    pub side: Side,
    pub price: Price,
    pub remaining: Qty,
    pub accept_seq: Seq,
}

#[derive(Debug, Clone)]
pub struct PriceLevel {
    pub price: Price,
    pub total_qty: Qty,
    pub live_count: usize,
    /// FIFO of order ids. May contain tombstones (ids no longer in the index).
    pub queue: VecDeque<OrderId>,
}

pub struct AssetBook {
    pub asset: AssetId,
    pub config: AssetConfig,
    bids: BTreeMap<Price, PriceLevel>,
    asks: BTreeMap<Price, PriceLevel>,
    index: HashMap<OrderId, RestingOrder>, // point lookups only (rule D5)
}

impl AssetBook {
    pub fn new(asset: AssetId, config: AssetConfig) -> Self {
        Self {
            asset,
            config,
            bids: BTreeMap::new(),
            asks: BTreeMap::new(),
            index: HashMap::new(),
        }
    }

    pub fn best_bid(&self) -> Option<Price> {
        self.bids.keys().next_back().copied()
    }

    pub fn best_ask(&self) -> Option<Price> {
        self.asks.keys().next().copied()
    }

    pub fn get(&self, id: &OrderId) -> Option<&RestingOrder> {
        self.index.get(id)
    }

    pub fn contains(&self, id: &OrderId) -> bool {
        self.index.contains_key(id)
    }

    pub fn resting_count(&self) -> usize {
        self.index.len()
    }

    /// (bid levels, ask levels)
    pub fn level_counts(&self) -> (usize, usize) {
        (self.bids.len(), self.asks.len())
    }

    /// Adds a resting order at the back of its level's queue.
    pub fn insert_resting(&mut self, order: RestingOrder) {
        assert!(order.remaining > 0, "insert_resting: zero remaining");
        assert!(
            !self.index.contains_key(&order.order_id),
            "insert_resting: duplicate order id"
        );
        let price = order.price;
        let levels = match order.side {
            Side::Buy => &mut self.bids,
            Side::Sell => &mut self.asks,
        };
        let level = levels.entry(price).or_insert_with(|| PriceLevel {
            price,
            total_qty: 0,
            live_count: 0,
            queue: VecDeque::new(),
        });
        level.queue.push_back(order.order_id);
        level.total_qty += order.remaining;
        level.live_count += 1;
        self.index.insert(order.order_id, order);
    }

    /// Cancel path. Leaves a lazy tombstone in the queue unless the level
    /// empties (level deleted) or the queue grows too large (compaction).
    pub fn remove(&mut self, id: &OrderId) -> Option<RestingOrder> {
        let order = self.index.remove(id)?;
        let levels = match order.side {
            Side::Buy => &mut self.bids,
            Side::Sell => &mut self.asks,
        };
        let index = &self.index;
        let mut delete_level = false;
        if let Some(level) = levels.get_mut(&order.price) {
            level.total_qty -= order.remaining;
            level.live_count -= 1;
            if level.live_count == 0 {
                delete_level = true;
            } else if level.queue.len() > 2 * level.live_count + COMPACT_SLACK {
                level.queue.retain(|q| index.contains_key(q));
            }
        }
        if delete_level {
            levels.remove(&order.price);
        }
        Some(order)
    }

    /// First live id at the level. Pops tombstones from the front. Deletes the
    /// level and returns `None` if nothing live remains.
    pub fn front_live(&mut self, side: Side, price: Price) -> Option<OrderId> {
        let levels = match side {
            Side::Buy => &mut self.bids,
            Side::Sell => &mut self.asks,
        };
        let index = &self.index;
        let level = levels.get_mut(&price)?;
        while let Some(front) = level.queue.front().copied() {
            if index.contains_key(&front) {
                return Some(front);
            }
            level.queue.pop_front();
        }
        levels.remove(&price);
        None
    }

    /// Reduce a resting (maker) order after a match. Removes it when it hits zero.
    pub fn reduce_maker(&mut self, id: &OrderId, qty: Qty) {
        let (side, price, now_zero) = {
            let o = self.index.get_mut(id).expect("reduce_maker: unknown order");
            assert!(qty <= o.remaining, "reduce_maker: qty exceeds remaining");
            o.remaining -= qty;
            (o.side, o.price, o.remaining == 0)
        };
        if now_zero {
            self.index.remove(id);
        }
        let levels = match side {
            Side::Buy => &mut self.bids,
            Side::Sell => &mut self.asks,
        };
        let level = levels.get_mut(&price).expect("reduce_maker: missing level");
        level.total_qty -= qty;
        if now_zero {
            if level.queue.front() == Some(id) {
                level.queue.pop_front();
            } else {
                level.queue.retain(|q| q != id);
            }
            level.live_count -= 1;
            if level.live_count == 0 {
                levels.remove(&price);
            }
        }
    }

    /// `(price, total_qty, live_count)`: bids best-first (descending), asks ascending.
    pub fn depth(&self, side: Side, n: usize) -> Vec<(Price, Qty, usize)> {
        let f = |(p, l): (&Price, &PriceLevel)| (*p, l.total_qty, l.live_count);
        match side {
            Side::Buy => self.bids.iter().rev().take(n).map(f).collect(),
            Side::Sell => self.asks.iter().take(n).map(f).collect(),
        }
    }

    /// All resting orders sorted by `accept_seq` ascending (rule D6).
    pub fn open_orders(&self) -> Vec<RestingOrder> {
        let mut v: Vec<RestingOrder> = self.index.values().cloned().collect();
        v.sort_by_key(|o| o.accept_seq);
        v
    }

    pub fn check_invariants(&self) -> Result<(), String> {
        if let (Some(b), Some(a)) = (self.best_bid(), self.best_ask()) {
            if b >= a {
                return Err(format!("book crossed: best_bid {b} >= best_ask {a}"));
            }
        }
        let mut seen: HashSet<OrderId> = HashSet::new();
        for (side, levels) in [(Side::Buy, &self.bids), (Side::Sell, &self.asks)] {
            for (price, level) in levels {
                if level.price != *price {
                    return Err(format!("level key {price} != level.price {}", level.price));
                }
                if level.live_count == 0 {
                    return Err(format!("empty level at {price}"));
                }
                let mut sum: Qty = 0;
                let mut live = 0usize;
                for id in &level.queue {
                    if let Some(o) = self.index.get(id) {
                        if o.side != side || o.price != *price {
                            return Err(format!("order {id:?} in wrong level"));
                        }
                        if o.remaining == 0 {
                            return Err(format!("order {id:?} has zero remaining"));
                        }
                        if !seen.insert(*id) {
                            return Err(format!("order {id:?} queued more than once"));
                        }
                        sum += o.remaining;
                        live += 1;
                    }
                }
                if sum != level.total_qty {
                    return Err(format!(
                        "level {price}: total_qty {} != sum {sum}",
                        level.total_qty
                    ));
                }
                if live != level.live_count {
                    return Err(format!(
                        "level {price}: live_count {} != live {live}",
                        level.live_count
                    ));
                }
            }
        }
        if seen.len() != self.index.len() {
            return Err(format!(
                "index has {} orders but levels hold {}",
                self.index.len(),
                seen.len()
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::*;

    fn book() -> AssetBook {
        AssetBook::new(asset("TEST-A"), cfg(1, 1, 1000))
    }

    fn ro(id: u128, u: &str, side: Side, price: Price, rem: Qty, seq: Seq) -> RestingOrder {
        RestingOrder {
            order_id: oid(id),
            user_id: user(u),
            side,
            price,
            remaining: rem,
            accept_seq: seq,
        }
    }

    #[test]
    fn best_prices_and_depth() {
        let mut b = book();
        assert_eq!((b.best_bid(), b.best_ask()), (None, None));
        b.insert_resting(ro(1, "U1", Side::Buy, 100, 2, 2));
        b.insert_resting(ro(2, "U2", Side::Buy, 100, 3, 3));
        b.insert_resting(ro(3, "U1", Side::Buy, 99, 1, 4));
        b.insert_resting(ro(4, "U3", Side::Sell, 103, 4, 5));
        b.insert_resting(ro(5, "U3", Side::Sell, 101, 1, 6));
        assert_eq!(b.best_bid(), Some(100));
        assert_eq!(b.best_ask(), Some(101));
        assert_eq!(b.depth(Side::Buy, 10), vec![(100, 5, 2), (99, 1, 1)]);
        assert_eq!(b.depth(Side::Buy, 1), vec![(100, 5, 2)]);
        assert_eq!(b.depth(Side::Sell, 10), vec![(101, 1, 1), (103, 4, 1)]);
        b.check_invariants().unwrap();
    }

    #[test]
    fn remove_leaves_tombstone_and_front_live_skips_it() {
        let mut b = book();
        b.insert_resting(ro(1, "U1", Side::Sell, 100, 2, 2));
        b.insert_resting(ro(2, "U2", Side::Sell, 100, 3, 3));
        let removed = b.remove(&oid(1)).unwrap();
        assert_eq!(removed.remaining, 2);
        assert_eq!(b.depth(Side::Sell, 5), vec![(100, 3, 1)]);
        assert_eq!(b.asks.get(&100).unwrap().queue.len(), 2); // tombstone still queued
        assert_eq!(b.front_live(Side::Sell, 100), Some(oid(2)));
        assert_eq!(b.asks.get(&100).unwrap().queue.len(), 1); // tombstone popped
        b.check_invariants().unwrap();
        assert!(b.remove(&oid(1)).is_none());
    }

    #[test]
    fn removing_last_order_deletes_level() {
        let mut b = book();
        b.insert_resting(ro(1, "U1", Side::Buy, 100, 2, 2));
        b.remove(&oid(1)).unwrap();
        assert_eq!(b.best_bid(), None);
        assert_eq!(b.level_counts(), (0, 0));
        b.check_invariants().unwrap();
    }

    #[test]
    fn front_live_deletes_level_with_no_live_orders() {
        let mut b = book();
        assert_eq!(b.front_live(Side::Buy, 100), None);
        b.insert_resting(ro(1, "U1", Side::Buy, 100, 2, 2));
        assert_eq!(b.front_live(Side::Buy, 100), Some(oid(1)));
    }

    #[test]
    fn compaction_triggers_exactly_when_queue_exceeds_threshold() {
        let mut b = book();
        for i in 1..=100u128 {
            b.insert_resting(ro(i, "U1", Side::Buy, 100, 1, 1 + i as u64));
        }
        // remove 66 from the middle-to-front: live 34, queue 100, 100 > 2*34+32 is false
        for i in 1..=66u128 {
            b.remove(&oid(i)).unwrap();
        }
        assert_eq!(b.bids.get(&100).unwrap().queue.len(), 100);
        // 67th removal: live 33, 100 > 98 -> compact to live ids only
        b.remove(&oid(67)).unwrap();
        let level = b.bids.get(&100).unwrap();
        assert_eq!(level.live_count, 33);
        assert_eq!(level.queue.len(), 33);
        assert_eq!(level.queue.front().copied(), Some(oid(68)));
        b.check_invariants().unwrap();
    }

    #[test]
    fn reduce_maker_partial_then_full() {
        let mut b = book();
        b.insert_resting(ro(1, "U1", Side::Sell, 100, 5, 2));
        b.insert_resting(ro(2, "U2", Side::Sell, 100, 3, 3));
        b.reduce_maker(&oid(1), 2);
        assert_eq!(b.get(&oid(1)).unwrap().remaining, 3);
        assert_eq!(b.depth(Side::Sell, 5), vec![(100, 6, 2)]);
        assert_eq!(b.front_live(Side::Sell, 100), Some(oid(1))); // keeps queue position
        b.reduce_maker(&oid(1), 3);
        assert!(!b.contains(&oid(1)));
        assert_eq!(b.depth(Side::Sell, 5), vec![(100, 3, 1)]);
        assert_eq!(b.front_live(Side::Sell, 100), Some(oid(2)));
        b.reduce_maker(&oid(2), 3);
        assert_eq!(b.best_ask(), None);
        b.check_invariants().unwrap();
    }

    #[test]
    fn open_orders_sorted_by_accept_seq() {
        let mut b = book();
        b.insert_resting(ro(1, "U1", Side::Buy, 99, 1, 9));
        b.insert_resting(ro(2, "U1", Side::Sell, 105, 1, 3));
        b.insert_resting(ro(3, "U1", Side::Buy, 98, 1, 5));
        let seqs: Vec<Seq> = b.open_orders().iter().map(|o| o.accept_seq).collect();
        assert_eq!(seqs, vec![3, 5, 9]);
    }

    #[test]
    fn invariants_detect_crossed_book() {
        let mut b = book();
        b.insert_resting(ro(1, "U1", Side::Buy, 100, 1, 2));
        b.insert_resting(ro(2, "U2", Side::Sell, 100, 1, 3));
        assert!(b.check_invariants().is_err());
    }

    #[test]
    fn invariants_hold_after_random_operations() {
        let mut state: u64 = 12345;
        let mut rnd = move || {
            state = state
                .wrapping_mul(6364136223846793005)
                .wrapping_add(1442695040888963407);
            state >> 33
        };
        let mut b = book();
        let mut live: Vec<(u128, Qty)> = Vec::new();
        let mut next_id: u128 = 1;
        for _ in 0..3000 {
            match rnd() % 3 {
                0 => {
                    let side = if rnd() % 2 == 0 {
                        Side::Buy
                    } else {
                        Side::Sell
                    };
                    let price = match side {
                        Side::Buy => 90 + rnd() % 10,   // 90..=99
                        Side::Sell => 101 + rnd() % 10, // 101..=110
                    };
                    let rem = 1 + rnd() % 5;
                    b.insert_resting(ro(next_id, "U1", side, price, rem, next_id as u64));
                    live.push((next_id, rem));
                    next_id += 1;
                }
                1 if !live.is_empty() => {
                    let i = (rnd() as usize) % live.len();
                    let (id, _) = live.swap_remove(i);
                    assert!(b.remove(&oid(id)).is_some());
                }
                _ if !live.is_empty() => {
                    let i = (rnd() as usize) % live.len();
                    b.reduce_maker(&oid(live[i].0), 1);
                    live[i].1 -= 1;
                    if live[i].1 == 0 {
                        live.swap_remove(i);
                    }
                }
                _ => {}
            }
            b.check_invariants().unwrap();
            assert_eq!(b.resting_count(), live.len());
        }
    }
}
