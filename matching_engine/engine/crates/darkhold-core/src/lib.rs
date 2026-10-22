//! `darkhold-core`: pure deterministic matching core.
//! Rules D1 to D8 apply: no floats, no clock, no randomness, no threads, no I/O.

pub mod command;
pub mod config;
pub mod error;
pub mod event;
pub mod fingerprint;
pub mod reply;
pub mod types;

pub use command::*;
pub use config::*;
pub use error::*;
pub use event::*;
pub use fingerprint::*;
pub use reply::*;
pub use types::*;

pub mod book;
pub mod engine;
pub mod matcher;
pub mod outcome;
pub mod validate;
pub mod view;

pub use book::{AssetBook, PriceLevel, RestingOrder};
pub use engine::{BookStats, Engine, Processed};
pub use matcher::{match_order, Fill, Incoming, MatchResult};
pub use outcome::Outcome;
pub use validate::validate_submit;
pub use view::{BookView, LevelView, OpenOrderView, OpenOrdersView, OrderView};

#[cfg(test)]
mod testutil;
