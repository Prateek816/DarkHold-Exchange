//! Shared helpers for step 5 tests and benches.
//! ADAPTER NOTE: every call into the darkhold-core API is isolated in the
//! functions marked ADAPTER. If a signature differs in your step 2-4 code,
//! fix it here only.
#![allow(dead_code)]
use darkhold_core::{AssetId, Command, Engine};
use rand::{Rng, SeedableRng};
use rand_pcg::Pcg64;
use serde_json::{json, Value};
use std::path::PathBuf;

pub const EPOCH: &str = "e-test0001";

// ---------- ADAPTER ----------
pub fn new_engine() -> Engine {
    Engine::new(EPOCH.to_string())
}

pub fn process_json(e: &mut Engine, cmd: &Value, ts: u64) -> (Vec<Value>, Value) {
    let c: Command = serde_json::from_value(cmd.clone()).expect("command must parse");
    let p = e.process(c, ts);
    let evs = p
        .events
        .iter()
        .map(|x| serde_json::to_value(x).unwrap())
        .collect();
    (evs, serde_json::to_value(&p.reply).unwrap())
}

pub fn book_json(e: &Engine, asset: &str) -> Value {
    let id: AssetId = serde_json::from_value(json!(asset)).unwrap();
    serde_json::to_value(e.book_view(&id, 100)).unwrap()
}

pub fn check_invariants(e: &Engine) {
    e.check_invariants().expect("engine invariants must hold");
}
// ---------- END ADAPTER ----------

pub fn contracts_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../contracts")
}

pub fn uuid_n(n: u64) -> String {
    format!("b0000000-0000-4000-8000-{:012x}", n)
}

/// Normalizes book levels to [[price, qty, orders], ...].
pub fn norm_levels(v: &Value) -> Value {
    let arr = v.as_array().cloned().unwrap_or_default();
    Value::Array(
        arr.iter()
            .map(|l| json!([l["price"], l["qty"], l["orders"]]))
            .collect(),
    )
}

pub fn configure(
    asset: &str,
    tick: u64,
    min: u64,
    max: u64,
    collar: Option<u64>,
    status: &str,
) -> Value {
    json!({"type":"ConfigureAsset","asset":asset,"tick_size":tick,"min_qty":min,"max_qty":max,"collar_max_price":collar,"status":status})
}

#[allow(clippy::too_many_arguments)]
pub fn submit(
    id: &str,
    asset: &str,
    user: &str,
    side: &str,
    ot: &str,
    tif: &str,
    qty: u64,
    price: u64,
) -> Value {
    json!({"type":"SubmitOrder","order_id":id,"asset":asset,"user_id":user,"side":side,"order_type":ot,"tif":tif,"qty":qty,"price":price})
}

pub fn limit(id: &str, user: &str, side: &str, qty: u64, price: u64) -> Value {
    submit(id, "TEST-A", user, side, "LIMIT", "GTC", qty, price)
}

pub fn cancel(id: &str, reason: &str) -> Value {
    json!({"type":"CancelOrder","order_id":id,"reason":reason})
}

pub fn engine_with_asset(max_qty: u64) -> Engine {
    let mut e = new_engine();
    process_json(
        &mut e,
        &configure("TEST-A", 1, 1, max_qty, None, "ACTIVE"),
        1000,
    );
    e
}

// ---------- random command generator ----------
pub const ASSETS: [&str; 4] = ["TEST-A", "TEST-B", "TEST-C", "TEST-D"];
pub const TICKS: [u64; 4] = [1, 5, 10, 2];

pub struct Gen {
    rng: Pcg64,
    counter: u64,
    issued: Vec<Value>,
}

impl Gen {
    pub fn new(seed: u64) -> Self {
        Gen {
            rng: Pcg64::seed_from_u64(seed),
            counter: 0,
            issued: vec![],
        }
    }

    pub fn setup() -> Vec<Value> {
        (0..4)
            .map(|i| {
                configure(
                    ASSETS[i],
                    TICKS[i],
                    1,
                    20,
                    if i == 2 { Some(580) } else { None },
                    "ACTIVE",
                )
            })
            .collect()
    }

    pub fn next(&mut self) -> Value {
        let roll: u32 = self.rng.gen_range(0..100);
        if roll < 70 || self.issued.is_empty() {
            return self.new_submit();
        }
        if roll < 85 {
            let reason = ["USER", "POLICY_BREACH", "ADMIN"][self.rng.gen_range(0..3usize)];
            if self.rng.gen_range(0..10u32) == 0 {
                return cancel(&uuid_n(900_000 + self.counter), reason);
            }
            let i = self.rng.gen_range(0..self.issued.len());
            let id = self.issued[i]["order_id"].as_str().unwrap().to_string();
            return cancel(&id, reason);
        }
        let i = self.rng.gen_range(0..self.issued.len());
        if roll < 90 {
            return self.issued[i].clone(); // exact duplicate
        }
        if roll < 93 {
            let mut c = self.issued[i].clone(); // id reuse, different payload
            c["qty"] = json!(c["qty"].as_u64().unwrap() + 1);
            return c;
        }
        let a = ASSETS[self.rng.gen_range(0..4usize)];
        if self.rng.gen_range(0..2u32) == 0 {
            json!({"type":"HaltAsset","asset":a})
        } else {
            json!({"type":"ResumeAsset","asset":a})
        }
    }

    fn new_submit(&mut self) -> Value {
        self.counter += 1;
        let id = uuid_n(self.counter);
        let ai = self.rng.gen_range(0..4usize);
        let tick = TICKS[ai];
        let user = format!("U{}", self.rng.gen_range(1..=5u32));
        let side = ["BUY", "SELL"][self.rng.gen_range(0..2usize)];
        let kind: u32 = self.rng.gen_range(0..100);
        let (ot, mut tif) = if kind < 10 {
            ("MARKET", "IOC")
        } else if kind < 30 {
            ("LIMIT", "IOC")
        } else {
            ("LIMIT", "GTC")
        };
        let mut qty = self.rng.gen_range(1..=6u64);
        let mut price = tick * (50 + self.rng.gen_range(0..=10u64));
        let mut asset = ASSETS[ai];
        match self.rng.gen_range(0..100u32) {
            0..=1 => qty = 0,
            2 => qty = 21,
            3 => price = if tick > 1 { price + 1 } else { 0 },
            4 => asset = "NOPE",
            5 => {
                if ot == "MARKET" {
                    tif = "GTC"
                }
            }
            _ => {}
        }
        let c = submit(&id, asset, &user, side, ot, tif, qty, price);
        self.issued.push(c.clone());
        c
    }
}
