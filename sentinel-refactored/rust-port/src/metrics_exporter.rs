use crate::metrics::Metrics;
use crate::utilities::{DebugLevel, log};
use crate::utilities::config::Config;
use crate::FileAnalysisResult;
use crate::exporter::export_findings_json;
use std::time::Duration;

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

/// Aggregate metrics from analysis results
pub fn aggregate_metrics(
    analysis_results: &[FileAnalysisResult],
    scan_duration: Duration,
    analysis_duration: Duration,
) -> Metrics {
    let mut metrics = Metrics::new();
    metrics.record_analysis_time(analysis_duration);
    metrics.record_scan_time(scan_duration);

    // Aggregate data from each file result
    for result in analysis_results {
        // Create a metrics-only copy without diagnostics
        let result_to_aggregate = FileAnalysisResult {
            file_path: result.file_path.clone(),
            parse_duration: result.parse_duration,
            semantic_duration: result.semantic_duration,
            rule_durations: result.rule_durations.clone(),
            total_duration: result.total_duration,
            diagnostics: Vec::new(),
        };
        metrics.aggregate_file_result(result_to_aggregate);
    }

    metrics.stop();
    metrics.print_summary(None);
    
    metrics
}

/// Export analysis results and metrics
pub fn export_results(
    config: &Config,
    metrics: &Metrics, 
    analysis_results: &[FileAnalysisResult],
    debug_level: DebugLevel,
) {
    export_metrics(config, metrics, debug_level);
    export_findings_json(analysis_results, debug_level);
} 