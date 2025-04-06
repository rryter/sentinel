use std::path::Path;
use std::sync::Arc;
use anyhow::Result;
use clap::{Parser, Subcommand};
use colored::*;
use typescript_analyzer::{
    TypeScriptAnalyzer,
    rules::{
        RuleRegistry,
        RuleSeverity,
        initialize as initialize_rules,
        get_all_plugins,
    },
};
use crate::config::Config;

// Import num_cpus
use num_cpus;

mod config;

/// A TypeScript analyzer that scans code and reports on issues
#[derive(Parser, Debug)]
#[command(author, version, about = "TypeScript analyzer with rule-based AST analysis")]
struct Args {
    /// Optional subcommand
    #[command(subcommand)]
    command: Option<Commands>,
    
    /// Path to the directory to analyze
    #[arg(default_value = ".")]
    path: String,
    
    /// Enable verbose output
    #[arg(short, long)]
    verbose: bool,
    
    /// File extensions to include
    #[arg(short, long, default_value = "ts,tsx")]
    extensions: String,
    
    /// Disable rules-based analysis
    #[arg(long)]
    no_rules: bool,
    
    /// Enable verbose rule debugging output
    #[arg(long)]
    rule_debug: bool,
    
    /// Minimum severity level to report (error, warning, info)
    #[arg(short, long, default_value = "warning")]
    severity: String,
    
    /// Enable specific rule by ID
    #[arg(long)]
    enable_rule: Vec<String>,
    
    /// Disable specific rule by ID
    #[arg(long)]
    disable_rule: Vec<String>,
    
    /// Enable rules with specific tag
    #[arg(long)]
    enable_tag: Vec<String>,
    
    /// Disable rules with specific tag
    #[arg(long)]
    disable_tag: Vec<String>,

    /// Export rule findings to a JSON file
    #[arg(long, value_name = "FILE")]
    export_json: Option<String>,
    
    /// Export rule performance data to a JSON file
    #[arg(long, value_name = "FILE")]
    export_performance_json: Option<String>,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Generate visualizations for performance data
    Visualize {
        /// Path to the performance JSON file
        #[clap(short, long, default_value = "./results/performance.json")]
        input: String,

        /// Directory to output visualization images
        #[clap(short, long, default_value = "./results/charts")]
        output_dir: String,
    },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();
    
    // Initialize the rule system first
    initialize_rules();

    // Load configuration from sentinel.yaml
    let config = match Config::load("sentinel.yaml") {
        Ok(cfg) => {
            if args.verbose { // Optionally notify user if config was loaded
                println!("Loaded configuration from sentinel.yaml");
            }
            cfg
        }
        Err(e) => {
            // Only log error if the file was found but couldn't be parsed, or other IO error.
            // Don't warn if it's simply not found, as that's a normal case.
            if e.downcast_ref::<std::io::Error>().map_or(true, |io_err| io_err.kind() != std::io::ErrorKind::NotFound) {
               eprintln!("Warning: Could not load or parse sentinel.yaml: {}. Using default settings.", e);
            } else if args.verbose { // Optionally notify if using defaults because file not found
                println!("sentinel.yaml not found. Using default rule settings.");
            }
            Config::default()
        }
    };

    let path = Path::new(&args.path);
    let extensions: Vec<&str> = args.extensions.split(',').collect();
    
    // Create analyzer, optionally with rules
    let analyzer = if !args.no_rules {
        // Create registry with rules
        let mut registry = RuleRegistry::new();
        
        // Set debug mode based on config and command-line override
        registry.set_debug_mode(config.debug.rules || args.rule_debug);
        
        // Register all plugins dynamically
        let plugins = get_all_plugins();
        registry.register_all_plugins(plugins);
        
        // --- Apply Configuration Settings ---
        // Order: Defaults -> Config File -> Command Line Args

        // 1. Apply settings from config file (sentinel.yaml)
        if let Some(severity) = config.rules.min_severity {
            registry.set_min_severity(severity);
        }
        for tag in &config.rules.enable_tags {
            registry.enable_tag(tag);
        }
        for tag in &config.rules.disable_tags {
            registry.disable_tag(tag);
        }
        // Note: Explicit enable list in config restricts to *only* those rules (plus tags)
        // unless overridden by command line. Only apply if non-empty.
        if !config.rules.enable.is_empty() {
             for rule_id in &config.rules.enable {
                registry.enable_rule(rule_id);
             }
        }
        for rule_id in &config.rules.disable {
            registry.disable_rule(rule_id); // Disables take precedence later
        }
        
        // 2. Apply command-line configuration (overrides config file)
        // Set minimum severity
        match args.severity.to_lowercase().as_str() {
            "error" => registry.set_min_severity(RuleSeverity::Error),
            "warning" => registry.set_min_severity(RuleSeverity::Warning),
            _ => {}
        }
        
        // Apply rule-specific enables/disables
        for rule_id in &args.enable_rule {
            registry.enable_rule(rule_id);
        }
        
        for rule_id in &args.disable_rule {
            registry.disable_rule(rule_id);
        }
        
        // Apply tag-based enables/disables
        for tag in &args.enable_tag {
            registry.enable_tag(tag);
        }
        
        for tag in &args.disable_tag {
            registry.disable_tag(tag);
        }
        
        // Log final registry state in debug mode
        if registry.is_debug_mode() {
            println!("\n==== DEBUG: Final RuleRegistry State ====");
            println!("{:#?}", registry);
            println!("========================================\n");
            // Add a small delay to help visual separation in logs
            std::thread::sleep(std::time::Duration::from_millis(100)); 
        }

        // Print enabled rules if verbose mode is on
        if args.verbose {
            let enabled_rules_list: Vec<_> = registry.enabled_rules().collect();
            println!("\n{}", format!("--- Enabled Rules ({}) ---", enabled_rules_list.len()).cyan().bold());
            if enabled_rules_list.is_empty() {
                println!("  {}", "(No rules enabled based on current configuration)".yellow());
            } else {
                for (id, rule) in enabled_rules_list {
                    // Color based on rule severity
                    let colored_id = match rule.severity() {
                        RuleSeverity::Error => id.red().bold(),
                        RuleSeverity::Warning => id.yellow().bold(),
                    };
                    println!("  - {} ({}): {}", 
                        colored_id,
                        match rule.severity() {
                            RuleSeverity::Error => "ERROR".red(),
                            RuleSeverity::Warning => "WARNING".yellow(),
                        },
                        rule.description()
                    );
                }
            }
            println!("{}", "-------------------------".cyan());
        }
        
        TypeScriptAnalyzer::with_rules(args.verbose, Arc::new(registry))
    } else {
        TypeScriptAnalyzer::new(args.verbose)
    };
    
