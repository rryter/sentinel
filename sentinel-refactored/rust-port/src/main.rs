use std::path::Path;
use anyhow::Result;
use clap::Parser;
use colored::Colorize;
use typescript_analyzer::{TypeScriptAnalyzer, metrics::AnalysisMetrics};

/// A TypeScript analyzer that scans code and reports on issues
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to the codebase to analyze
    #[arg(short, long)]
    path: String,
    
    /// File extensions to include (default: ts, tsx)
    #[arg(short, long, default_value = "ts,tsx")]
    extensions: String,
    
    /// Print verbose output
    #[arg(short, long)]
    verbose: bool,
    
    /// Only scan for files without parsing or analyzing
    #[arg(short = 'n', long)]
    scan_only: bool,
    
    /// Maximum number of matches to display in the output
    #[arg(short, long, default_value = "20")]
    max_results: usize,
    
    /// Show rule details in output
    #[arg(short = 'd', long)]
    show_details: bool,
}

fn main() -> Result<()> {
    let args = Args::parse();
    let path = Path::new(&args.path);
    let extensions: Vec<&str> = args.extensions.split(',').collect();
    
    println!("{} TypeScript analyzer", "Sentinel".green().bold());
    println!("Scanning path: {}", path.display());
    
    // Create the analyzer
    let analyzer = TypeScriptAnalyzer::new(args.verbose);
    
    // Create metrics
    let mut metrics = AnalysisMetrics::new();
    
    if args.scan_only {
        // Just scan for files
        let scan_result = analyzer.scan_directory(path, &extensions)?;
        
        metrics.file_count = scan_result.files.len();
        metrics.scan_duration = scan_result.duration;
        
        println!("\n{} Found {} files in {:?}", 
                "Success:".green().bold(), 
                scan_result.files.len(), 
                scan_result.duration);
        
        // Print verbose output if requested
        if args.verbose {
            println!("\nFound files:");
            for file in &scan_result.files {
                println!("  {}", file);
            }
        }
    } else {
        // Perform full analysis
        let analysis_result = analyzer.analyze_directory(path, &extensions)?;
        
        // Update metrics
        metrics.file_count = analysis_result.scan_result.files.len();
        metrics.scan_duration = analysis_result.scan_result.duration;
        metrics.parse_duration = Some(analysis_result.parse_duration);
        metrics.analysis_duration = Some(analysis_result.analysis_duration);
        
        // Print results summary
        println!("\n{} Analysis completed:", "Success:".green().bold());
        println!("  Files scanned: {}", analysis_result.scan_result.files.len());
        println!("  Scan time: {:?}", analysis_result.scan_result.duration);
        println!("  Parse time: {:?}", analysis_result.parse_duration);
        println!("  Analysis time: {:?}", analysis_result.analysis_duration);
    }
    
    // Print metrics summary
    if args.verbose {
        metrics.print_summary();
    }
    
    Ok(())
}