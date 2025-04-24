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
            DebugLevel::Error => eprintln!("\x1b[91mERROR:\x1b[0m {}", message),
            DebugLevel::Warn => eprintln!("\x1b[93mWARN:\x1b[0m {}", message),
            DebugLevel::Info => println!("\x1b[94mINFO:\x1b[0m {}", message),
            DebugLevel::Debug => println!("\x1b[95mDEBUG:\x1b[0m {}", message),
            DebugLevel::Trace => println!("\x1b[90mTRACE:\x1b[0m {}", message),
            DebugLevel::None => {}
        }
    }
}
