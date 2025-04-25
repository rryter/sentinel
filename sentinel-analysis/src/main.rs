use std::{env, sync::Arc};

use scoper::{
    analyzer::process_files,
    metrics::{aggregate_metrics, export_results},
    rules_registry::setup_rules_registry,
    utilities::{
        cli::{get_debug_level_from_args, parse_args},
        config::{Config, get_target_path},
        file_utils::find_files,
        threading::configure_thread_pool,
    },
};

fn main() {
    // Parse command-line arguments
    let command = parse_args();
    let matches = command.get_matches();

    // Initialize configuration and setup
    let mut config = Config::load();
    let debug_level = get_debug_level_from_args(&matches);

    // Get output directory from command-line arguments
    if let Some(output_dir) = matches.get_one::<String>("output-dir") {
        config.output_dir = Some(output_dir.clone());
        println!("DEBUG: Output directory set to: {}", output_dir);
    }

    // Check if --help was provided
    if matches.contains_id("help") {
        // clap has already displayed the help message
        return;
    }

    // Configure thread pool and rules registry
    configure_thread_pool(&config, debug_level);
    let rules_registry_arc = Arc::new(setup_rules_registry(
        &config,
        &env::args().collect::<Vec<_>>(),
        debug_level,
    ));

    // Find and process files
    let dir_path = match matches.get_one::<String>("PATH") {
        Some(path) => path.clone(),
        None => get_target_path(&config, &env::args().collect::<Vec<_>>()),
    };

    let (files, scan_duration) = find_files(&dir_path, debug_level);
    let (analysis_results, analysis_duration) =
        process_files(&files, &rules_registry_arc, debug_level);

    // Export results
    let metrics = aggregate_metrics(&analysis_results, scan_duration, analysis_duration);
    export_results(&config, &metrics, &analysis_results, debug_level);
}
