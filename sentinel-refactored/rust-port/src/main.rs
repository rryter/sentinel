use oxc_allocator::Allocator;
use oxc_diagnostics::{NamedSource, OxcDiagnostic};
use oxc_parser::Parser;
use oxc_semantic::SemanticBuilder;
use oxc_span::SourceType;
use rayon::prelude::*;
use serde::{Deserialize, Deserializer, Serialize};
use std::collections::HashMap;
use std::env;
use std::error::Error;
use std::fs;
use std::io::Read;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use std::time::Instant;
use walkdir::WalkDir;

// Import from the typescript_analyzer crate
use typescript_analyzer::metrics::Metrics;
use typescript_analyzer::rules_registry::{
    configure_registry, create_default_registry, load_rule_config, RulesRegistry,
};
use typescript_analyzer::{FileAnalysisResult, DebugLevel};
use typescript_analyzer::exporter::export_findings_json;
use typescript_analyzer::utilities::log;

/// Configuration structure for the TypeScript analyzer
#[derive(Serialize, Deserialize, Debug, Default, Clone)]
struct Config {
    path: Option<String>,
    export_metrics_json: Option<String>,
    export_metrics_csv: Option<String>,
    /// Number of threads to use for parallel processing (default: all available)
    threads: Option<usize>,
    /// Path to rules configuration file
    rules_config: Option<String>,
    /// Debug level for controlling output verbosity
    debug_level: Option<DebugLevel>,
}

impl Config {
    /// Load config from sentinel.json
    fn load() -> Self {
        let mut file = match fs::File::open("sentinel.json") {
            Ok(file) => file,
            Err(err) => {
                eprintln!("Could not open sentinel.json: {}", err);
                return Config::default();
            }
        };

        let mut contents = String::new();
        if let Err(err) = file.read_to_string(&mut contents) {
            eprintln!("Could not read sentinel.json: {}", err);
            return Config::default();
        }

        match serde_json::from_str(&contents) {
            Ok(config) => config,
            Err(err) => {
                eprintln!("Could not parse sentinel.json: {}", err);
                Config::default()
            }
        }
    }
}

