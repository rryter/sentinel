use crate::utilities::DebugLevel;
use clap::{Arg, ArgAction, Command};

/// Parse command-line arguments using clap
pub fn parse_args() -> Command {
    Command::new("scoper")
        .version("0.1.0")
        .author("TypeScript Analyzer Team")
        .about("A high-performance, rule-based analyzer for TypeScript/JavaScript codebases")
        .arg(
            Arg::new("PATH")
                .help("Path to the directory or file to analyze")
                .index(1),
        )
        .arg(
            Arg::new("verbose")
                .short('v')
                .long("verbose")
                .help("Enable verbose output")
                .action(ArgAction::SetTrue),
        )
        .arg(
            Arg::new("extensions")
                .short('e')
                .long("extensions")
                .help("File extensions to include (default: \"ts,tsx\")")
                .value_name("EXTS"),
        )
        .arg(
            Arg::new("debug-level")
                .short('d')
                .long("debug-level")
                .help("Set debug level (0=Error, 1=Warn, 2=Info, 3=Debug, 4=Trace)")
                .value_name("LEVEL"),
        )
        .arg(
            Arg::new("output-dir")
                .short('o')
                .long("output-dir")
                .help("Directory to store findings.json and other output files")
                .value_name("DIR"),
        )
        .arg(
            Arg::new("no-rules")
                .long("no-rules")
                .help("Disable rules-based analysis")
                .action(ArgAction::SetTrue),
        )
        .arg(
            Arg::new("rule-debug")
                .long("rule-debug")
                .help("Enable verbose rule debugging output")
                .action(ArgAction::SetTrue),
        )
        .arg(
            Arg::new("severity")
                .short('s')
                .long("severity")
                .help("Minimum severity level to report (error, warning, info)")
                .value_name("LEVEL"),
        )
        .arg(
            Arg::new("enable-rule")
                .long("enable-rule")
                .help("Enable specific rule by ID (can be used multiple times)")
                .value_name("RULE_ID")
                .action(ArgAction::Append),
        )
        .arg(
            Arg::new("disable-rule")
                .long("disable-rule")
                .help("Disable specific rule by ID (can be used multiple times)")
                .value_name("RULE_ID")
                .action(ArgAction::Append),
        )
        .arg(
            Arg::new("enable-tag")
                .long("enable-tag")
                .help("Enable rules with specific tag (can be used multiple times)")
                .value_name("TAG")
                .action(ArgAction::Append),
        )
        .arg(
            Arg::new("disable-tag")
                .long("disable-tag")
                .help("Disable rules with specific tag (can be used multiple times)")
                .value_name("TAG")
                .action(ArgAction::Append),
        )
        .arg(
            Arg::new("export-json")
                .long("export-json")
                .help("Export rule findings to a JSON file")
                .value_name("FILE"),
        )
        .arg(
            Arg::new("rules")
                .short('r')
                .long("rules")
                .help("Comma-separated list of rules to enable")
                .value_name("RULES"),
        )
        .arg(
            Arg::new("rules-config")
                .long("rules-config")
                .help("Path to rules configuration file")
                .value_name("FILE"),
        )
        .arg(
            Arg::new("threads")
                .long("threads")
                .help("Number of threads to use for parallel processing")
                .value_name("NUM"),
        )
}

/// Get debug level from parsed arguments
pub fn get_debug_level_from_args(matches: &clap::ArgMatches) -> DebugLevel {
    // Check for numeric debug level
    if let Some(level) = matches.get_one::<String>("debug-level") {
        match level.parse() {
            Ok(level) => return level,
            Err(_) => return DebugLevel::Info,
        }
    }

    // Check for verbose flag
    if matches.get_flag("verbose") {
        return DebugLevel::Debug;
    }

    DebugLevel::Info
}