    // Display the analysis message with a newline before it
    println!("");
    println!("{}", "Path:".bold());
    println!("  {}", path.display().to_string().cyan().bold());
    
    // Run the analysis
    let results = analyzer.analyze_directory(path, &extensions)?;
    
    // Check if we have rule results
    if let Some(rule_results) = &results.rule_results {
        // Export to JSON if requested (command line has priority over config file)
        let export_path = args.export_json.as_ref().or(config.rules.export_json.as_ref());
        if let Some(export_path) = export_path {
            if let Err(e) = rule_results.export_to_json(export_path) {
                eprintln!("Error exporting results to JSON: {}", e);
            }
        }
        
        // Export performance data if requested
        if let Some(analyzer) = results.analyzer.as_ref() {
            if let Some(registry) = analyzer.rule_registry() {
                let performance_path = args.export_performance_json.as_ref()
                    .or(config.rules.export_performance_json.as_ref());
                
                if let Some(performance_path) = performance_path {
                    if let Err(e) = registry.export_performance_to_json(performance_path) {
                        eprintln!("Error exporting performance data to JSON: {}", e);
                    }
                }
            }
        }
    } else if !args.no_rules {
        // If rules were enabled but no results were found and not already printed in lib.rs
        println!("\n{}", "Rule Results:".bold());
        println!("  No rule matches found.");
        println!("\n  Summary: {} errors, {} warnings\n", "0".green(), "0".green());
    }
    
    println!("\n{}", "Analysis complete:".bold());
    println!("  Files scanned: {}", results.scan_result.files.len().to_string().cyan().bold());
    println!("  Files parsed: {}", results.parsed_count.to_string().green().bold());
    
    // Show parse errors as red if there are any
    let error_count_str = if results.error_count > 0 {
        results.error_count.to_string().red().bold()
    } else {
        results.error_count.to_string().green()
    };
    println!("  Parse errors: {}", error_count_str);
    
    // Calculate and display normalized semantic analysis duration
    let num_cores = num_cpus::get();
    let total_semantic_duration_nanos = results.total_cpu_semantic_duration.as_nanos();
    let normalized_semantic_duration_nanos = total_semantic_duration_nanos / (num_cores as u128);
    let normalized_semantic_duration = std::time::Duration::from_nanos(normalized_semantic_duration_nanos as u64);

    let normalized_semantic_str = if normalized_semantic_duration.as_secs() > 0 {
        format!("{:.3}s", normalized_semantic_duration.as_secs_f64())
    } else {
        format!("{}ms", normalized_semantic_duration.as_millis())
    };
    println!("  Normalized Semantic Analysis Time (Est.): {}", normalized_semantic_str.cyan());

    // Format parallel analysis duration
    let parallel_duration_str = if results.parallel_analysis_duration.as_secs() > 0 {
        format!("{:.3}s", results.parallel_analysis_duration.as_secs_f64())
    } else {
        format!("{}ms", results.parallel_analysis_duration.as_millis())
    };
    
    // Display parallel analysis duration
    println!("  Parallel Analysis Duration: {}", parallel_duration_str.cyan());
    
    // Display files per second if available (based on parallel analysis duration)
    if let Some(files_per_second) = results.files_per_second {
        println!("  Files per second: {}", files_per_second.to_string().cyan().bold());
    } else {
        println!("  Files per second: {}", "N/A (duration too small)".cyan());
    }

    Ok(())
}