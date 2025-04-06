use std::path::Path;
use std::fs;
use std::io::Read;
use std::env;
use std::time::Instant;
use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_span::SourceType;
use oxc_semantic::SemanticBuilder;
use oxc_ast::AstKind;
use walkdir::WalkDir;
use serde::{Deserialize, Serialize};

// Import our metrics module
mod metrics;
use metrics::Metrics;

/// Simple config structure that only contains the directory path
#[derive(Serialize, Deserialize, Debug, Default)]
struct Config {
    path: Option<String>,
}

impl Config {
    /// Load config from sentinel.json
    fn load() -> Self {
        let mut file = match fs::File::open("sentinel.json") {
            Ok(file) => file,
            Err(err) => {
                println!("Could not open sentinel.json: {}", err);
                return Config::default();
            }
        };

        let mut contents = String::new();
        if let Err(err) = file.read_to_string(&mut contents) {
            println!("Could not read sentinel.json: {}", err);
            return Config::default();
        }

        match serde_json::from_str(&contents) {
            Ok(config) => config,
            Err(err) => {
                println!("Could not parse sentinel.json: {}", err);
                Config::default()
            }
        }
    }
}

fn main() {
    // Initialize metrics
    let mut metrics = Metrics::new();
    
    // Load configuration from sentinel.json
    let config = Config::load();
    
    // Get command line arguments
    let args: Vec<String> = env::args().collect();
    
    // Command line argument takes precedence over config file
    let dir_path = if args.len() > 1 {
        args[1].clone()
    } else {
        config.path.unwrap_or_else(|| ".".to_string())
    };
    
    println!("Scanning directory: {}", dir_path);
    
    // Start timing file scanning
    let scan_start = Instant::now();
    let files = find_typescript_files(&dir_path);
    metrics.record_scan_time(scan_start.elapsed());
    
    println!("Found {} TypeScript files", files.len());
    
    // Start timing file analysis
    let analysis_start = Instant::now();
    
    // Process each file and record metrics
    for file_path in files {
        let file_start = Instant::now();
        analyze_file(&file_path);
        metrics.record_file_time(&file_path, file_start.elapsed());
    }
    
    // Record total analysis time
    metrics.record_analysis_time(analysis_start.elapsed());
    
    // Stop overall timing
    metrics.stop();
    
    // Print performance summary
    metrics.print_summary();
}

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

fn analyze_file(file_path: &str) {
    println!("Analyzing {}", file_path);
    
    // Read file
    let source = match fs::read_to_string(file_path) {
        Ok(content) => content,
        Err(err) => {
            println!("Error reading file: {}", err);
            return;
        }
    };
    
    // Parse and create semantic model
    let allocator = Allocator::default();
    let source_type = match SourceType::from_path(Path::new(file_path)) {
        Ok(st) => st,
        Err(_) => return,
    };
    
    let parse_result = Parser::new(&allocator, &source, source_type).parse();
    if !parse_result.errors.is_empty() {
        println!("Parse errors: {}", parse_result.errors.len());
        return;
    }
    
    let semantic_result = SemanticBuilder::new().build(&parse_result.program);
    
    // Run rules (example with a simple rule that finds debugger statements)
    for node in semantic_result.semantic.nodes() {
        if let AstKind::DebuggerStatement(_) = node.kind() {
            println!("Found debugger statement in {}", file_path);
        }
    }
}