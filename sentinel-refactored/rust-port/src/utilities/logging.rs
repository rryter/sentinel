use serde::{Deserialize, Serialize};
use std::str::FromStr;

/// Debug level enum for controlling output verbosity
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum DebugLevel {
    None,
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

impl Default for DebugLevel {
    fn default() -> Self {
        DebugLevel::Info
    }
}

impl FromStr for DebugLevel {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "none" => Ok(DebugLevel::None),
            "error" => Ok(DebugLevel::Error),
            "warn" => Ok(DebugLevel::Warn),
            "info" => Ok(DebugLevel::Info),
            "debug" => Ok(DebugLevel::Debug),
            "trace" => Ok(DebugLevel::Trace),
            _ => Err(format!("Invalid debug level: {}", s)),
        }
    }
}

/// Log a message if the current debug level is greater than or equal to the message level
pub fn log(level: DebugLevel, current_level: DebugLevel, message: &str) {
    if level as usize <= current_level as usize {
        match level {
            DebugLevel::Error => eprintln!("ERROR: {}", message),
            DebugLevel::Warn => eprintln!("WARN: {}", message),
            DebugLevel::Info => println!("INFO: {}", message),
            DebugLevel::Debug => println!("DEBUG: {}", message),
            DebugLevel::Trace => println!("TRACE: {}", message),
            DebugLevel::None => {}
        }
    }
}
