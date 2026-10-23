//! The only wall-clock read in the engine process.
use std::time::{SystemTime, UNIX_EPOCH};

pub const MAX_SAFE: u64 = 9_007_199_254_740_991;

pub fn now_ms() -> u64 {
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    ms.min(MAX_SAFE)
}
