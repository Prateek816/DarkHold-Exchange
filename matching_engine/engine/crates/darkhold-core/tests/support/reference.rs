//! Deliberately naive reference engine over serde_json::Value.
//! Shares no code with book.rs / matcher.rs: plain vectors, linear scans.
#![allow(dead_code)]
use serde_json::{json, Map, Value};
use std::collections::{BTreeMap, HashMap};

const MAX_SAFE: u64 = 9007199254740991;

struct Cfg {
    tick: u64,
    min: u64,
    max: u64,
    collar: Option<u64>,
    status: String,
}
#[derive(Clone)]
struct Rest {
    id: String,
    user: String,
    side: String,
    price: u64,
    rem: u64,
    acc: u64,
}
struct Out {
    asset: String,
    user: String,
    qty: u64,
    filled: u64,
    rem: u64,
    status: String,
    fp: String,
    reply: Value,
}

pub struct Reference {
    epoch: String,
    next_seq: u64,
    last_ts: u64,
    assets: BTreeMap<String, (Cfg, Vec<Rest>)>,
    outs: HashMap<String, Out>,
}

fn st(c: &Value, k: &str) -> String {
    c[k].as_str().unwrap().to_string()
}
fn un(c: &Value, k: &str) -> u64 {
    c[k].as_u64().unwrap()
}

impl Reference {
    pub fn new(epoch: &str) -> Self {
        Reference {
            epoch: epoch.to_string(),
            next_seq: 1,
            last_ts: 0,
            assets: BTreeMap::new(),
            outs: HashMap::new(),
        }
    }

    pub fn knows(&self, a: &str) -> bool {
        self.assets.contains_key(a)
    }

    pub fn book_levels(&self, a: &str) -> (Value, Value) {
        let book = &self.assets[a].1;
        let lv = |side: &str, rev: bool| {
            let mut d: BTreeMap<u64, (u64, u64)> = BTreeMap::new();
            for r in book.iter().filter(|r| r.side == side) {
                let x = d.entry(r.price).or_insert((0, 0));
                x.0 += r.rem;
                x.1 += 1;
            }
            let mut v: Vec<Value> = d.iter().map(|(p, (q, o))| json!([p, q, o])).collect();
            if rev {
                v.reverse();
            }
            Value::Array(v)
        };
        (lv("BUY", true), lv("SELL", false))
    }

    fn emit(&mut self, evs: &mut Vec<Value>, ts: u64, asset: &str, typ: &str, body: Value) -> u64 {
        let seq = self.next_seq;
        self.next_seq += 1;
        let mut m = Map::new();
        m.insert("type".into(), json!(typ));
        m.insert("engine_epoch".into(), json!(self.epoch));
        m.insert("seq".into(), json!(seq));
        m.insert("ts".into(), json!(ts));
        m.insert("asset".into(), json!(asset));
        if let Value::Object(b) = body {
            for (k, v) in b {
                m.insert(k, v);
            }
        }
        evs.push(Value::Object(m));
        seq
    }

    fn mk(&self, status: &str, extra: Value, seq: Option<u64>) -> Value {
        let mut r = json!({"status":status,"seq":seq,"last_seq":self.next_seq-1,"engine_epoch":self.epoch,"duplicate":false});
        if let Value::Object(b) = extra {
            for (k, v) in b {
                r[k] = v;
            }
        }
        r
    }

    pub fn process(&mut self, cmd: &Value, ts: u64) -> (Vec<Value>, Value) {
        let ts = ts.max(self.last_ts);
        self.last_ts = ts;
        let mut evs = vec![];
        let reply = match cmd["type"].as_str().unwrap() {
            "SubmitOrder" => self.submit(cmd, ts, &mut evs),
            "CancelOrder" => self.cancel(cmd, ts, &mut evs),
            "ConfigureAsset" => self.configure(cmd, ts, &mut evs),
            "HaltAsset" => self.status_change(cmd, ts, &mut evs, "HALTED"),
            "ResumeAsset" => self.status_change(cmd, ts, &mut evs, "ACTIVE"),
            t => panic!("unknown command {t}"),
        };
        (evs, reply)
    }

    fn configure(&mut self, c: &Value, ts: u64, evs: &mut Vec<Value>) -> Value {
        let a = st(c, "asset");
        let (tick, min, max) = (un(c, "tick_size"), un(c, "min_qty"), un(c, "max_qty"));
        let collar = c["collar_max_price"].as_u64();
        let bad = tick == 0
            || min == 0
            || max < min
            || collar == Some(0)
            || tick > MAX_SAFE
            || min > MAX_SAFE
            || max > MAX_SAFE
            || collar.is_some_and(|x| x > MAX_SAFE);
        if bad {
            return self.mk("REJECTED", json!({"asset":a,"code":"INVALID_CONFIG"}), None);
        }
        let status = st(c, "status");
        let cfg = Cfg {
            tick,
            min,
            max,
            collar,
            status: status.clone(),
        };
        if let Some(x) = self.assets.get_mut(&a) {
            x.0 = cfg;
        } else {
            self.assets.insert(a.clone(), (cfg, vec![]));
        }
        let seq = self.emit(evs, ts, &a, "AssetConfigured", json!({"tick_size":tick,"min_qty":min,"max_qty":max,"collar_max_price":collar,"status":status}));
        self.mk("OK", json!({"asset":a}), Some(seq))
    }

