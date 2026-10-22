use darkhold_engine::ring::{EventRing, ReadResult, RingEntry};
use std::sync::Arc;

fn entry(seq: u64) -> RingEntry {
    RingEntry {
        seq,
        kind: Arc::from("T"),
        data: Arc::from(format!("{{\"seq\":{seq}}}").as_str()),
    }
}
fn push(r: &EventRing, a: u64, b: u64) {
    r.push_batch((a..=b).map(entry).collect());
}

#[test]
fn empty_ring() {
    let r = EventRing::new(10, 0);
    assert_eq!(r.start_seq(), 1);
    assert_eq!(r.len(), 0);
    assert!(matches!(r.read_after(0, 10), ReadResult::UpToDate));
}

#[test]
fn read_after_returns_later_events_in_order() {
    let r = EventRing::new(10, 0);
    push(&r, 1, 5);
    match r.read_after(2, 10) {
        ReadResult::Events(v) => {
            assert_eq!(v.iter().map(|e| e.seq).collect::<Vec<_>>(), vec![3, 4, 5])
        }
        o => panic!("{o:?}"),
    }
    match r.read_after(0, 2) {
        ReadResult::Events(v) => assert_eq!(v.len(), 2),
        o => panic!("{o:?}"),
    }
    assert!(matches!(r.read_after(5, 10), ReadResult::UpToDate));
}

#[test]
fn eviction_and_gone_boundaries() {
    let r = EventRing::new(3, 0);
    push(&r, 1, 6); // keeps 4..6
    assert_eq!(r.len(), 3);
    assert_eq!(r.start_seq(), 4);
    assert_eq!(r.published_seq(), 6);
    assert!(matches!(
        r.read_after(2, 10),
        ReadResult::Gone { start_seq: 4 }
    ));
    match r.read_after(3, 10) {
        ReadResult::Events(v) => assert_eq!(v[0].seq, 4), // after + 1 == start is allowed
        o => panic!("{o:?}"),
    }
}

#[test]
fn empty_ring_with_history_is_gone() {
    let r = EventRing::new(10, 5); // e.g. after a restart with nothing retained
    assert_eq!(r.start_seq(), 6);
    assert!(matches!(
        r.read_after(2, 10),
        ReadResult::Gone { start_seq: 6 }
    ));
    assert!(matches!(r.read_after(5, 10), ReadResult::UpToDate));
}

#[tokio::test]
async fn watch_notifies_on_push() {
    let r = EventRing::new(10, 0);
    let mut rx = r.subscribe();
    push(&r, 1, 1);
    rx.changed().await.unwrap();
    assert_eq!(*rx.borrow(), 1);
}

#[test]
fn concurrent_reader_sees_contiguous_events() {
    let r = Arc::new(EventRing::new(100_000, 0));
    let w = r.clone();
    let writer = std::thread::spawn(move || {
        for s in 1..=20_000u64 {
            w.push_batch(vec![entry(s)]);
        }
    });
    let mut cursor = 0u64;
    while cursor < 20_000 {
        if let ReadResult::Events(v) = r.read_after(cursor, 500) {
            for e in v {
                assert_eq!(e.seq, cursor + 1);
                cursor = e.seq;
            }
        }
    }
    writer.join().unwrap();
}
