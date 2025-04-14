use crate::utilities::DebugLevel;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;

/// Configuration structure for the TypeScript analyzer
#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct Config {
    pub path: Option<String>,
    pub export_metrics_json: Option<String>,
    pub export_metrics_csv: Option<String>,
    /// Number of threads to use for parallel processing (default: all available)
    pub threads: Option<usize>,
    /// Path to rules configuration file
    pub rules_config: Option<String>,
    /// Debug level for controlling output verbosity
    pub debug_level: Option<DebugLevel>,
}

impl Config {
    /// Load config from sentinel.json
    pub fn load() -> Self {
        // Try loading from environment variable first
        if let Ok(config_path) = std::env::var("SENTINEL_CONFIG") {
            if let Some(config) = Self::try_load_from_path(&config_path) {
                return config;
            }
            eprintln!(
                "Warning: Could not load config from SENTINEL_CONFIG path: {}",
                config_path
            );
        }

        // Try current directory
        if let Some(config) = Self::try_load_from_path("sentinel.json") {
            return config;
        }

        // Try executable directory
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let exe_config_path = exe_dir.join("sentinel.json");
                if let Some(config) = Self::try_load_from_path(&exe_config_path.to_string_lossy()) {
                    return config;
                }
            }
        }

        // Try user config directory
        if let Some(home_dir) = dirs::home_dir() {
            let home_config = home_dir
                .join(".config")
                .join("sentinel")
                .join("sentinel.json");
            if let Some(config) = Self::try_load_from_path(&home_config.to_string_lossy()) {
                return config;
            }
        }

        // Try system-wide config directory
        #[cfg(not(windows))]
        {
            let system_config = std::path::Path::new("/etc/sentinel/sentinel.json");
            if let Some(config) = Self::try_load_from_path(&system_config.to_string_lossy()) {
                return config;
            }
        }

        // No config found, return default
        eprintln!("No configuration file found, using defaults");
        Config::default()
    }

    /// Try to load config from a specific path
    fn try_load_from_path(path: &str) -> Option<Self> {
        match fs::File::open(path) {
            Ok(mut file) => {
                let mut contents = String::new();
                if let Err(err) = file.read_to_string(&mut contents) {
                    eprintln!("Could not read {}: {}", path, err);
                    return None;
                }

                match serde_json::from_str(&contents) {
                    Ok(config) => Some(config),
                    Err(err) => {
                        eprintln!("Could not parse {}: {}", path, err);
                        None
                    }
                }
            }
            Err(_) => None, // Silently fail, as we try multiple locations
        }
    }
}

/// Helper function to get debug level
pub fn get_debug_level(config: &Config, args: &[String]) -> DebugLevel {
    // Check for command line argument first
    for i in 0..args.len().saturating_sub(1) {
        if args[i] == "--debug-level" || args[i] == "-d" {
            if let Ok(level) = args[i + 1].parse() {
                return level;
            }
        }
    }

    // Fall back to config file
    config.debug_level.unwrap_or_default()
}

/// Helper function to get enabled rules from command line
pub fn get_enabled_rules(
    args: &[String],
) -> Option<Vec<(String, Option<serde_json::Value>, String)>> {
    let mut rules = Vec::new();

    // Process --rules or -r flag with comma-separated values
    for i in 0..args.len().saturating_sub(1) {
        if args[i] == "--rules" || args[i] == "-r" {
            // Split the comma-separated list into individual rule names
            let parsed_rules = args[i + 1]
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .map(|s| (s, None, "error".to_string())) // Simple rules with default error severity
                .collect::<Vec<(String, Option<serde_json::Value>, String)>>();

            rules.extend(parsed_rules);
        }
    }

    // Process --enable-rule flags (each takes one rule name)
    for i in 0..args.len().saturating_sub(1) {
        if args[i] == "--enable-rule" {
            let rule = args[i + 1].trim().to_string();
            if !rule.is_empty() {
                rules.push((rule, None, "error".to_string())); // Simple rule with default error severity
            }
        }
    }

    if !rules.is_empty() {
        return Some(rules);
    }

    None
}

/// Helper function to get the target directory path
pub fn get_target_path(config: &Config, args: &[String]) -> String {
    // Command line argument takes precedence over config file
    if args.len() > 1 && !args[1].starts_with("-") {
        args[1].clone()
    } else {
        config
            .path
            .as_ref()
            .map_or_else(|| ".".to_string(), |p| p.clone())
    }
}