    fn status_change(&mut self, c: &Value, ts: u64, evs: &mut Vec<Value>, target: &str) -> Value {
        let a = st(c, "asset");
        let cur = self.assets.get(&a).map(|x| x.0.status.clone());
        match cur {
            None => self.mk("REJECTED", json!({"asset":a,"code":"UNKNOWN_ASSET"}), None),
            Some(s) if s == target => self.mk("NOOP", json!({"asset":a}), None),
            Some(_) => {
                self.assets.get_mut(&a).unwrap().0.status = target.to_string();
                let t = if target == "HALTED" {
                    "AssetHalted"
                } else {
                    "AssetResumed"
                };
                let seq = self.emit(evs, ts, &a, t, json!({}));
                self.mk("OK", json!({"asset":a}), Some(seq))
            }
        }
    }

    fn validate(
        &self,
        asset: &str,
        otype: &str,
        tif: &str,
        qty: u64,
        price: u64,
    ) -> Option<&'static str> {
        let (cfg, _) = match self.assets.get(asset) {
            None => return Some("UNKNOWN_ASSET"),
            Some(x) => x,
        };
        if cfg.status != "ACTIVE" {
            return Some("ASSET_HALTED");
        }
        if otype == "MARKET" && tif != "IOC" {
            return Some("INVALID_TIF");
        }
        if qty < cfg.min || qty > cfg.max || qty > MAX_SAFE {
            return Some("INVALID_QTY");
        }
        if !(1..=MAX_SAFE).contains(&price) {
            return Some("INVALID_PRICE");
        }
        if price % cfg.tick != 0 {
            return Some("PRICE_NOT_ON_TICK");
        }
        if let Some(c) = cfg.collar {
            if price > c {
                return Some("PRICE_ABOVE_COLLAR");
            }
        }
        match price.checked_mul(qty) {
            Some(n) if n <= MAX_SAFE => None,
            _ => Some("NOTIONAL_OVERFLOW"),
        }
    }

    fn submit(&mut self, c: &Value, ts: u64, evs: &mut Vec<Value>) -> Value {
        let oid = st(c, "order_id");
        let (asset, user, side, otype, tif) = (
            st(c, "asset"),
            st(c, "user_id"),
            st(c, "side"),
            st(c, "order_type"),
            st(c, "tif"),
        );
        let (qty, price) = (un(c, "qty"), un(c, "price"));
        let fp = format!("{asset}|{user}|{side}|{otype}|{tif}|{qty}|{price}");
        if let Some(o) = self.outs.get(&oid) {
            if o.fp == fp {
                let mut r = o.reply.clone();
                r["duplicate"] = json!(true);
                return r;
            }
            return self.mk(
                "REJECTED",
                json!({"order_id":oid,"code":"ORDER_ID_REUSED"}),
                None,
            );
        }
        if let Some(code) = self.validate(&asset, &otype, &tif, qty, price) {
            let seq = self.emit(
                evs,
                ts,
                &asset,
                "OrderRejected",
                json!({"order_id":oid,"user_id":user,"code":code}),
            );
            let reply = self.mk("REJECTED", json!({"order_id":oid,"code":code}), Some(seq));
            self.outs.insert(
                oid,
                Out {
                    asset,
                    user,
                    qty,
                    filled: 0,
                    rem: qty,
                    status: "REJECTED".into(),
                    fp,
                    reply: reply.clone(),
                },
            );
            return reply;
        }
        let first = self.emit(evs, ts, &asset, "OrderAccepted", json!({"order_id":oid,"user_id":user,"side":side,"order_type":otype,"tif":tif,"price":price,"qty":qty}));
        self.outs.insert(
            oid.clone(),
            Out {
                asset: asset.clone(),
                user: user.clone(),
                qty,
                filled: 0,
                rem: qty,
                status: "OPEN".into(),
                fp,
                reply: Value::Null,
            },
        );
        let mut book = std::mem::take(&mut self.assets.get_mut(&asset).unwrap().1);
        let mut rem = qty;
        let mut fills = 0u64;
        let mut stp = false;
        while rem > 0 {
            let mut best: Option<usize> = None;
            for (i, r) in book.iter().enumerate() {
                if r.side == side {
                    continue;
                }
                best = match best {
                    None => Some(i),
                    Some(b) => {
                        let rb = &book[b];
                        let better = if side == "BUY" {
                            (r.price, r.acc) < (rb.price, rb.acc)
                        } else {
                            r.price > rb.price || (r.price == rb.price && r.acc < rb.acc)
                        };
                        Some(if better { i } else { b })
                    }
                };
            }
            let bi = match best {
                Some(b) => b,
                None => break,
            };
            let crossing = if side == "BUY" {
                book[bi].price <= price
            } else {
                book[bi].price >= price
            };
            if !crossing {
                break;
            }
            if book[bi].user == user {
                stp = true;
                break;
            }
            let q = rem.min(book[bi].rem);
            let (mid, muser, mprice) = (book[bi].id.clone(), book[bi].user.clone(), book[bi].price);
            book[bi].rem -= q;
            rem -= q;
            fills += 1;
            let mrem = book[bi].rem;
            let (br, sr) = if side == "BUY" {
                (rem, mrem)
            } else {
                (mrem, rem)
            };
            let (bo, so, bu, su) = if side == "BUY" {
                (oid.clone(), mid.clone(), user.clone(), muser.clone())
            } else {
                (mid.clone(), oid.clone(), muser.clone(), user.clone())
            };
            let tid = format!("{}:{}", self.epoch, self.next_seq);
            self.emit(evs, ts, &asset, "TradeExecuted", json!({"trade_id":tid,"price":mprice,"qty":q,"buy_order_id":bo,"sell_order_id":so,"buy_user_id":bu,"sell_user_id":su,"maker_order_id":mid,"taker_order_id":oid,"taker_side":side,"buy_remaining":br,"sell_remaining":sr}));
            {
                let mo = self.outs.get_mut(&mid).unwrap();
                mo.filled += q;
                mo.rem -= q;
                mo.status = if mo.rem == 0 {
                    "FILLED".into()
                } else {
                    "PARTIALLY_FILLED".into()
                };
            }
            let mfilled = self.outs[&mid].filled;
            if mrem == 0 {
                self.emit(
                    evs,
                    ts,
                    &asset,
                    "OrderFilled",
                    json!({"order_id":mid,"user_id":muser,"filled_qty":mfilled}),
                );
                book.remove(bi);
            } else {
                self.emit(evs, ts, &asset, "OrderPartiallyFilled", json!({"order_id":mid,"user_id":muser,"filled_qty":mfilled,"remaining_qty":mrem}));
            }
            let to = self.outs.get_mut(&oid).unwrap();
            to.filled += q;
            to.rem -= q;
            to.status = if to.rem == 0 {
                "FILLED".into()
            } else {
                "PARTIALLY_FILLED".into()
            };
        }
        let filled = qty - rem;
        if rem == 0 {
            self.emit(
                evs,
                ts,
                &asset,
                "OrderFilled",
                json!({"order_id":oid,"user_id":user,"filled_qty":qty}),
            );
        } else if stp {
            self.emit(evs, ts, &asset, "OrderCanceled", json!({"order_id":oid,"user_id":user,"filled_qty":filled,"remaining_qty":rem,"reason":"SELF_TRADE_PREVENTED"}));
            self.outs.get_mut(&oid).unwrap().status = "CANCELED".into();
        } else if tif == "GTC" {
            book.push(Rest {
                id: oid.clone(),
                user: user.clone(),
                side: side.clone(),
                price,
                rem,
                acc: first,
            });
            if fills > 0 {
                self.emit(
                    evs,
                    ts,
                    &asset,
                    "OrderPartiallyFilled",
                    json!({"order_id":oid,"user_id":user,"filled_qty":filled,"remaining_qty":rem}),
                );
            }
        } else {
            let reason = if fills > 0 {
                "IOC_REMAINDER"
            } else {
                "NO_LIQUIDITY"
            };
            self.emit(evs, ts, &asset, "OrderCanceled", json!({"order_id":oid,"user_id":user,"filled_qty":filled,"remaining_qty":rem,"reason":reason}));
            self.outs.get_mut(&oid).unwrap().status = "CANCELED".into();
        }
        self.assets.get_mut(&asset).unwrap().1 = book;
        let reply = self.mk("ACCEPTED", json!({"order_id":oid}), Some(first));
        self.outs.get_mut(&oid).unwrap().reply = reply.clone();
        reply
    }

    fn cancel(&mut self, c: &Value, ts: u64, evs: &mut Vec<Value>) -> Value {
        let oid = st(c, "order_id");
        let (status, asset, user, filled, rem) = match self.outs.get(&oid) {
            None => return self.mk("UNKNOWN_ORDER", json!({"order_id":oid}), None),
            Some(o) => (
                o.status.clone(),
                o.asset.clone(),
                o.user.clone(),
                o.filled,
                o.rem,
            ),
        };
        match status.as_str() {
            "REJECTED" => self.mk("UNKNOWN_ORDER", json!({"order_id":oid}), None),
            "FILLED" => self.mk("ALREADY_FILLED", json!({"order_id":oid}), None),
            "CANCELED" => self.mk(
                "ALREADY_CANCELED",
                json!({"order_id":oid,"duplicate":true}),
                None,
            ),
            _ => {
                self.assets
                    .get_mut(&asset)
                    .unwrap()
                    .1
                    .retain(|r| r.id != oid);
                let seq = self.emit(evs, ts, &asset, "OrderCanceled", json!({"order_id":oid,"user_id":user,"filled_qty":filled,"remaining_qty":rem,"reason":c["reason"]}));
                self.outs.get_mut(&oid).unwrap().status = "CANCELED".into();
                self.mk(
                    "CANCELED",
                    json!({"order_id":oid,"remaining_qty":rem}),
                    Some(seq),
                )
            }
        }
    }
}
