use std::{env, sync::Arc};

use typescript_analyzer::{
    analyzer::process_files,
    metrics::{aggregate_metrics, export_results},
    rules_registry::setup_rules_registry,
    utilities::{
        config::{get_debug_level, get_target_path, Config},
        file_utils::find_files,
        threading::configure_thread_pool,
    },
};

fn main() {
    // Initialize configuration and setup
    let config = Config::load();
    let args: Vec<String> = env::args().collect();
    let debug_level = get_debug_level(&config, &args);
    
    // Configure thread pool and rules registry
    configure_thread_pool(&config, debug_level);
    let rules_registry_arc = Arc::new(setup_rules_registry(&config, &args, debug_level));

    // Find and process files
    let dir_path = get_target_path(&config, &args);
    let (files, scan_duration) = find_files(&dir_path, debug_level);
    let (analysis_results, analysis_duration) = process_files(&files, &rules_registry_arc, debug_level);

    // Export results
    let metrics = aggregate_metrics(&analysis_results, scan_duration, analysis_duration);
    export_results(&config, &metrics, &analysis_results, debug_level);
}