/// Helper function to get debug level
fn get_debug_level(config: &Config, args: &[String]) -> DebugLevel {
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
fn get_enabled_rules(args: &[String]) -> Option<Vec<String>> {
    for i in 0..args.len().saturating_sub(1) {
        if args[i] == "--rules" || args[i] == "-r" {
            // Split the comma-separated list into individual rule names
            let rules = args[i + 1]
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect::<Vec<String>>();
            
            if !rules.is_empty() {
                return Some(rules);
            }
        }
    }
    
    None
}

/// Simple representation of a diagnostic finding for JSON serialization
#[derive(Serialize)]
struct FindingEntry {
    rule: String,
    message: String,
    file: String,
    start_line: usize,
    start_column: usize,
    end_line: usize,
    end_column: usize,
    severity: String,
    help: Option<String>,
}

fn main() {
    // Load configuration from sentinel.json
    let config = Config::load();

    // Get command line arguments
    let args: Vec<String> = env::args().collect();

    // Determine debug level
    let debug_level = get_debug_level(&config, &args);

    // Configure thread pool size if specified in config
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

    // Initialize the rules registry
    let mut rules_registry = create_default_registry();

    // Check for command line rules override
    let cmd_line_rules = get_enabled_rules(&args);

    // If a custom rules config is specified (and no command line override), load it
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

    // Command line argument takes precedence over config file
    let dir_path = if args.len() > 1 && !args[1].starts_with("-") {
        args[1].clone()
    } else {
        config
            .path
            .as_ref()
            .map_or_else(|| ".".to_string(), |p| p.clone())
    };

    log(
        DebugLevel::Info,
        debug_level,
        &format!("Scanning directory: {}", dir_path),
    );

    // Initialize metrics in a thread-safe container
    let metrics_arc = Arc::new(Mutex::new(Metrics::new()));

    // Wrap the rules registry in an Arc for thread-safe sharing
    let rules_registry_arc = Arc::new(rules_registry);

    // Start timing file scanning
    let scan_start = Instant::now();
    let files = find_typescript_files(&dir_path);

    // Record scan time
    {
        if let Ok(mut metrics) = metrics_arc.lock() {
            metrics.record_scan_time(scan_start.elapsed());
        }
    }

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

    // Start timing file analysis
    let analysis_start = Instant::now();

    // Process files in parallel using rayon and collect results
    let analysis_results: Vec<FileAnalysisResult> = files
        .par_iter()
        .map(|file_path| {
            // Create a clone of the Arc for the rules registry for this thread
            let rules_ref = Arc::clone(&rules_registry_arc);
            // Call analyze_file without metrics Arc
            analyze_file(file_path, rules_ref, debug_level)
        })
        .collect();

    // Record total analysis time (wall clock)
    let analysis_duration = analysis_start.elapsed();

    // Aggregate results into the final Metrics struct
    // Create the final Metrics instance (not locked during parallel phase)
    let mut final_metrics = Metrics::new();
    final_metrics.record_analysis_time(analysis_duration);
    final_metrics.record_scan_time(scan_start.elapsed()); // Record scan time here too

    // Aggregate data from each file result
    for result in &analysis_results {  // Use a reference to avoid consuming the Vec
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

    // Print summary from the final aggregated metrics
    let debug_level_str = match debug_level {
        DebugLevel::Trace => Some("trace"),
        _ => None,
    };
    final_metrics.print_summary(debug_level_str);

    // Export metrics if configured (pass the final aggregated metrics)
    export_metrics(&config, &final_metrics, debug_level);
    
    // Export findings to findings.json
    export_findings_json(&analysis_results, debug_level);
}

/// Export metrics to files if configured
fn export_metrics(config: &Config, metrics: &Metrics, debug_level: DebugLevel) {
    // Takes &Metrics now
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

/// Find all TypeScript files in the given directory and subdirectories
fn find_typescript_files(dir: &str) -> Vec<String> {
    WalkDir::new(dir)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|e| {
            let path = e.path();
            path.is_file()
                && path
                    .extension()
                    .map_or(false, |ext| ext == "ts" || ext == "tsx")
        })
        .map(|e| e.path().to_string_lossy().to_string())
        .collect()
}

/// Analyze a file and return detailed results
fn analyze_file(
    file_path: &str,
    rules_registry: Arc<RulesRegistry>,
    debug_level: DebugLevel,
) -> FileAnalysisResult {
    // Return the new struct
    let file_start = Instant::now();

    // Read file
    let source = match fs::read_to_string(file_path) {
        Ok(content) => content,
        Err(err) => {
            log(
                DebugLevel::Error,
                debug_level,
                &format!("Error reading file {}: {}", file_path, err),
            );
            return FileAnalysisResult {
                file_path: file_path.to_string(),
                parse_duration: Duration::from_secs(0),
                semantic_duration: Duration::from_secs(0),
                rule_durations: HashMap::new(),
                total_duration: Duration::from_secs(0),
                diagnostics: Vec::new(),
            };
        }
    };

    // Measure parsing time
    let parse_start = Instant::now();

    // Parse file
    let allocator = Allocator::default();
    let source_type = match SourceType::from_path(Path::new(file_path)) {
        Ok(st) => st,
        Err(_) => {
            return FileAnalysisResult {
                file_path: file_path.to_string(),
                parse_duration: Duration::from_secs(0),
                semantic_duration: Duration::from_secs(0),
                rule_durations: HashMap::new(),
                total_duration: Duration::from_secs(0),
                diagnostics: Vec::new(),
            }
        }
    };

    let parse_result = Parser::new(&allocator, &source, source_type).parse();
    if !parse_result.errors.is_empty() {
        log(
            DebugLevel::Error,
            debug_level,
            &format!(
                "Parse errors in {}: {}",
                file_path,
                parse_result.errors.len()
            ),
        );
        return FileAnalysisResult {
            file_path: file_path.to_string(),
            parse_duration: Duration::from_secs(0),
            semantic_duration: Duration::from_secs(0),
            rule_durations: HashMap::new(),
            total_duration: Duration::from_secs(0),
            diagnostics: parse_result.errors,
        };
    }

    // Record parse time - NO LONGER RECORDED HERE
    let parse_duration = parse_start.elapsed();

    // Measure semantic analysis time
    let semantic_start = Instant::now();

    // Perform semantic analysis
    let semantic_result = SemanticBuilder::new().build(&parse_result.program);

    // Record semantic analysis time - NO LONGER RECORDED HERE
    let semantic_duration = semantic_start.elapsed();

    // Measure rule execution time - NO LONGER NEEDED FOR __all_rules__
    // let rules_start = Instant::now();

    // Run configured lint rules with metrics tracking - Now returns diagnostics and rule durations
    let (diagnostics, rule_durations) =
        rules_registry.run_rules_with_metrics(&semantic_result, file_path);

    // Record rule execution time as a whole - NO LONGER NEEDED
    // let rules_duration = rules_start.elapsed();
    // if let Ok(mut metrics) = metrics_arc.lock() {
    //     // Record overall rule execution time under a special key
    //     metrics.record_rule_time("__all_rules__", rules_duration);
    // }

    if !diagnostics.is_empty() && debug_level >= DebugLevel::Info {
        println!("Found {} issues in {}", diagnostics.len(), file_path);
        for diagnostic in &diagnostics {
            // Iterate over reference
            let named_source = NamedSource::new(file_path, source.clone());
            let error = diagnostic.clone().with_source_code(named_source);
            println!("{:?}", error);
        }
    }

    // Record total file processing time - NO LONGER RECORDED HERE
    let total_duration = file_start.elapsed();

    // Trace-level detailed logs about file processing
    // log(DebugLevel::Trace, debug_level, &format!(
    //     "Processed {} in {:.2?} (parse: {:.2?}, semantic: {:.2?}, rules: ??)", // Rule duration needs summing?
    //     file_path, total_duration, parse_duration, semantic_duration
    // ));

    FileAnalysisResult {
        file_path: file_path.to_string(),
        parse_duration: parse_duration,
        semantic_duration: semantic_duration,
        rule_durations: rule_durations, // Store the returned map
        total_duration: total_duration,
        diagnostics: diagnostics, // Store the returned diagnostics
    }
}


