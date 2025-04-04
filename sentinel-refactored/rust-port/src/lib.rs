use std::path::{Path, PathBuf};
use std::fs;
use std::time::{Duration, Instant};
use anyhow::Result;
use walkdir::WalkDir;
// Add imports for oxc
use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_span::SourceType;

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
}

/// Find all files with the given extensions in a directory
pub fn find_files(
    path: &Path, 
    extensions: &[&str], 
    verbose: bool
) -> Result<ScanResult> {
    let start = Instant::now();
    let mut files = Vec::new();
    let walker = WalkDir::new(path).follow_links(false).into_iter();
    
    if verbose {
        println!("Scanning for files with extensions: {:?}", extensions);
    }
    
    for entry in walker.filter_map(|e| e.ok()) {
        let path = entry.path();
        
        // Skip directories
        if path.is_dir() {
            continue;
        }
        
        // Check if the file has a matching extension
        if let Some(ext) = path.extension() {
            if let Some(ext_str) = ext.to_str() {
                if extensions.contains(&ext_str) {
                    if verbose {
                        println!("Found matching file: {}", path.display());
                    }
                    
                    if let Some(path_str) = path.to_str() {
                        files.push(path_str.to_string());
                    }
                }
            }
        }
    }
    
    // Sort the file list for deterministic output
    files.sort();
    
    let duration = start.elapsed();
    
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
        
        let mut parsed_count = 0;
        let mut error_count = 0;
        
        for file_path in &scan_result.files {
            // Create a path object for the current file
            let file_path_obj = Path::new(file_path);
            
            match std::fs::read_to_string(file_path) {
                Ok(content) => {
                    // Create a new allocator for each file to avoid memory issues with large codebases
                    let allocator = Allocator::default();
                    
                    // Determine source type from file extension
                    let source_type = SourceType::from_path(file_path_obj).unwrap_or_default();
                    
                    // Parse the file
                    let parser_result = Parser::new(&allocator, &content, source_type).parse();
                    
                    // Handle parsing errors
                    if !parser_result.errors.is_empty() {
                        error_count += 1;
                        if self.verbose {
                            println!("Errors parsing file: {}", file_path);
                            for error in &parser_result.errors {
                                println!("  - {:?}", error);
                            }
                        }
                    } else {
                        parsed_count += 1;
                    }
                    
                    // Save the AST as JSON
                    if let Some(file_name) = file_path_obj.file_name() {
                        let mut output_path = results_dir.clone();
                        output_path.push(file_name);
                        output_path.set_extension("json");
                        
                        // Use built-in method to create JSON
                        let ast_json = parser_result.program.to_pretty_estree_ts_json();
                        
                        // Write to file
                        if let Err(e) = fs::write(&output_path, ast_json) {
                            if self.verbose {
                                eprintln!("Error writing AST to {}: {}", output_path.display(), e);
                            }
                        } else if self.verbose {
                            println!("Saved AST to {}", output_path.display());
                        }
                    }
                }
                Err(e) => {
                    error_count += 1;
                    if self.verbose {
                        println!("Error reading file {}: {}", file_path, e);
                    }
                }
            }
        }
        
        let parse_duration = parse_start.elapsed();
        let analysis_duration = analysis_start.elapsed();
        
        println!("Successfully parsed {} files ({} errors)", parsed_count, error_count);
        println!("Parse time: {:?}", parse_duration);
        
        Ok(AnalysisResult {
            scan_result,
            parse_duration,
            analysis_duration,
        })
    }
} 