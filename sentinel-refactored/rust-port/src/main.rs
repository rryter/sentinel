use std::path::Path;
use std::collections::HashMap;
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
        
        // Organize matches by rule type
        let mut matches_by_rule: HashMap<String, Vec<&typescript_analyzer::analyzer::RuleMatch>> = HashMap::new();
        for rule_match in &analysis_result.rule_matches {
            matches_by_rule
                .entry(rule_match.rule_id.clone())
                .or_default()
                .push(rule_match);
        }
        
        // Print summary by rule
        println!("\n{} Results by rule type:", "Summary:".yellow().bold());
        for (rule_id, matches) in &matches_by_rule {
            println!("  {}: {} matches", rule_id, matches.len());
        }
        
        let total_matches: usize = matches_by_rule.values().map(|v| v.len()).sum();
        println!("  Total rule matches: {}", total_matches);
        
        // First print symbol summaries if there are any
        if let Some(summary_matches) = matches_by_rule.get("rxjs-symbols-summary") {
            if !summary_matches.is_empty() {
                println!("\n{} RxJS Symbol Usage Summary:", "Symbols:".cyan().bold());
                let mut symbol_usage: HashMap<String, i32> = HashMap::new();
                
                if args.verbose {
                    // Print per-file summaries
                    for (_i, rule_match) in summary_matches.iter().enumerate().take(args.max_results) {
                        println!("  {}: {}", 
                                rule_match.file_path,
                                rule_match.message);
                        
                        // Extract symbols from the message for overall counting
                        if let Some(prefix) = rule_match.message.find("RxJS symbols: ") {
                            let symbols_str = &rule_match.message[prefix + 13..];
                            for symbol in symbols_str.split(", ") {
                                *symbol_usage.entry(symbol.to_string()).or_insert(0) += 1;
                            }
                        }
                    }
                    
                    if summary_matches.len() > args.max_results {
                        println!("  ... and {} more files with RxJS imports", 
                                summary_matches.len() - args.max_results);
                    }
                } else {
                    // Just extract symbols for overall counting
                    for rule_match in summary_matches {
                        if let Some(prefix) = rule_match.message.find("RxJS symbols: ") {
                            let symbols_str = &rule_match.message[prefix + 13..];
                            for symbol in symbols_str.split(", ") {
                                *symbol_usage.entry(symbol.to_string()).or_insert(0) += 1;
                            }
                        }
                    }
                }
                
                // Print overall symbols usage
                println!("\n{} Most Common RxJS Symbols:", "Top Symbols:".cyan().bold());
                
                // Convert to vec and sort by usage count
                let mut symbol_counts: Vec<(String, i32)> = symbol_usage.into_iter().collect();
                symbol_counts.sort_by(|a, b| b.1.cmp(&a.1));
                
                for (_i, (symbol, count)) in symbol_counts.iter().enumerate().take(15) {
                    println!("  {}: {} files", symbol, count);
                }
                
                if symbol_counts.len() > 15 {
                    println!("  ... and {} more symbols", symbol_counts.len() - 15);
                }
            }
        }
        
        // Print individual rule matches (excluding summaries)
        if total_matches > 0 {
            // Print imports only if requested 
            if args.verbose || args.show_details {
                println!("\n{} Rule matches (showing at most {}):", 
                        "Found:".yellow().bold(), 
                        args.max_results);
                
                let mut count = 0;
                // First print non-summary matches
                for (rule_id, matches) in &matches_by_rule {
                    if rule_id == "rxjs-symbols-summary" {
                        continue; // Skip summaries as they were already printed
                    }
                    
                    for rule_match in matches {
                        if count >= args.max_results {
                            println!("  ... and {} more matches (use --verbose to see all)", 
                                    total_matches - args.max_results);
                            break;
                        }
                        
                        println!("  {}:{} - {} ({})", 
                                rule_match.file_path,
                                rule_match.line,
                                rule_match.message,
                                rule_match.rule_id);
                                
                        // Print details if available and requested
                        if args.show_details {
                            if let Some(details) = &rule_match.details {
                                println!("      {}", details);
                            }
                        }
                        
                        count += 1;
                    }
                    
                    if count >= args.max_results {
                        break;
                    }
                }
            } else {
                println!("\n{} {} rule matches found.", 
                        "Found:".yellow().bold(), 
                        total_matches);
                println!("  Use --verbose or --show-details to see individual matches");
            }
        }
        
        // Print parse errors if any
        if !analysis_result.parse_errors.is_empty() {
            println!("\n{} Parse errors (showing at most {}):", 
                     "Errors:".red().bold(),
                     args.max_results);
            
            for (i, (file_path, errors)) in analysis_result.parse_errors.iter().enumerate() {
                if i >= args.max_results {
                    println!("  ... and errors in {} more files", 
                             analysis_result.parse_errors.len() - args.max_results);
                    break;
                }
                
                println!("  {}: {} errors", file_path, errors.len());
                if args.verbose {
                    for (j, error) in errors.iter().enumerate() {
                        if j >= 3 {
                            println!("    ... and {} more errors in this file", errors.len() - 3);
                            break;
                        }
                        println!("    - {}", error);
                    }
                }
            }
        }
    }
    
    // Print metrics summary
    if args.verbose {
        metrics.print_summary();
    }
    
    Ok(())
}