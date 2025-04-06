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
use oxc_ast::AstKind;
use walkdir::WalkDir;
use serde::{Deserialize, Serialize};
use rayon::prelude::*;

// Import our metrics module
mod metrics;
use metrics::Metrics;

/// Configuration structure for the TypeScript analyzer
#[derive(Serialize, Deserialize, Debug, Default, Clone)]
struct Config {
    path: Option<String>,
    export_metrics_json: Option<String>,
    export_metrics_csv: Option<String>,
    /// Number of threads to use for parallel processing (default: all available)
    threads: Option<usize>,
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

fn main() {
    // Load configuration from sentinel.json
    let config = Config::load();
    
    // Configure thread pool size if specified in config
    if let Some(threads) = config.threads {
        rayon::ThreadPoolBuilder::new()
            .num_threads(threads)
            .build_global()
            .unwrap_or_else(|e| eprintln!("Failed to configure thread pool: {}", e));
    }
    
    // Get command line arguments
    let args: Vec<String> = env::args().collect();
    
    // Command line argument takes precedence over config file
    let dir_path = if args.len() > 1 {
        args[1].clone()
    } else {
        config.path.as_ref().map_or_else(|| ".".to_string(), |p| p.clone())
    };
    
    println!("Scanning directory: {}", dir_path);
    
    // Initialize metrics in a thread-safe container
    let metrics_arc = Arc::new(Mutex::new(Metrics::new()));
    
    // Start timing file scanning
    let scan_start = Instant::now();
    let files = find_typescript_files(&dir_path);
    
    // Record scan time
    {
        if let Ok(mut metrics) = metrics_arc.lock() {
            metrics.record_scan_time(scan_start.elapsed());
        }
    }
    
    println!("Found {} TypeScript files", files.len());
    println!("Processing with {} threads", rayon::current_num_threads());
    
    // Start timing file analysis
    let analysis_start = Instant::now();
    
    // Process files in parallel using rayon
    files.par_iter().for_each(|file_path| {
        // Create a reference to the shared metrics for this thread
        let metrics_ref = Arc::clone(&metrics_arc);
        analyze_file_with_metrics(file_path, metrics_ref);
    });
    
    // Record total analysis time and other operations
    {
        if let Ok(mut metrics) = metrics_arc.lock() {
            metrics.record_analysis_time(analysis_start.elapsed());
            metrics.stop();
            metrics.print_summary();
        }
    }
    
    // Export metrics if configured
    export_metrics(&config, &metrics_arc);
}

/// Export metrics to files if configured
fn export_metrics(config: &Config, metrics_arc: &Arc<Mutex<Metrics>>) {
    if let Ok(metrics) = metrics_arc.lock() {
        // Export metrics to JSON if configured
        if let Some(json_path) = &config.export_metrics_json {
            println!("Exporting metrics to JSON: {}", json_path);
            if let Err(err) = metrics.export_to_json(json_path) {
                eprintln!("Error exporting metrics to JSON: {}", err);
            }
        }
        
        // Export metrics to CSV if configured
        if let Some(csv_path) = &config.export_metrics_csv {
            println!("Exporting metrics to CSV: {}", csv_path);
            if let Err(err) = metrics.export_to_csv(csv_path) {
                eprintln!("Error exporting metrics to CSV: {}", err);
            }
        }
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

/// Analyze a file and record detailed metrics
fn analyze_file_with_metrics(file_path: &str, metrics_arc: Arc<Mutex<Metrics>>) {
    let file_start = Instant::now();
    
    // Read file
    let source = match fs::read_to_string(file_path) {
        Ok(content) => content,
        Err(err) => {
            eprintln!("Error reading file {}: {}", file_path, err);
            return;
        }
    };
    
    // Measure parsing time
    let parse_start = Instant::now();
    
    // Parse file
    let allocator = Allocator::default();
    let source_type = match SourceType::from_path(Path::new(file_path)) {
        Ok(st) => st,
        Err(_) => return,
    };
    
    let parse_result = Parser::new(&allocator, &source, source_type).parse();
    if !parse_result.errors.is_empty() {
        eprintln!("Parse errors in {}: {}", file_path, parse_result.errors.len());
        return;
    }
    
    // Record parse time
    let parse_duration = parse_start.elapsed();
    if let Ok(mut metrics) = metrics_arc.lock() {
        metrics.record_parse_time(file_path, parse_duration);
    }
    
    // Measure semantic analysis time
    let semantic_start = Instant::now();
    
    // Perform semantic analysis
    let semantic_result = SemanticBuilder::new().build(&parse_result.program);
    
    // Record semantic analysis time
    let semantic_duration = semantic_start.elapsed();
    if let Ok(mut metrics) = metrics_arc.lock() {
        metrics.record_semantic_time(file_path, semantic_duration);
    }
    
    // Run rules (example with a simple rule that finds debugger statements)
    for node in semantic_result.semantic.nodes() {
        if let AstKind::DebuggerStatement(_) = node.kind() {
            println!("Found debugger statement in {}", file_path);
        }
    }
    
    // Record total file processing time
    let total_duration = file_start.elapsed();
    if let Ok(mut metrics) = metrics_arc.lock() {
        metrics.record_file_time(file_path, total_duration);
    }
}