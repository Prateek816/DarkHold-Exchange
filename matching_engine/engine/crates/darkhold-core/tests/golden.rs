#[path = "support/common.rs"]
mod common;
use common::*;
use serde_json::{json, Value};
use std::fs;

#[test]
fn golden_scenarios() {
    let dir = contracts_dir().join("fixtures/engine/scenarios");
    let mut files: Vec<_> = fs::read_dir(&dir)
        .expect("scenarios directory")
        .map(|e| e.unwrap().path())
        .filter(|p| p.extension().is_some_and(|x| x == "json"))
        .collect();
    files.sort();
    assert_eq!(files.len(), 24, "exactly 24 golden scenarios are required");
    let update = std::env::var("UPDATE_GOLDEN").is_ok_and(|v| v == "1");

    for path in files {
        let mut doc: Value = serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        let name = path.file_name().unwrap().to_string_lossy().to_string();
        assert_eq!(doc["engine_epoch"], json!(EPOCH), "{name}");
        let mut engine = new_engine();
        let n = doc["steps"].as_array().unwrap().len();
        for i in 0..n {
            let step = doc["steps"][i].clone();
            let ts = step["ts"].as_u64().unwrap();
            let (evs, reply) = process_json(&mut engine, &step["command"], ts);
            check_invariants(&engine);
            let has_book = step.get("expect_book").is_some();
            if update {
                doc["steps"][i]["expect_reply"] = reply;
                doc["steps"][i]["expect_events"] = Value::Array(evs);
                if has_book {
                    let b = book_json(&engine, "TEST-A");
                    doc["steps"][i]["expect_book"] = json!({
                        "bids": levels_obj(&norm_levels(&b["bids"])),
                        "asks": levels_obj(&norm_levels(&b["asks"])),
                    });
                }
                continue;
            }
            assert_eq!(reply, step["expect_reply"], "{name} step {i} reply");
            assert_eq!(
                Value::Array(evs),
                step["expect_events"],
                "{name} step {i} events"
            );
            if has_book {
                let b = book_json(&engine, "TEST-A");
                let eb = &step["expect_book"];
                assert_eq!(
                    norm_levels(&b["bids"]),
                    norm_levels(&eb["bids"]),
                    "{name} step {i} bids"
                );
                assert_eq!(
                    norm_levels(&b["asks"]),
                    norm_levels(&eb["asks"]),
                    "{name} step {i} asks"
                );
            }
        }
        if update {
            fs::write(&path, serde_json::to_string_pretty(&doc).unwrap() + "\n").unwrap();
        }
    }
}

fn levels_obj(v: &Value) -> Value {
    Value::Array(
        v.as_array()
            .unwrap()
            .iter()
            .map(|l| json!({"price": l[0], "qty": l[1], "orders": l[2]}))
            .collect(),
    )
}
