use std::path::{Path, PathBuf};
use std::fs;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use std::collections::HashMap;
use anyhow::Result;
use walkdir::WalkDir;
// Add imports for oxc
use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_span::SourceType;
// Rayon for parallel processing
use rayon::prelude::*;
// MiMalloc for faster memory allocation
use mimalloc::MiMalloc;
// Thread-safe locks for rule results
use parking_lot::Mutex;
use colored::*;  // Import the colored crate

#[global_allocator]
static GLOBAL: MiMalloc = MiMalloc;

pub mod scanner;
pub mod metrics;
pub mod rules;

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
    pub rule_results: Option<rules::RuleResults>,
    pub files_per_second: Option<u32>,
}

/// Find all files with the given extensions in a directory
pub fn find_files(
    path: &Path, 
    extensions: &[&str], 
    verbose: bool
) -> Result<ScanResult> {
    let start = Instant::now();
    
    // Create a pool for parallel walking
    let extensions = extensions.to_vec();
    
    if verbose {
        println!("Scanning for files with extensions: {:?}", extensions);
    }
    
    // Use parallel iterator for directory walking
    let walker = WalkDir::new(path).follow_links(false).into_iter();
    
    let paths: Vec<_> = walker
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
    let mut files = paths;
    files.sort();
    
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
    rule_registry: Option<Arc<rules::RuleRegistry>>,
}

impl TypeScriptAnalyzer {
    /// Create a new TypeScript analyzer
    pub fn new(verbose: bool) -> Self {
        Self { 
            verbose,
            rule_registry: None,
        }
    }
    
