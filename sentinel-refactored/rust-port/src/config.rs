use serde::Deserialize;
use std::collections::HashSet;
use typescript_analyzer::rules::RuleSeverity;
use std::fs;
use anyhow::{Context, Result};

#[derive(Debug, Deserialize, Default)]
#[serde(deny_unknown_fields)]
pub struct Config {
    #[serde(default)]
    pub rules: RuleConfig,
    #[serde(default)]
    pub debug: DebugConfig,
}

#[derive(Debug, Deserialize, Default)]
#[serde(deny_unknown_fields)]
pub struct RuleConfig {
    #[serde(default)]
    pub enable: HashSet<String>,
    #[serde(default)]
    pub disable: HashSet<String>,
    #[serde(default)]
    pub enable_tags: HashSet<String>,
    #[serde(default)]
    pub disable_tags: HashSet<String>,
    pub min_severity: Option<RuleSeverity>, // Need to handle deserialization carefully if case-insensitive
    
    /// Path to export rule findings to a JSON file (if specified)
    pub export_json: Option<String>,
    
    /// Path to export rule performance data to a JSON file (if specified)
    pub export_performance_json: Option<String>,
}

#[derive(Debug, Deserialize, Default, Clone)]
#[serde(deny_unknown_fields)]
pub struct DebugConfig {
    #[serde(default)]
    pub rules: bool,
    // Add other flags here as needed, matching sentinel.yaml
    // pub parser: bool,
    // pub config_loading: bool,
    // pub custom_plugins: bool,
}

// --- Helper for case-insensitive RuleSeverity Deserialization ---
// We might need a custom deserializer or parse the string manually later
// if we want case-insensitivity for RuleSeverity in YAML.
// For now, let's assume the user writes it exactly as "Error", "Warning", or "Info".

// --- Loading Function (placeholder) ---
impl Config {
    pub fn load(path: &str) -> Result<Self> {
        match fs::read_to_string(path) {
            Ok(content) => {
                serde_yaml::from_str(&content)
                    .with_context(|| format!("Failed to parse config file: {}", path))
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                // Config file not found, return default configuration
                Ok(Config::default())
            }
            Err(e) => {
                // Other file reading error
                Err(e).with_context(|| format!("Failed to read config file: {}", path))
            }
        }
    }
} 