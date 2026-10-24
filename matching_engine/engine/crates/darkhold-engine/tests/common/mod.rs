#![allow(dead_code)]
use darkhold_engine::{
    config::Config,
    core_thread::{CommandSink, Committed, NoopSink},
    http, start_core, AppState,
};
use serde_json::{json, Value};
use std::time::Duration;

pub const TOKEN: &str = "test-token";

pub struct Server {
    pub base: String,
    pub state: AppState,
}

pub struct SlowSink(pub Duration);
impl CommandSink for SlowSink {
    fn commit(&mut self, _b: &[Committed]) -> std::io::Result<()> {
        std::thread::sleep(self.0);
        Ok(())
    }
}

pub async fn start(cfg: Config) -> Server {
    start_with_sink(cfg, Box::new(NoopSink)).await
}

pub async fn start_with_sink(cfg: Config, sink: Box<dyn CommandSink>) -> Server {
    let running = start_core(cfg, "e-test0001".to_string(), sink);
    let app = http::router(running.state.clone());
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    Server {
        base: format!("http://{addr}"),
        state: running.state,
    }
}

pub fn cfg() -> Config {
    Config::for_tests(TOKEN)
}

pub async fn post(srv: &Server, body: &Value) -> reqwest::Response {
    reqwest::Client::new()
        .post(format!("{}/v1/commands", srv.base))
        .header("X-Engine-Token", TOKEN)
        .json(body)
        .send()
        .await
        .unwrap()
}

pub fn uuid_n(n: u64) -> String {
    format!("c0000000-0000-4000-8000-{:012x}", n)
}

pub fn configure_cmd() -> Value {
    json!({"type":"ConfigureAsset","asset":"TEST-A","tick_size":1,"min_qty":1,"max_qty":1000,"collar_max_price":null,"status":"ACTIVE"})
}

pub fn buy_cmd(n: u64, price: u64) -> Value {
    json!({"type":"SubmitOrder","order_id":uuid_n(n),"asset":"TEST-A","user_id":"U1","side":"BUY","order_type":"LIMIT","tif":"GTC","qty":1,"price":price})
}

pub async fn sse_open(srv: &Server, query: &str) -> reqwest::Response {
    reqwest::Client::new()
        .get(format!("{}/v1/events{}", srv.base, query))
        .header("X-Engine-Token", TOKEN)
        .send()
        .await
        .unwrap()
}

/// Reads chunks until the accumulated text contains `needle` (or panics after 5 s).
pub async fn read_until(resp: &mut reqwest::Response, needle: &str) -> String {
    let mut buf = String::new();
    let deadline = tokio::time::Instant::now() + Duration::from_secs(5);
    while !buf.contains(needle) {
        let left = deadline.saturating_duration_since(tokio::time::Instant::now());
        match tokio::time::timeout(left, resp.chunk()).await {
            Ok(Ok(Some(c))) => buf.push_str(&String::from_utf8_lossy(&c)),
            other => panic!("did not see {needle:?}; got {buf:?} ({other:?})"),
        }
    }
    buf
}
