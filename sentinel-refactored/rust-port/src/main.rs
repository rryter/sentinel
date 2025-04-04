use std::path::Path;
use std::sync::Arc;
use anyhow::Result;
use clap::Parser;
use typescript_analyzer::{
    TypeScriptAnalyzer,
    rules::{
        RuleRegistry,
        RuleSeverity,
        create_rxjs_import_rule,
        create_angular_core_import_rule,
    }
};

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
    
    /// Enable rules-based analysis
    #[arg(short, long)]
    rules: bool,
    
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
    
    let path = Path::new(&args.path);
    let extensions: Vec<&str> = args.extensions.split(',').collect();
    
    // Create analyzer, optionally with rules
    let analyzer = if args.rules {
        // Create registry with rules
        let mut registry = RuleRegistry::new();
        
        // Register our example rules
        registry.register(create_rxjs_import_rule());
        registry.register(create_angular_core_import_rule());
        
        // Enable all rules by default
        registry.enable_all_rules();
        
        // Apply command-line configuration
        // Set minimum severity
        match args.severity.to_lowercase().as_str() {
            "error" => registry.set_min_severity(RuleSeverity::Error),
            "warning" => registry.set_min_severity(RuleSeverity::Warning),
            "info" => registry.set_min_severity(RuleSeverity::Info),
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
        
        if args.verbose {
            println!("Rule system enabled with {} rules:", registry.enabled_rules().count());
            for (id, rule) in registry.enabled_rules() {
                println!("  {} - {} ({:?})", id, rule.description(), rule.severity());
            }
        }
        
        TypeScriptAnalyzer::with_rules(args.verbose, Arc::new(registry))
    } else {
        TypeScriptAnalyzer::new(args.verbose)
    };
    
    println!("Analyzing TypeScript files in {}", path.display());
    
    // Run the analysis
    let result = analyzer.analyze_directory(path, &extensions)?;
    
    println!("\nAnalysis complete:");
    println!("  Files scanned: {}", result.scan_result.files.len());
    println!("  Files parsed: {}", result.parsed_count);
    println!("  Parse errors: {}", result.error_count);
    println!("  Analysis time: {:?}", result.analysis_duration);
    
    Ok(())
}