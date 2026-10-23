//! Shared helpers for integration tests. The golden loader and reference model arrive at Step 5.
#![allow(dead_code)]

use std::path::PathBuf;

use darkhold_core::{AssetId, OrderId, UserId};
use jsonschema::JSONSchema;
use serde::Serialize;
use serde_json::Value;

/// Fixed epoch used by every golden scenario.
pub const EPOCH: &str = "e-test0001";

/// `<repo>/contracts`, found relative to this crate (engine/crates/darkhold-core).
pub fn contracts_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../contracts")
}

fn read_json(path: PathBuf) -> Value {
    let text = std::fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("cannot read {}: {e}", path.display()));
    serde_json::from_str(&text)
        .unwrap_or_else(|e| panic!("invalid JSON in {}: {e}", path.display()))
}

/// Compile `contracts/schemas/<file>`.
pub fn schema(file: &str) -> JSONSchema {
    let raw = read_json(contracts_dir().join("schemas").join(file));
    JSONSchema::compile(&raw).unwrap_or_else(|e| panic!("schema {file} failed to compile: {e}"))
}

/// Panics with every violation listed if `instance` does not satisfy `schema`.
pub fn assert_valid(schema: &JSONSchema, instance: &Value, what: &str) {
    if let Err(errors) = schema.validate(instance) {
        let msgs: Vec<String> = errors
            .map(|e| format!("{e} (at {})", e.instance_path))
            .collect();
        panic!(
            "{what} violates its schema:\n  {}\ninstance: {instance}",
            msgs.join("\n  ")
        );
    }
}

/// Panics if `instance` unexpectedly satisfies `schema`.
pub fn assert_invalid(schema: &JSONSchema, instance: &Value, what: &str) {
    assert!(
        !schema.is_valid(instance),
        "{what} should violate its schema but passed: {instance}"
    );
}

/// Serialize to a parsed JSON value (tests compare parsed values, never strings: rule D7).
pub fn normalize<T: Serialize>(value: &T) -> Value {
    serde_json::to_value(value).expect("serializable")
}

/// Fixed order id by name (`A`, `B`, `C`, `D`, `E`, `M`, `X`, `R1`..`R8`) from `fixtures/engine/ids.json`.
pub fn fixture_id(name: &str) -> OrderId {
    let ids = read_json(contracts_dir().join("fixtures/engine/ids.json"));
    let s = ids
        .get(name)
        .and_then(Value::as_str)
        .unwrap_or_else(|| panic!("no fixture id {name}"));
    OrderId::parse(s).expect("fixture ids are canonical uuids")
}

pub fn asset(s: &str) -> AssetId {
    AssetId::parse(s).expect("valid asset")
}

pub fn user(s: &str) -> UserId {
    UserId::parse(s).expect("valid user id")
}
