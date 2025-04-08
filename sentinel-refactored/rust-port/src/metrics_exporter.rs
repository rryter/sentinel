use crate::metrics::Metrics;
use crate::utilities::{DebugLevel, log};
use crate::utilities::config::Config;

/// Export metrics to files if configured
pub fn export_metrics(config: &Config, metrics: &Metrics, debug_level: DebugLevel) {
    // Call the export_to_configured_formats method on Metrics
    if let Err(err) = metrics.export_to_configured_formats(
        config.export_metrics_json.as_ref(),
        config.export_metrics_csv.as_ref(),
    ) {
        log(
            DebugLevel::Error,
            debug_level,
            &format!("Failed to export metrics: {}", err),
        );
    }
} 