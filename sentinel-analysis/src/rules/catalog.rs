use serde::{Deserialize, Serialize};
use std::fmt;

/// Represents the severity level of a rule
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RuleSeverity {
    Error,
    Warning,
    Info,
    Off,
}

impl fmt::Display for RuleSeverity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RuleSeverity::Error => write!(f, "error"),
            RuleSeverity::Warning => write!(f, "warn"),
            RuleSeverity::Info => write!(f, "info"),
            RuleSeverity::Off => write!(f, "off"),
        }
    }
}

impl From<&str> for RuleSeverity {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "error" => RuleSeverity::Error,
            "warn" | "warning" => RuleSeverity::Warning,
            "info" => RuleSeverity::Info,
            "off" | "none" => RuleSeverity::Off,
            _ => RuleSeverity::Error, // Default to error for unknown values
        }
    }
}

/// Represents the category of a rule
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RuleCategory {
    Angular,
    BestPractices,
    Correctness,
    Performance,
    Style,
} 