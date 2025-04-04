use std::path::{Path, PathBuf};
use std::fs;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use anyhow::{Result, Context};
use walkdir::WalkDir;
// Add imports for oxc
use oxc_allocator::Allocator;
use oxc_parser::{Parser, ParserReturn};
use oxc_span::SourceType;
// Rayon for parallel processing
use rayon::prelude::*;
// MiMalloc for faster memory allocation
use mimalloc::MiMalloc;

#[global_allocator]
static GLOBAL: MiMalloc = MiMalloc;

pub mod scanner;
pub mod metrics;

/// Result of scanning a codebase for TypeScript files
pub struct ScanResult {
    pub files: Vec<String>,
    pub duration: Duration,
}

/// Result of analyzing a TypeScript codebase
pub struct AnalysisResult {
    pub scan_result: ScanResult,
    pub parse_duration: Duration,
    pub analysis_duration: Duration,
    pub parsed_count: usize,
    pub error_count: usize,
}

/// Find all files with the given extensions in a directory
pub fn find_files(
    path: &Path, 
    extensions: &[&str], 
    verbose: bool
) -> Result<ScanResult> {
    let start = Instant::now();
    let mut files = Vec::new();
    
    // Create a pool for parallel walking
    let extensions = extensions.to_vec();
    
    if verbose {
        println!("Scanning for files with extensions: {:?}", extensions);
    }
    
    // Use parallel iterator for directory walking
    let walker = WalkDir::new(path).follow_links(false).into_iter();
    
    let mut paths: Vec<_> = walker
        .filter_map(Result::ok)
        .filter(|entry| {
            let path = entry.path();
            if path.is_dir() {
                return false;
            }
            
            if let Some(ext) = path.extension() {
                if let Some(ext_str) = ext.to_str() {
                    return extensions.contains(&ext_str);
                }
            }
            false
        })
        .filter_map(|entry| entry.path().to_str().map(String::from))
        .collect();
    
    // Sort the file list for deterministic output
    paths.sort();
    
    files = paths;
    
    let duration = start.elapsed();
    
    if verbose {
        println!("Found {} files in {:?}", files.len(), duration);
    }
    
    Ok(ScanResult {
        files,
        duration,
    })
}

/// Analyze a TypeScript codebase
pub struct TypeScriptAnalyzer {
    verbose: bool,
}

impl TypeScriptAnalyzer {
    /// Create a new TypeScript analyzer
    pub fn new(verbose: bool) -> Self {
        Self { verbose }
    }
    
    /// Scan a directory for TypeScript files
    pub fn scan_directory(&self, path: &Path, extensions: &[&str]) -> Result<ScanResult> {
        find_files(path, extensions, self.verbose)
    }
    
    /// Get the count of TypeScript files found in the scan result
    pub fn count_files(&self, scan_result: &ScanResult) -> usize {
        scan_result.files.len()
    }
    
    /// Analyze TypeScript files in a directory
    pub fn analyze_directory(&self, path: &Path, extensions: &[&str]) -> Result<AnalysisResult> {
        // First, scan for files
        let scan_result = self.scan_directory(path, extensions)?;
        
        // Always print the count of files found
        println!("Found {} TypeScript files to analyze", scan_result.files.len());
        
        if self.verbose {
            println!("Starting parsing and analysis...");
        }
        
        // Create results directory
        let results_dir = PathBuf::from("analysis_results");
        if !results_dir.exists() {
            if let Err(e) = fs::create_dir_all(&results_dir) {
                eprintln!("Warning: Failed to create results directory: {}", e);
            } else if self.verbose {
                println!("Created results directory: {}", results_dir.display());
            }
        }
        
        // Timing for parse phase
        let parse_start = Instant::now();
        
        // Start the overall analysis timer
        let analysis_start = Instant::now();
        
        // Atomic counters for thread safety
        let parsed_count = Arc::new(AtomicUsize::new(0));
        let error_count = Arc::new(AtomicUsize::new(0));
        
        // Process files in parallel using Rayon
        scan_result.files.par_iter().for_each(|file_path| {
            // Create a path object for the current file
            let file_path_obj = Path::new(file_path);
            
            // Read file content with better error handling
            match fs::read_to_string(file_path) {
                Ok(content) => {
                    // Create a new allocator for each file to avoid memory issues
                    let allocator = Allocator::default();
                    
                    // Determine source type from file extension
                    let source_type = match SourceType::from_path(file_path_obj) {
                        Ok(st) => st,
                        Err(_) => SourceType::default(),
                    };
                    
                    // Parse the file with better error handling
                    let ParserReturn { program, errors, panicked,..} = Parser::new(&allocator, &content, source_type).parse();
                    
                    if !errors.is_empty() || panicked {
                        error_count.fetch_add(1, Ordering::Relaxed);
                        if self.verbose {
                            println!("Errors parsing file: {}", file_path);
                            for error in &errors {
                                println!("  - {:?}", error);
                            }
                        }
                    } else if program.body.is_empty() {
                        // Skip empty programs but don't count as error
                        if self.verbose {
                            println!("Empty program in file: {}", file_path);
                        }
                    } else {
                        parsed_count.fetch_add(1, Ordering::Relaxed);
                        
                        // Optionally save AST to file (in a real implementation,
                        // you might want to parallelize this I/O operation as well)
                        if self.verbose {
                            if let Some(file_name) = file_path_obj.file_name() {
                                if let Some(file_name_str) = file_name.to_str() {
                                    let mut output_path = results_dir.clone();
                                    output_path.push(format!("{}.json", file_name_str));
                                    
                                    // For now, just indicate success without actually writing
                                    // This avoids file I/O bottlenecks during parsing
                                    if self.verbose {
                                        println!("Successfully parsed: {}", file_path);
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    error_count.fetch_add(1, Ordering::Relaxed);
                    if self.verbose {
                        println!("Error reading file {}: {}", file_path, e);
                    }
                }
            }
        });
        
        let parse_duration = parse_start.elapsed();
        let analysis_duration = analysis_start.elapsed();
        
        // Get final counts
        let final_parsed_count = parsed_count.load(Ordering::Relaxed);
        let final_error_count = error_count.load(Ordering::Relaxed);
        
        println!("Successfully parsed {} files ({} errors)", final_parsed_count, final_error_count);
        println!("Parse time: {:?}", parse_duration);
        println!("Files per second: {:.2}", scan_result.files.len() as f64 / parse_duration.as_secs_f64());
        
        Ok(AnalysisResult {
            scan_result,
            parse_duration,
            analysis_duration,
            parsed_count: final_parsed_count,
            error_count: final_error_count,
        })
    }
} 