    /// Create a new TypeScript analyzer with rules
    pub fn with_rules(verbose: bool, registry: Arc<rules::RuleRegistry>) -> Self {
        Self {
            verbose,
            rule_registry: Some(registry),
        }
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
        
        
        // If there are no files, return early with an empty result
        if scan_result.files.is_empty() {
            return Ok(AnalysisResult {
                scan_result,
                parse_duration: Duration::default(),
                analysis_duration: Duration::default(),
                parsed_count: 0,
                error_count: 0,
                rule_results: None,
                files_per_second: None,
            });
        }
        
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
        
        // Collect rule results if rules are enabled
        let rule_results = if self.rule_registry.is_some() {
            Some(Arc::new(Mutex::new(rules::RuleResults::new())))
        } else {
            None
        };
        
        // Clone rule registry for thread safety if it exists
        let registry_clone = self.rule_registry.clone();
        let rule_results_clone = rule_results.clone();
        
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
                    let parser_result = Parser::new(&allocator, &content, source_type).parse();
                    
                    if !parser_result.errors.is_empty() || parser_result.panicked {
                        error_count.fetch_add(1, Ordering::Relaxed);
                        if self.verbose {
                            println!("Errors parsing file: {}", file_path);
                            for error in &parser_result.errors {
                                println!("  - {:?}", error);
                            }
                        }
                    } else if parser_result.program.body.is_empty() {
                        // Skip empty programs but don't count as error
                        if self.verbose {
                            println!("Empty program in file: {}", file_path);
                        }
                    } else {
                        parsed_count.fetch_add(1, Ordering::Relaxed);
                        
                        // Apply rules if enabled
                        if let (Some(registry), Some(results)) = (&registry_clone, &rule_results_clone) {
                            let file_results = registry.evaluate_all(&parser_result.program, file_path);
                            
                            if !file_results.matches.is_empty() {
                                let mut results_write = results.lock();
                                for rule_match in file_results.matches {
                                    results_write.add_match(rule_match);
                                }
                            }
                        }
                        
                        // Optionally save AST to file
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
        
        // Drop the clones to ensure they don't prevent unwrapping
        drop(registry_clone);
        drop(rule_results_clone);
        
        let parse_duration = parse_start.elapsed();
        let analysis_duration = analysis_start.elapsed();
        
        // Get final counts
        let final_parsed_count = parsed_count.load(Ordering::Relaxed);
        let final_error_count = error_count.load(Ordering::Relaxed);
        
    
        
        
        
        // Calculate files per second for the result return value
        let duration_nanos = parse_duration.as_nanos();
        let duration_seconds = duration_nanos as f64 / 1_000_000_000.0;
        
        // Calculate files per second if we have a meaningful duration
        let files_per_second = if duration_seconds >= 0.001 { // At least 1 millisecond
            let fps = (final_parsed_count as f64 / duration_seconds).round() as u32;
            Some(fps)
        } else {
            None
        };
        
        // Get final rule results if applicable
        let final_rule_results = if let Some(results) = rule_results {
            let results_lock = match Arc::try_unwrap(results) {
                Ok(lock) => lock,
                Err(_) => {
                    eprintln!("Warning: Could not get exclusive access to rule results");
                    return Ok(AnalysisResult {
                        scan_result,
                        parse_duration,
                        analysis_duration,
                        parsed_count: final_parsed_count,
                        error_count: final_error_count,
                        rule_results: None,
                        files_per_second,
                    });
                }
            };
            
            let results = results_lock.into_inner();
            
            // Always print the header with color
            println!("\n{}", "Rule Results:".bold());

            // Only calculate and print details if there are matches
            if !results.matches.is_empty() {
                // Group results by rule and severity
                let mut rule_counts: HashMap<String, (usize, rules::RuleSeverity)> = HashMap::new();
                
                for rule_match in &results.matches {
                    if rule_match.matched {
                        let entry = rule_counts.entry(rule_match.rule_id.clone())
                            .or_insert((0, rule_match.severity));
                        entry.0 += 1;
                    }
                }
                
                // Initialize counters for the total summary
                let mut total_errors = 0;
                let mut total_warnings = 0;
                
                // Print summary grouped by severity
                for severity in [rules::RuleSeverity::Error, rules::RuleSeverity::Warning] {
                    let matches = rule_counts.iter()
                        .filter(|(_, (_, s))| *s == severity)
                        .collect::<Vec<_>>();
                    
                    if !matches.is_empty() {
                        // Update the totals
                        match severity {
                            rules::RuleSeverity::Error => total_errors = matches.len(),
                            rules::RuleSeverity::Warning => total_warnings = matches.len(),
                        }
                        
                        // Print severity header with appropriate color
                        let severity_str = match severity {
                            rules::RuleSeverity::Error => format!("{} Error findings:", matches.len()).red().bold(),
                            rules::RuleSeverity::Warning => format!("{} Warning findings:", matches.len()).yellow().bold(),
                        };
                        println!("  {}", severity_str);
                        
                        // Print individual rule results with their counts
                        for (rule_id, (count, _)) in matches {
                            // Color the rule ID based on severity
                            let colored_rule_id = match severity {
                                rules::RuleSeverity::Error => rule_id.red(),
                                rules::RuleSeverity::Warning => rule_id.yellow(),
                            };
                            println!("    {}: {} matches", colored_rule_id, count.to_string().bold());
                        }
                    }
                }
                
                // Print a summary line at the end if we have multiple severity types
                if total_errors + total_warnings > 1 {
                    let mut summary = vec![];
                    if total_errors > 0 {
                        summary.push(format!("{} errors", total_errors).red().bold().to_string());
                    }
                    if total_warnings > 0 {
                        summary.push(format!("{} warnings", total_warnings).yellow().bold().to_string());
                    }
                    println!("\n  Summary: {}", summary.join(", "));
                }
            } else {
                println!("  {}", "No rule violations found.".green().bold());
            }
            
            Some(results)
        } else {
            None
        };
        
        Ok(AnalysisResult {
            scan_result,
            parse_duration,
            analysis_duration,
            parsed_count: final_parsed_count,
            error_count: final_error_count,
            rule_results: final_rule_results,
            files_per_second,
        })
    }
} 