//! Shared helpers for the darkhold-engine integration tests.
//! Every test spawns the real engine binary as a child process on a free port.
#![allow(dead_code)]

use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::process::{Child, ExitStatus, Stdio};
use std::time::{Duration, Instant};

use futures_util::{Stream, StreamExt};
use serde_json::{json, Value};

pub const TOKEN: &str = "test-token-123";

pub fn free_port() -> u16 {
    let l = TcpListener::bind("127.0.0.1:0").expect("bind free port");
    l.local_addr().expect("local addr").port()
}

// ---------------------------------------------------------------------------
// Server process
// ---------------------------------------------------------------------------

pub struct Server {
    child: Option<Child>,
    pub port: u16,
    wal_dir: PathBuf,
    extra: Vec<(String, String)>,
    pub client: reqwest::Client,
}

impl Server {
    pub async fn start(wal_dir: &Path, extra: &[(&str, &str)]) -> Server {
        let mut s = Server {
            child: None,
            port: 0,
            wal_dir: wal_dir.to_path_buf(),
            extra: extra
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
            client: reqwest::Client::new(),
        };
        s.spawn().await;
        s
    }

    /// Spawn the engine on a fresh port and wait until /healthz answers.
    pub async fn spawn(&mut self) {
        self.port = free_port();
        let mut cmd = std::process::Command::new(env!("CARGO_BIN_EXE_darkhold-engine"));
        cmd.env("ENGINE_BIND", format!("127.0.0.1:{}", self.port))
            .env("ENGINE_TOKEN", TOKEN)
            .env("WAL_DIR", &self.wal_dir)
            .env("LOG_LEVEL", "warn")
            .env("LOG_FORMAT", "pretty")
            .env("FSYNC_POLICY", "batch")
            .stdin(Stdio::null());
        for (k, v) in &self.extra {
            cmd.env(k, v);
        }
        if std::env::var("DARKHOLD_TEST_LOG").is_ok() {
            cmd.stdout(Stdio::inherit()).stderr(Stdio::inherit());
        } else {
            cmd.stdout(Stdio::null()).stderr(Stdio::null());
        }
        self.child = Some(cmd.spawn().expect("spawn darkhold-engine"));
        self.wait_healthy().await;
    }

