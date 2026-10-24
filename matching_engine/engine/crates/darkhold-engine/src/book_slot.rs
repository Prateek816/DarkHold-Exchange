use std::collections::{BTreeMap, HashMap};
use std::sync::Arc;

use parking_lot::RwLock;
use tokio::sync::watch;

struct Inner {
    map: BTreeMap<String, (u64, Arc<str>)>,
    global: u64,
}

pub struct BookSlot {
    inner: RwLock<Inner>,
    statuses: RwLock<BTreeMap<String, String>>,
    tx: watch::Sender<u64>,
}

impl BookSlot {
    pub fn new() -> Self {
        let (tx, _rx) = watch::channel(0u64);
        BookSlot {
            inner: RwLock::new(Inner {
                map: BTreeMap::new(),
                global: 0,
            }),
            statuses: RwLock::new(BTreeMap::new()),
            tx,
        }
    }

    pub fn set_status(&self, asset: &str, status: &str) {
        self.statuses
            .write()
            .insert(asset.to_string(), status.to_string());
    }

    pub fn statuses(&self) -> Vec<(String, String)> {
        self.statuses
            .read()
            .iter()
            .map(|(a, s)| (a.clone(), s.clone()))
            .collect()
    }

    pub fn store(&self, asset: &str, json: String) {
        let global = {
            let mut g = self.inner.write();
            g.global += 1;
            let global = g.global;
            let v = g.map.get(asset).map(|(v, _)| *v).unwrap_or(0) + 1;
            g.map.insert(asset.to_string(), (v, Arc::from(json)));
            global
        };
        let _ = self.tx.send(global);
    }

    /// Sorted by asset.
    pub fn snapshot_all(&self) -> Vec<(String, u64, Arc<str>)> {
        self.inner
            .read()
            .map
            .iter()
            .map(|(a, (v, j))| (a.clone(), *v, j.clone()))
            .collect()
    }

    /// Returns entries newer than the subscriber's versions and updates them.
    pub fn changed_since(&self, last: &mut HashMap<String, u64>) -> Vec<(String, Arc<str>)> {
        let g = self.inner.read();
        let mut out = Vec::new();
        for (a, (v, j)) in g.map.iter() {
            if last.get(a).copied().unwrap_or(0) < *v {
                last.insert(a.clone(), *v);
                out.push((a.clone(), j.clone()));
            }
        }
        out
    }

    pub fn subscribe(&self) -> watch::Receiver<u64> {
        self.tx.subscribe()
    }
}

impl Default for BookSlot {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn versions_increment() {
        let s = BookSlot::new();
        s.store("A", "1".into());
        s.store("A", "2".into());
        s.store("B", "3".into());
        let all = s.snapshot_all();
        assert_eq!(all[0].0, "A");
        assert_eq!(all[0].1, 2);
        assert_eq!(all[1].1, 1);
    }

    #[test]
    fn per_subscriber_change_detection() {
        let s = BookSlot::new();
        s.store("A", "1".into());
        let mut mine = HashMap::new();
        assert_eq!(s.changed_since(&mut mine).len(), 1);
        assert_eq!(s.changed_since(&mut mine).len(), 0);
        s.store("A", "2".into());
        let mut other = HashMap::new();
        assert_eq!(s.changed_since(&mut other).len(), 1);
        assert_eq!(s.changed_since(&mut mine).len(), 1);
    }
}
