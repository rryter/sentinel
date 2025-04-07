use std::path::Path;
use std::fs;
use std::io::Read;
use std::env;
use std::time::Instant;
use std::sync::{Arc, Mutex};
use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_span::SourceType;
use oxc_semantic::SemanticBuilder;
use oxc_diagnostics::OxcDiagnostic;
use walkdir::WalkDir;
use serde::{Deserialize, Serialize, Deserializer};
use rayon::prelude::*;
use std::time::Duration;
use std::collections::HashMap;

// Import from the typescript_analyzer crate
use typescript_analyzer::FileAnalysisResult;
use typescript_analyzer::metrics::Metrics;
use typescript_analyzer::rules_registry::{RulesRegistry, create_default_registry, load_rule_config, configure_registry};

/// Debug level enum for controlling output verbosity
#[derive(Serialize, Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum DebugLevel {
    None,
    Error,
    Warn,
    Info,
    Debug,
    Trace
}

// Custom deserialize implementation to handle case-insensitive values
impl<'de> Deserialize<'de> for DebugLevel {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        match s.to_lowercase().as_str() {
            "none" => Ok(DebugLevel::None),
            "error" => Ok(DebugLevel::Error),
            "warn" => Ok(DebugLevel::Warn),
            "info" => Ok(DebugLevel::Info),
            "debug" => Ok(DebugLevel::Debug),
            "trace" => Ok(DebugLevel::Trace),
            _ => Err(serde::de::Error::custom(format!("Invalid debug level: {}", s))),
        }
    }
}

impl Default for DebugLevel {
    fn default() -> Self {
        DebugLevel::Info
    }
}

impl std::str::FromStr for DebugLevel {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "none" => Ok(DebugLevel::None),
            "error" => Ok(DebugLevel::Error),
            "warn" => Ok(DebugLevel::Warn),
            "info" => Ok(DebugLevel::Info),
            "debug" => Ok(DebugLevel::Debug),
            "trace" => Ok(DebugLevel::Trace),
            _ => Err(format!("Invalid debug level: {}", s))
        }
    }
}

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

/// Log function that respects debug level
fn log(level: DebugLevel, current_level: DebugLevel, message: &str) {
    if level as usize <= current_level as usize {
        match level {
            DebugLevel::Error => eprintln!("ERROR: {}", message),
            DebugLevel::Warn => eprintln!("WARN: {}", message),
            DebugLevel::Info => println!("INFO: {}", message),
            DebugLevel::Debug => println!("DEBUG: {}", message),
            DebugLevel::Trace => println!("TRACE: {}", message),
            DebugLevel::None => {}
        }
    }
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
            .unwrap_or_else(|e| log(DebugLevel::Error, debug_level, &format!("Failed to configure thread pool: {}", e)));
    }
    
    // Initialize the rules registry
    let mut rules_registry = create_default_registry();
    
    // If a custom rules config is specified, load it
    if let Some(rules_config_path) = &config.rules_config {
        log(DebugLevel::Trace, debug_level, &format!("Loading rules configuration from {}", rules_config_path));
        match load_rule_config(rules_config_path) {
            Ok(enabled_rules) => {
                configure_registry(&mut rules_registry, &enabled_rules);
                log(DebugLevel::Info, debug_level, &format!("Enabled rules: {:?}", rules_registry.get_enabled_rules()));
            },
            Err(err) => {
                log(DebugLevel::Error, debug_level, &format!("Failed to load rules configuration: {}", err));
                log(DebugLevel::Info, debug_level, &format!("Using default rules: {:?}", rules_registry.get_enabled_rules()));
            }
        }
    } else {
        log(DebugLevel::Info, debug_level, &format!("Using default rules: {:?}", rules_registry.get_enabled_rules()));
    }
    
    // Command line argument takes precedence over config file
    let dir_path = if args.len() > 1 && !args[1].starts_with("-") {
        args[1].clone()
    } else {
        config.path.as_ref().map_or_else(|| ".".to_string(), |p| p.clone())
    };
    
    log(DebugLevel::Info, debug_level, &format!("Scanning directory: {}", dir_path));
    
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
    
    log(DebugLevel::Info, debug_level, &format!("Found {} TypeScript files", files.len()));
    log(DebugLevel::Trace, debug_level, &format!("Processing with {} threads", rayon::current_num_threads()));
    
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
    for result in analysis_results {
        final_metrics.aggregate_file_result(result);
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
}

/// Export metrics to files if configured
fn export_metrics(config: &Config, metrics: &Metrics, debug_level: DebugLevel) { // Takes &Metrics now
    // Call the export_to_configured_formats method on Metrics
    if let Err(err) = metrics.export_to_configured_formats(
        config.export_metrics_json.as_ref(), 
        config.export_metrics_csv.as_ref()
    ) {
        log(DebugLevel::Error, debug_level, &format!("Failed to export metrics: {}", err));
    }
}

/// Find all TypeScript files in the given directory and subdirectories
fn find_typescript_files(dir: &str) -> Vec<String> {
    WalkDir::new(dir)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|e| {
            let path = e.path();
            path.is_file() && 
            path.extension().map_or(false, |ext| 
                ext == "ts" || ext == "tsx")
        })
        .map(|e| e.path().to_string_lossy().to_string())
        .collect()
}

/// Analyze a file and return detailed results
fn analyze_file(
    file_path: &str, 
    rules_registry: Arc<RulesRegistry>, 
    debug_level: DebugLevel
) -> FileAnalysisResult { // Return the new struct
    let file_start = Instant::now();
    
    // Read file
    let source = match fs::read_to_string(file_path) {
        Ok(content) => content,
        Err(err) => {
            log(DebugLevel::Error, debug_level, &format!("Error reading file {}: {}", file_path, err));
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
        Err(_) => return FileAnalysisResult {
            file_path: file_path.to_string(),
            parse_duration: Duration::from_secs(0),
            semantic_duration: Duration::from_secs(0),
            rule_durations: HashMap::new(),
            total_duration: Duration::from_secs(0),
            diagnostics: Vec::new(),
        },
    };
    
    let parse_result = Parser::new(&allocator, &source, source_type).parse();
    if !parse_result.errors.is_empty() {
        log(DebugLevel::Error, debug_level, &format!("Parse errors in {}: {}", file_path, parse_result.errors.len()));
        return FileAnalysisResult {
            file_path: file_path.to_string(),
            parse_duration: Duration::from_secs(0),
            semantic_duration: Duration::from_secs(0),
            rule_durations: HashMap::new(),
            total_duration: Duration::from_secs(0),
            diagnostics: parse_result.errors.into_iter().map(|e| e.into()).collect(),
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
    let (diagnostics, rule_durations) = rules_registry.run_rules_with_metrics(&semantic_result, file_path);
    
    // Record rule execution time as a whole - NO LONGER NEEDED
    // let rules_duration = rules_start.elapsed();
    // if let Ok(mut metrics) = metrics_arc.lock() {
    //     // Record overall rule execution time under a special key
    //     metrics.record_rule_time("__all_rules__", rules_duration);
    // }
    
    if !diagnostics.is_empty() && debug_level >= DebugLevel::Info {
        println!("Found {} issues in {}", diagnostics.len(), file_path);
        for diagnostic in &diagnostics { // Iterate over reference
            let error = diagnostic.clone().with_source_code(source.clone());
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
        diagnostics: diagnostics,     // Store the returned diagnostics
    }
}