    async fn wait_healthy(&mut self) {
        let deadline = Instant::now() + Duration::from_secs(15);
        loop {
            if let Ok(r) = self.client.get(self.url("/healthz")).send().await {
                if r.status().is_success() {
                    return;
                }
            }
            if let Some(c) = self.child.as_mut() {
                if let Ok(Some(st)) = c.try_wait() {
                    panic!("engine exited during startup: {st}");
                }
            }
            if Instant::now() > deadline {
                panic!("engine did not become healthy within 15 s");
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
    }

    /// SIGKILL on Unix.
    pub fn kill(&mut self) {
        if let Some(mut c) = self.child.take() {
            let _ = c.kill();
            let _ = c.wait();
        }
    }

    pub async fn restart(&mut self) {
        self.kill();
        self.spawn().await;
    }

    /// Send SIGTERM and wait for the process to exit. Unix only.
    #[cfg(unix)]
    pub fn terminate_and_wait(&mut self, secs: u64) -> Option<ExitStatus> {
        let mut child = self.child.take()?;
        let _ = std::process::Command::new("kill")
            .args(["-TERM", &child.id().to_string()])
            .status();
        let deadline = Instant::now() + Duration::from_secs(secs);
        loop {
            if let Ok(Some(st)) = child.try_wait() {
                return Some(st);
            }
            if Instant::now() > deadline {
                let _ = child.kill();
                let _ = child.wait();
                return None;
            }
            std::thread::sleep(Duration::from_millis(25));
        }
    }

    pub fn base(&self) -> String {
        format!("http://127.0.0.1:{}", self.port)
    }

    pub fn url(&self, path: &str) -> String {
        format!("{}{}", self.base(), path)
    }

    /// Clone of what a background task needs to talk to this server.
    pub fn handle(&self) -> (reqwest::Client, String) {
        (self.client.clone(), self.base())
    }

    pub async fn get(&self, path: &str) -> (u16, Value) {
        let r = self
            .client
            .get(self.url(path))
            .header("X-Engine-Token", TOKEN)
            .send()
            .await
            .expect("GET request");
        to_pair(r).await
    }

    pub async fn get_with_token(&self, path: &str, token: Option<&str>) -> (u16, Value) {
        let mut rb = self.client.get(self.url(path));
        if let Some(t) = token {
            rb = rb.header("X-Engine-Token", t);
        }
        to_pair(rb.send().await.expect("GET request")).await
    }

    pub async fn post_command(&self, cmd: &Value) -> (u16, Value) {
        post_command_to(&self.client, &self.base(), cmd)
            .await
            .expect("POST request")
    }

    pub async fn post_raw(&self, body: Vec<u8>, token: Option<&str>) -> (u16, Value) {
        let mut rb = self
            .client
            .post(self.url("/v1/commands"))
            .header("Content-Type", "application/json")
            .body(body);
        if let Some(t) = token {
            rb = rb.header("X-Engine-Token", t);
        }
        to_pair(rb.send().await.expect("POST request")).await
    }

    pub async fn health(&self) -> Value {
        let (st, v) = self.get_with_token("/healthz", None).await;
        assert_eq!(st, 200, "healthz: {v}");
        v
    }

    pub async fn epoch(&self) -> String {
        self.health().await["engine_epoch"]
            .as_str()
            .expect("engine_epoch")
            .to_string()
    }

    /// Open the SSE endpoint. `query` is the raw query string without '?'.
    pub async fn open_sse(&self, query: &str) -> Result<SseStream, (u16, Value)> {
        self.open_sse_with_token(query, Some(TOKEN)).await
    }

    pub async fn open_sse_with_token(
        &self,
        query: &str,
        token: Option<&str>,
    ) -> Result<SseStream, (u16, Value)> {
        let q = if query.is_empty() {
            String::new()
        } else {
            format!("?{query}")
        };
        let mut rb = self.client.get(self.url(&format!("/v1/events{q}")));
        if let Some(t) = token {
            rb = rb.header("X-Engine-Token", t);
        }
        let resp = rb.send().await.expect("SSE request");
        if resp.status().as_u16() != 200 {
            return Err(to_pair(resp).await);
        }
        let s = resp
            .bytes_stream()
            .map(|r| r.map(|b| b.to_vec()).map_err(|e| e.to_string()));
        Ok(SseStream {
            stream: Box::pin(s),
            buf: String::new(),
        })
    }
}

impl Drop for Server {
    fn drop(&mut self) {
        self.kill();
    }
}

pub async fn to_pair(r: reqwest::Response) -> (u16, Value) {
    let st = r.status().as_u16();
    let txt = r.text().await.unwrap_or_default();
    let v = serde_json::from_str(&txt).unwrap_or(Value::Null);
    (st, v)
}

/// Used by background tasks that do not own the Server.
pub async fn post_command_to(
    client: &reqwest::Client,
    base: &str,
    cmd: &Value,
) -> Result<(u16, Value), reqwest::Error> {
    let r = client
        .post(format!("{base}/v1/commands"))
        .header("X-Engine-Token", TOKEN)
        .json(cmd)
        .send()
        .await?;
    let st = r.status().as_u16();
    let txt = r.text().await?;
    Ok((st, serde_json::from_str(&txt).unwrap_or(Value::Null)))
}

// ---------------------------------------------------------------------------
// SSE reader
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq)]
pub struct SseFrame {
    pub event: Option<String>,
    pub id: Option<String>,
    pub data: Option<String>,
    pub comment: bool,
}

impl SseFrame {
    pub fn json(&self) -> Value {
        serde_json::from_str(self.data.as_deref().expect("frame has data")).expect("frame json")
    }
}

pub struct SseStream {
    stream: Pin<Box<dyn Stream<Item = Result<Vec<u8>, String>> + Send>>,
    buf: String,
}

