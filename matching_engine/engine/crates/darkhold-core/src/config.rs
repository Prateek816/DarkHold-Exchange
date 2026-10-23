//! Per-asset configuration and its validation.

use serde::{Deserialize, Serialize};

use crate::command::ConfigureAsset;
use crate::types::{AssetStatus, Price, Qty, RejectCode, MAX_SAFE};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AssetConfig {
    pub tick_size: u64,
    pub min_qty: Qty,
    pub max_qty: Qty,
    pub collar_max_price: Option<Price>,
    pub status: AssetStatus,
}

impl From<&ConfigureAsset> for AssetConfig {
    fn from(c: &ConfigureAsset) -> Self {
        Self {
            tick_size: c.tick_size,
            min_qty: c.min_qty,
            max_qty: c.max_qty,
            collar_max_price: c.collar_max_price,
            status: c.status,
        }
    }
}

/// `Err(RejectCode::InvalidConfig)` when: `tick_size == 0`, `min_qty == 0`, `max_qty < min_qty`,
/// `collar_max_price == Some(0)`, or any value above `MAX_SAFE`.
pub fn validate_config(cfg: &AssetConfig) -> Result<(), RejectCode> {
    let collar_bad = matches!(cfg.collar_max_price, Some(0))
        || matches!(cfg.collar_max_price, Some(c) if c > MAX_SAFE);
    let bad = cfg.tick_size == 0
        || cfg.min_qty == 0
        || cfg.max_qty < cfg.min_qty
        || cfg.tick_size > MAX_SAFE
        || cfg.min_qty > MAX_SAFE
        || cfg.max_qty > MAX_SAFE
        || collar_bad;
    if bad {
        Err(RejectCode::InvalidConfig)
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ok() -> AssetConfig {
        AssetConfig {
            tick_size: 1,
            min_qty: 1,
            max_qty: 1000,
            collar_max_price: None,
            status: AssetStatus::Active,
        }
    }

    #[test]
    fn valid_configs_pass() {
        assert_eq!(validate_config(&ok()), Ok(()));
        let c = AssetConfig {
            collar_max_price: Some(200),
            min_qty: 5,
            max_qty: 5,
            ..ok()
        };
        assert_eq!(validate_config(&c), Ok(()));
        let c = AssetConfig {
            tick_size: MAX_SAFE,
            max_qty: MAX_SAFE,
            collar_max_price: Some(MAX_SAFE),
            ..ok()
        };
        assert_eq!(validate_config(&c), Ok(()));
        let c = AssetConfig {
            status: AssetStatus::Halted,
            ..ok()
        };
        assert_eq!(validate_config(&c), Ok(()));
    }

    #[test]
    fn each_invalid_case_is_rejected() {
        let cases = [
            AssetConfig {
                tick_size: 0,
                ..ok()
            },
            AssetConfig { min_qty: 0, ..ok() },
            AssetConfig {
                min_qty: 10,
                max_qty: 9,
                ..ok()
            },
            AssetConfig {
                collar_max_price: Some(0),
                ..ok()
            },
            AssetConfig {
                tick_size: MAX_SAFE + 1,
                ..ok()
            },
            AssetConfig {
                min_qty: MAX_SAFE + 1,
                max_qty: MAX_SAFE + 2,
                ..ok()
            },
            AssetConfig {
                max_qty: MAX_SAFE + 1,
                ..ok()
            },
            AssetConfig {
                collar_max_price: Some(MAX_SAFE + 1),
                ..ok()
            },
        ];
        for (i, c) in cases.iter().enumerate() {
            assert_eq!(
                validate_config(c),
                Err(RejectCode::InvalidConfig),
                "case {i}"
            );
        }
    }

    #[test]
    fn converts_from_command() {
        let cmd = ConfigureAsset {
            asset: crate::types::AssetId::parse("TEST-A").unwrap(),
            tick_size: 10,
            min_qty: 1,
            max_qty: 5,
            collar_max_price: Some(200),
            status: AssetStatus::Halted,
        };
        let cfg = AssetConfig::from(&cmd);
        assert_eq!(
            cfg,
            AssetConfig {
                tick_size: 10,
                min_qty: 1,
                max_qty: 5,
                collar_max_price: Some(200),
                status: AssetStatus::Halted
            }
        );
    }
}
