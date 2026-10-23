use std::fs::{self, OpenOptions};
use std::io::Write;

use darkhold_core::Command;
use darkhold_engine::wal::*;
use serde_json::json;

fn cfg() -> Command {
    serde_json::from_value(json!({"type":"ConfigureAsset","asset":"TEST-A","tick_size":1,"min_qty":1,"max_qty":1000,"collar_max_price":null,"status":"ACTIVE"})).unwrap()
}
fn halt() -> Command {
    serde_json::from_value(json!({"type":"HaltAsset","asset":"TEST-A"})).unwrap()
}
fn rec(ts: u64, c: &Command) -> Vec<u8> {
    encode_command_record(ts, &serde_json::to_string(c).unwrap())
}

fn make(dir: &std::path::Path, n: usize) -> std::path::PathBuf {
    let mut w = Wal::create(dir, "e-test0001", 1).unwrap();
    for i in 0..n {
        let c = if i % 2 == 0 { cfg() } else { halt() };
        w.append_batch(&rec(1000 + i as u64, &c)).unwrap();
    }
    w.sync().unwrap();
    wal_path(dir)
}

#[test]
fn round_trip() {
    let d = tempfile::tempdir().unwrap();
    let p = make(d.path(), 3);
    let c = read_all(&p).unwrap();
    assert_eq!(c.header.engine_epoch, "e-test0001");
    assert_eq!(c.records.len(), 3);
    assert_eq!(c.records[2].ts, 1002);
    assert_eq!(c.discarded, 0);
}

#[test]
fn create_fails_if_exists() {
    let d = tempfile::tempdir().unwrap();
    make(d.path(), 0);
    assert!(Wal::create(d.path(), "e-test0002", 1).is_err());
}

#[test]
fn torn_tail_is_truncated() {
    let d = tempfile::tempdir().unwrap();
    let p = make(d.path(), 3);
    let len = fs::metadata(&p).unwrap().len();
    OpenOptions::new()
        .write(true)
        .open(&p)
        .unwrap()
        .set_len(len - 5)
        .unwrap();
    let c = read_all(&p).unwrap();
    assert_eq!(c.records.len(), 2);
    assert!(c.discarded > 0);
    truncate_to(&p, c.valid_end).unwrap();
    let c2 = read_all(&p).unwrap();
    assert_eq!(c2.records.len(), 2);
    assert_eq!(c2.discarded, 0);
}

#[test]
fn flipped_bit_detected() {
    let d = tempfile::tempdir().unwrap();
    let p = make(d.path(), 3);
    let mut data = fs::read(&p).unwrap();
    let last = data.len() - 2;
    data[last] ^= 0x01;
    fs::write(&p, data).unwrap();
    let c = read_all(&p).unwrap();
    assert_eq!(c.records.len(), 2);
    assert!(c.discarded > 0);
}

#[test]
fn oversize_length_is_corruption() {
    let d = tempfile::tempdir().unwrap();
    let p = make(d.path(), 1);
    let mut f = OpenOptions::new().append(true).open(&p).unwrap();
    let mut junk = Vec::new();
    junk.extend_from_slice(&(2u32 * 1024 * 1024).to_le_bytes());
    junk.extend_from_slice(&0u32.to_le_bytes());
    junk.push(REC_COMMAND);
    f.write_all(&junk).unwrap();
    let c = read_all(&p).unwrap();
    assert_eq!(c.records.len(), 1);
    assert_eq!(c.discarded, junk.len() as u64);
}

#[test]
fn bad_header_is_fatal() {
    let d = tempfile::tempdir().unwrap();
    let p = wal_path(d.path());
    fs::write(&p, vec![7u8; 40]).unwrap();
    assert!(matches!(read_all(&p), Err(WalError::BadHeader { .. })));
}
