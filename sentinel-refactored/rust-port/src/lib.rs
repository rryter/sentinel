use std::path::Path;
use std::time::{Duration, Instant};
use anyhow::Result;
use walkdir::WalkDir;

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
    
    /// Analyze TypeScript files in a directory
    pub fn analyze_directory(&self, path: &Path, extensions: &[&str]) -> Result<AnalysisResult> {
        // First, scan for files
        let scan_result = self.scan_directory(path, extensions)?;
        
        if self.verbose {
            println!("Found {} files to analyze", scan_result.files.len());
        }
        
        // Now parse and analyze each file
        let parse_start = Instant::now();
        
        let analysis_start = Instant::now();
        
        for file_path in &scan_result.files {
            match std::fs::read_to_string(file_path) {
                Ok(_content) => {
                    // Simple string-based analysis for now
                }
                Err(_e) => {
                }
            }
        }
        
        let analysis_duration = analysis_start.elapsed();
        let parse_duration = parse_start.elapsed();
        
        Ok(AnalysisResult {
            scan_result,
            parse_duration,
            analysis_duration,
        })
    }
} 