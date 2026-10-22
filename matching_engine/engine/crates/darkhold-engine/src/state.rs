use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use crossbeam_channel::Sender;

use crate::book_slot::BookSlot;
use crate::config::Config;
use crate::jobs::Job;
use crate::metrics::Metrics;
use crate::ring::Ring;

#[derive(Clone)]
pub struct AppState {
    pub tx: Sender<Job>,
    pub config: Arc<Config>,
    pub ring: Arc<Ring>,
    pub slot: Arc<BookSlot>,
    pub metrics: Arc<Metrics>,
    pub core_alive: Arc<AtomicBool>,
    pub epoch: Arc<str>,
}
