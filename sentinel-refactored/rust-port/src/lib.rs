// Expose the modules
pub mod analyzer;
pub mod exporter;
pub mod metrics;
pub mod rules;
pub mod rules_registry;
pub mod utilities;

use oxc_diagnostics::OxcDiagnostic;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

/// Structure that associates a rule ID with a diagnostic
#[derive(Debug, Clone)]
pub struct RuleDiagnostic {
    /// The ID of the rule that produced this diagnostic
    pub rule_id: String,
    /// The actual diagnostic
    pub diagnostic: OxcDiagnostic,
}

/// Structure to hold analysis results for a single file
#[derive(Debug)]
pub struct FileAnalysisResult {
    pub file_path: String,
    pub parse_duration: Duration,
    pub semantic_duration: Duration,
    pub rule_durations: HashMap<String, Duration>,
    pub total_duration: Duration,
    pub diagnostics: Vec<RuleDiagnostic>,
}

// Add any other public exports needed from the library modules here
pub use metrics::Metrics;
pub use rules::Rule;
pub use rules_registry::RulesRegistry;
pub use utilities::DebugLevel;
