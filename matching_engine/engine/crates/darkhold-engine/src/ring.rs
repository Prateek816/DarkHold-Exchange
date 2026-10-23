//! Bounded in-memory log of serialized sequenced events for SSE resume.
use parking_lot::RwLock;
use std::collections::VecDeque;
use std::sync::Arc;
use tokio::sync::watch;

#[derive(Clone, Debug)]
pub struct RingEntry {
    pub seq: u64,
    /// Event type name, used as the SSE `event:` field.
    pub kind: Arc<str>,
    /// Serialized JSON.
    pub data: Arc<str>,
}

#[derive(Debug)]
pub enum ReadResult {
    Events(Vec<RingEntry>),
    Gone { start_seq: u64 },
    UpToDate,
}

struct Inner {
    deque: VecDeque<RingEntry>,
    published: u64,
}

pub struct EventRing {
    capacity: usize,
    inner: RwLock<Inner>,
    tx: watch::Sender<u64>,
}

impl EventRing {
    pub fn new(capacity: usize, initial_seq: u64) -> Self {
        let (tx, _rx) = watch::channel(initial_seq);
        EventRing {
            capacity: capacity.max(1),
            inner: RwLock::new(Inner {
                deque: VecDeque::new(),
                published: initial_seq,
            }),
            tx,
        }
    }

    /// Entries must be contiguous and in order.
    pub fn push_batch(&self, entries: Vec<RingEntry>) {
        if entries.is_empty() {
            return;
        }
        let last = {
            let mut g = self.inner.write();
            for e in entries {
                debug_assert_eq!(e.seq, g.published + 1, "ring requires contiguous seq");
                g.published = e.seq;
                g.deque.push_back(e);
                if g.deque.len() > self.capacity {
                    g.deque.pop_front();
                }
            }
            g.published
        };
        self.tx.send_replace(last);
    }

    pub fn published_seq(&self) -> u64 {
        self.inner.read().published
    }

    pub fn start_seq(&self) -> u64 {
        let g = self.inner.read();
        g.deque.front().map_or(g.published + 1, |e| e.seq)
    }

    pub fn len(&self) -> usize {
        self.inner.read().deque.len()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    pub fn subscribe(&self) -> watch::Receiver<u64> {
        self.tx.subscribe()
    }

    pub fn read_after(&self, after: u64, max: usize) -> ReadResult {
        let g = self.inner.read();
        if after >= g.published {
            return ReadResult::UpToDate;
        }
        match g.deque.front() {
            None => ReadResult::Gone {
                start_seq: g.published + 1,
            },
            Some(f) => {
                if after.saturating_add(1) < f.seq {
                    return ReadResult::Gone { start_seq: f.seq };
                }
                let idx = (after + 1 - f.seq) as usize;
                let v: Vec<RingEntry> = g.deque.range(idx..).take(max).cloned().collect();
                if v.is_empty() {
                    ReadResult::UpToDate
                } else {
                    ReadResult::Events(v)
                }
            }
        }
    }
}
