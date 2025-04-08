use rayon::prelude::*;
use std::env;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use typescript_analyzer::analyzer::analyze_file;
use typescript_analyzer::exporter::export_findings_json;
use typescript_analyzer::metrics::Metrics;
use typescript_analyzer::metrics_exporter::export_metrics;
use typescript_analyzer::rules_registry::{
    configure_registry, create_default_registry, load_rule_config, RulesRegistry,
};
use typescript_analyzer::utilities::config::{get_debug_level, get_enabled_rules, get_target_path, Config};
use typescript_analyzer::utilities::file_utils::find_typescript_files;
use typescript_analyzer::utilities::log;
use typescript_analyzer::utilities::DebugLevel;
use typescript_analyzer::FileAnalysisResult;

fn main() {
    // Load configuration and parse command line args
    let config = Config::load();
    let args: Vec<String> = env::args().collect();
    let debug_level = get_debug_level(&config, &args);

    // Configure thread pool if needed
    configure_thread_pool(&config, debug_level);

    // Set up rules registry
    let rules_registry = setup_rules_registry(&config, &args, debug_level);
    let rules_registry_arc = Arc::new(rules_registry);

    // Get target directory and find TypeScript files
    let dir_path = get_target_path(&config, &args);
    log(
        DebugLevel::Info,
        debug_level,
        &format!("Scanning directory: {}", dir_path),
    );
    
    // Find files and track time
    let scan_start = Instant::now();
    let files = find_typescript_files(&dir_path);
    let scan_duration = scan_start.elapsed();
    
    log(
        DebugLevel::Info,
        debug_level,
        &format!("Found {} TypeScript files", files.len()),
    );
    log(
        DebugLevel::Trace,
        debug_level,
        &format!("Processing with {} threads", rayon::current_num_threads()),
    );

    // Initialize metrics
    let metrics_arc = Arc::new(Mutex::new(Metrics::new()));
    {
        if let Ok(mut metrics) = metrics_arc.lock() {
            metrics.record_scan_time(scan_duration);
        }
    }

    // Process files in parallel
    let analysis_start = Instant::now();
    let analysis_results: Vec<FileAnalysisResult> = files
        .par_iter()
        .map(|file_path| {
            let rules_ref = Arc::clone(&rules_registry_arc);
            analyze_file(file_path, rules_ref, debug_level)
        })
        .collect();
    let analysis_duration = analysis_start.elapsed();

    // Aggregate metrics
    let final_metrics = aggregate_metrics(&analysis_results, scan_duration, analysis_duration);
    
    // Export metrics and findings
    export_metrics(&config, &final_metrics, debug_level);
    export_findings_json(&analysis_results, debug_level);
}

/// Configure the thread pool for parallel processing
fn configure_thread_pool(config: &Config, debug_level: DebugLevel) {
    if let Some(threads) = config.threads {
        rayon::ThreadPoolBuilder::new()
            .num_threads(threads)
            .build_global()
            .unwrap_or_else(|e| {
                log(
                    DebugLevel::Error,
                    debug_level,
                    &format!("Failed to configure thread pool: {}", e),
                )
            });
    }
}

/// Set up the rules registry based on configuration and command line arguments
fn setup_rules_registry(config: &Config, args: &[String], debug_level: DebugLevel) -> RulesRegistry {
    let mut rules_registry = create_default_registry();
    
    // Check for command line rules override
    let cmd_line_rules = get_enabled_rules(args);

    if cmd_line_rules.is_some() {
        // Command line rules take precedence
        if let Some(rules) = cmd_line_rules {
            configure_registry(&mut rules_registry, &rules);
            log(
                DebugLevel::Info,
                debug_level,
                &format!("Using command line rules: {:?}", rules_registry.get_enabled_rules()),
            );
        }
    } else if let Some(rules_config_path) = &config.rules_config {
        log(
            DebugLevel::Trace,
            debug_level,
            &format!("Loading rules configuration from {}", rules_config_path),
        );
        match load_rule_config(rules_config_path) {
            Ok(enabled_rules) => {
                configure_registry(&mut rules_registry, &enabled_rules);
                log(
                    DebugLevel::Info,
                    debug_level,
                    &format!("Enabled rules: {:?}", rules_registry.get_enabled_rules()),
                );
            }
            Err(err) => {
                log(
                    DebugLevel::Error,
                    debug_level,
                    &format!("Failed to load rules configuration: {}", err),
                );
                log(
                    DebugLevel::Info,
                    debug_level,
                    &format!(
                        "Using default rules: {:?}",
                        rules_registry.get_enabled_rules()
                    ),
                );
            }
        }
    } else {
        log(
            DebugLevel::Info,
            debug_level,
            &format!(
                "Using default rules: {:?}",
                rules_registry.get_enabled_rules()
            ),
        );
    }
    
    rules_registry
}

/// Aggregate metrics from individual file analysis results
fn aggregate_metrics(
    analysis_results: &[FileAnalysisResult],
    scan_duration: std::time::Duration,
    analysis_duration: std::time::Duration,
) -> Metrics {
    let mut final_metrics = Metrics::new();
    final_metrics.record_analysis_time(analysis_duration);
    final_metrics.record_scan_time(scan_duration);

    // Aggregate data from each file result
    for result in analysis_results {
        // Clone the FileAnalysisResult to satisfy aggregate_file_result's ownership requirements
        let result_to_aggregate = FileAnalysisResult {
            file_path: result.file_path.clone(),
            parse_duration: result.parse_duration,
            semantic_duration: result.semantic_duration,
            rule_durations: result.rule_durations.clone(),
            total_duration: result.total_duration,
            diagnostics: Vec::new(), // Metrics doesn't need the diagnostics
        };
        final_metrics.aggregate_file_result(result_to_aggregate);
    }

    // Stop the final metrics timer AFTER aggregation
    final_metrics.stop();

    // Print summary 
    final_metrics.print_summary(None);
    
    final_metrics
}


