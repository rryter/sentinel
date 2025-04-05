use std::path::Path;
use std::sync::Arc;
use anyhow::Result;
use clap::Parser;
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

mod config;

/// A TypeScript analyzer that scans code and reports on issues
#[derive(Parser, Debug)]
#[command(author, version, about = "TypeScript analyzer with rule-based AST analysis")]
struct Args {
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
}

fn main() -> Result<()> {
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
    
    println!("Analyzing TypeScript files in {}", path.display());
    
    // Run the analysis
    let result = analyzer.analyze_directory(path, &extensions)?;
    
    println!("\n{}", "Analysis complete:".bold());
    println!("  Files scanned: {}", result.scan_result.files.len().to_string().cyan().bold());
    println!("  Files parsed: {}", result.parsed_count.to_string().green().bold());
    
    // Show parse errors as red if there are any
    let error_count_str = if result.error_count > 0 {
        result.error_count.to_string().red().bold()
    } else {
        result.error_count.to_string().green()
    };
    println!("  Parse errors: {}", error_count_str);
    
    // Format duration with proper precision - no decimals for ms, 3 decimals for seconds
    let duration_str = if result.analysis_duration.as_secs() > 0 {
        format!("{:.3}s", result.analysis_duration.as_secs_f64())
    } else {
        format!("{}ms", result.analysis_duration.as_millis())
    };
    
    // Display analysis duration
    println!("  Analysis time: {}", duration_str.cyan());
    
    // Display files per second if available
    if let Some(files_per_second) = result.files_per_second {
        println!("  Files per second: {}", files_per_second.to_string().cyan().bold());
    } else {
        println!("  Files per second: {}", "N/A (duration too small)".cyan());
    }
    
    Ok(())
}