impl SseStream {
    /// Next frame, or None on timeout / end of stream.
    pub async fn next_frame(&mut self, timeout: Duration) -> Option<SseFrame> {
        let deadline = Instant::now() + timeout;
        loop {
            if let Some(pos) = self.buf.find("\n\n") {
                let raw: String = self.buf.drain(..pos + 2).collect();
                if let Some(f) = parse_frame(&raw) {
                    return Some(f);
                }
                continue;
            }
            let left = deadline.saturating_duration_since(Instant::now());
            if left.is_zero() {
                return None;
            }
            match tokio::time::timeout(left, self.stream.next()).await {
                Ok(Some(Ok(chunk))) => {
                    let s = String::from_utf8_lossy(&chunk).replace("\r\n", "\n");
                    self.buf.push_str(&s);
                }
                _ => return None,
            }
        }
    }

    /// Collect `n` sequenced frames (frames that carry an `id:`). Panics on timeout.
    pub async fn collect_sequenced(&mut self, n: usize) -> Vec<SseFrame> {
        let mut out = Vec::new();
        while out.len() < n {
            let f = self
                .next_frame(Duration::from_secs(5))
                .await
                .unwrap_or_else(|| {
                    panic!("timed out after {} of {} sequenced frames", out.len(), n)
                });
            if f.id.is_some() {
                out.push(f);
            }
        }
        out
    }
}

fn parse_frame(raw: &str) -> Option<SseFrame> {
    let mut f = SseFrame {
        event: None,
        id: None,
        data: None,
        comment: false,
    };
    let mut any = false;
    for line in raw.lines() {
        if line.is_empty() {
            continue;
        }
        any = true;
        if line.starts_with(':') {
            f.comment = true;
        } else if let Some(v) = line.strip_prefix("event:") {
            f.event = Some(v.trim_start().to_string());
        } else if let Some(v) = line.strip_prefix("id:") {
            f.id = Some(v.trim_start().to_string());
        } else if let Some(v) = line.strip_prefix("data:") {
            let v = v.strip_prefix(' ').unwrap_or(v);
            match f.data.as_mut() {
                Some(d) => {
                    d.push('\n');
                    d.push_str(v);
                }
                None => f.data = Some(v.to_string()),
            }
        }
    }
    if any {
        Some(f)
    } else {
        None
    }
}

// ---------------------------------------------------------------------------
// Command builders
// ---------------------------------------------------------------------------

/// Deterministic, valid v4-formatted lowercase uuid from a number.
pub fn uuid_from(n: u128) -> String {
    let mut x = n;
    x = (x & !(0xfu128 << 76)) | (4u128 << 76);
    x = (x & !(0x3u128 << 62)) | (0x2u128 << 62);
    uuid::Uuid::from_u128(x).hyphenated().to_string()
}

/// Order id from a (namespace, counter) pair.
pub fn oid(ns: u64, n: u64) -> String {
    uuid_from(((ns as u128 & 0xfff) << 64) | n as u128)
}

pub fn configure(asset: &str, tick: u64, min: u64, max: u64, collar: Option<u64>) -> Value {
    json!({
        "type": "ConfigureAsset",
        "asset": asset,
        "tick_size": tick,
        "min_qty": min,
        "max_qty": max,
        "collar_max_price": collar,
        "status": "ACTIVE"
    })
}

#[allow(clippy::too_many_arguments)]
pub fn submit(
    id: &str,
    asset: &str,
    user: &str,
    side: &str,
    order_type: &str,
    tif: &str,
    qty: u64,
    price: u64,
) -> Value {
    json!({
        "type": "SubmitOrder",
        "order_id": id,
        "asset": asset,
        "user_id": user,
        "side": side,
        "order_type": order_type,
        "tif": tif,
        "qty": qty,
        "price": price
    })
}

pub fn limit_gtc(id: &str, asset: &str, user: &str, side: &str, qty: u64, price: u64) -> Value {
    submit(id, asset, user, side, "LIMIT", "GTC", qty, price)
}

pub fn cancel(id: &str, reason: &str) -> Value {
    json!({ "type": "CancelOrder", "order_id": id, "reason": reason })
}

pub fn halt(asset: &str) -> Value {
    json!({ "type": "HaltAsset", "asset": asset })
}

pub fn resume(asset: &str) -> Value {
    json!({ "type": "ResumeAsset", "asset": asset })
}

pub async fn setup_test_asset(s: &Server) {
    let (st, r) = s.post_command(&configure("TEST-A", 1, 1, 1000, None)).await;
    assert_eq!(st, 200, "{r}");
    assert_eq!(r["status"], "OK", "{r}");
}
