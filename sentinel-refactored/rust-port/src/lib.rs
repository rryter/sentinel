// Minimal lib.rs - just empty or with basic re-exports
// This file is not actually needed for the simplified version

// Expose the metrics module
pub mod metrics;
pub mod rules;
pub mod rules_registry;

use std::time::Duration;
use std::collections::HashMap;
use oxc_diagnostics::OxcDiagnostic;

/// Structure to hold analysis results for a single file
#[derive(Debug)]
pub struct FileAnalysisResult {
    pub file_path: String,
    pub parse_duration: Duration,
    pub semantic_duration: Duration,
    pub rule_durations: HashMap<String, Duration>,
    pub total_duration: Duration,
    pub diagnostics: Vec<OxcDiagnostic>,
}

// Add any other public exports needed from the library modules here
pub use metrics::Metrics;
pub use rules::Rule;
pub use rules_registry::RulesRegistry;