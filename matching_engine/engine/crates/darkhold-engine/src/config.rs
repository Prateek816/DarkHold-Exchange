//! Typed environment parsing (coding plan section 15.1).
use std::str::FromStr;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FsyncPolicy {
    Always,
    Batch,
    Off,
}

impl FromStr for FsyncPolicy {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, String> {
        match s.to_ascii_lowercase().as_str() {
            "always" => Ok(Self::Always),
            "batch" => Ok(Self::Batch),
            "off" => Ok(Self::Off),
            o => Err(format!("FSYNC_POLICY must be always|batch|off, got '{o}'")),
        }
    }
}

#[derive(Clone, Debug)]
pub struct Config {
    pub bind: String,
    pub token: String,
    pub wal_dir: String,
    pub fsync_policy: FsyncPolicy,
    pub queue_capacity: usize,
    pub max_batch: usize,
    pub command_timeout_ms: u64,
    pub ring_capacity: usize,
    pub snapshot_tick_ms: u64,
    pub snapshot_depth: usize,
    pub sse_heartbeat_ms: u64,
    pub sse_max_subscribers: usize,
    pub max_body_bytes: usize,
    pub paranoid: bool,
    pub log_level: String,
    pub log_format: String,
}

fn num<T: FromStr, F: Fn(&str) -> Option<String>>(
    get: &F,
    key: &str,
    default: T,
) -> Result<T, String> {
    match get(key) {
        None => Ok(default),
        Some(v) => v
            .trim()
            .parse::<T>()
            .map_err(|_| format!("{key} has invalid value '{v}'")),
    }
}

impl Config {
    pub fn from_env() -> Result<Config, String> {
        Self::from_lookup(|k| std::env::var(k).ok())
    }

    pub fn from_lookup<F: Fn(&str) -> Option<String>>(get: F) -> Result<Config, String> {
        let token = get("ENGINE_TOKEN")
            .filter(|t| !t.is_empty())
            .ok_or("ENGINE_TOKEN is required and must not be empty")?;
        let fsync_policy = match get("FSYNC_POLICY") {
            None => FsyncPolicy::Batch,
            Some(v) => v.parse()?,
        };
        let log_format = get("LOG_FORMAT").unwrap_or_else(|| "json".into());
        if log_format != "json" && log_format != "pretty" {
            return Err("LOG_FORMAT must be json or pretty".into());
        }
        let c = Config {
            bind: get("ENGINE_BIND").unwrap_or_else(|| "0.0.0.0:7000".into()),
            token,
            wal_dir: get("WAL_DIR").unwrap_or_else(|| "./data".into()),
            fsync_policy,
            queue_capacity: num(&get, "QUEUE_CAPACITY", 10_000usize)?,
            max_batch: num(&get, "MAX_BATCH", 256usize)?,
            command_timeout_ms: num(&get, "COMMAND_TIMEOUT_MS", 2000u64)?,
            ring_capacity: num(&get, "RING_CAPACITY", 300_000usize)?,
            snapshot_tick_ms: num(&get, "SNAPSHOT_TICK_MS", 100u64)?,
            snapshot_depth: num(&get, "SNAPSHOT_DEPTH", 15usize)?,
            sse_heartbeat_ms: num(&get, "SSE_HEARTBEAT_MS", 15_000u64)?,
            sse_max_subscribers: num(&get, "SSE_MAX_SUBSCRIBERS", 8usize)?,
            max_body_bytes: num(&get, "MAX_BODY_BYTES", 16_384usize)?,
            paranoid: get("PARANOID").is_some_and(|v| v == "1"),
            log_level: get("LOG_LEVEL").unwrap_or_else(|| "info".into()),
            log_format,
        };
        if c.queue_capacity < 16 {
            return Err("QUEUE_CAPACITY must be at least 16".into());
        }
        if c.max_batch < 1 {
            return Err("MAX_BATCH must be at least 1".into());
        }
        if c.ring_capacity < 1000 {
            return Err("RING_CAPACITY must be at least 1000".into());
        }
        if c.snapshot_depth < 1 || c.snapshot_depth > 100 {
            return Err("SNAPSHOT_DEPTH must be between 1 and 100".into());
        }
        Ok(c)
    }

    /// Small, fast values for integration tests (bypasses the range checks on purpose).
    pub fn for_tests(token: &str) -> Config {
        Config {
            bind: "127.0.0.1:0".into(),
            token: token.into(),
            wal_dir: "./data".into(),
            fsync_policy: FsyncPolicy::Off,
            queue_capacity: 1000,
            max_batch: 64,
            command_timeout_ms: 2000,
            ring_capacity: 10_000,
            snapshot_tick_ms: 100,
            snapshot_depth: 15,
            sse_heartbeat_ms: 15_000,
            sse_max_subscribers: 8,
            max_body_bytes: 16_384,
            paranoid: false,
            log_level: "warn".into(),
            log_format: "pretty".into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn lookup(pairs: &[(&str, &str)]) -> impl Fn(&str) -> Option<String> {
        let m: HashMap<String, String> = pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();
        move |k| m.get(k).cloned()
    }

    #[test]
    fn defaults() {
        let c = Config::from_lookup(lookup(&[("ENGINE_TOKEN", "t")])).unwrap();
        assert_eq!(c.bind, "0.0.0.0:7000");
        assert_eq!(c.queue_capacity, 10_000);
        assert_eq!(c.max_batch, 256);
        assert_eq!(c.ring_capacity, 300_000);
        assert_eq!(c.fsync_policy, FsyncPolicy::Batch);
        assert_eq!(c.sse_max_subscribers, 8);
        assert_eq!(c.max_body_bytes, 16_384);
    }

    #[test]
    fn token_required() {
        assert!(Config::from_lookup(lookup(&[])).is_err());
        assert!(Config::from_lookup(lookup(&[("ENGINE_TOKEN", "")])).is_err());
    }

    #[test]
    fn invalid_values_rejected() {
        for (k, v) in [
            ("QUEUE_CAPACITY", "8"),
            ("MAX_BATCH", "0"),
            ("RING_CAPACITY", "10"),
            ("SNAPSHOT_DEPTH", "101"),
            ("SNAPSHOT_DEPTH", "0"),
            ("FSYNC_POLICY", "sometimes"),
            ("COMMAND_TIMEOUT_MS", "abc"),
            ("LOG_FORMAT", "xml"),
        ] {
            assert!(
                Config::from_lookup(lookup(&[("ENGINE_TOKEN", "t"), (k, v)])).is_err(),
                "{k}={v}"
            );
        }
    }

    #[test]
    fn policy_parsing() {
        assert_eq!(
            "always".parse::<FsyncPolicy>().unwrap(),
            FsyncPolicy::Always
        );
        assert_eq!("OFF".parse::<FsyncPolicy>().unwrap(), FsyncPolicy::Off);
    }
}
