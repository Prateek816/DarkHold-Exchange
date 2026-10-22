//! Typed parse and internal errors. No error carries behavior.

use thiserror::Error;

/// Input failed validation while parsing. Surfaces as HTTP 400 `VALIDATION_FAILED`.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
#[error("{message}")]
pub struct ParseError {
    pub message: String,
}

impl ParseError {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

/// An internal invariant was broken. The engine shell aborts the process on this.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
#[error("invariant violation: {message}")]
pub struct InvariantViolation {
    pub message: String,
}

impl InvariantViolation {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}
