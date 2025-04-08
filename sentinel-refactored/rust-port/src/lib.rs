// Expose the modules
pub mod metrics;
pub mod rules;
pub mod rules_registry;
pub mod exporter;
pub mod utilities;
pub mod analyzer;
pub mod metrics_exporter;

use oxc_diagnostics::OxcDiagnostic;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::time::Duration;

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
pub use utilities::DebugLevel;
