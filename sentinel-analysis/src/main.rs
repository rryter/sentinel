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

// Add reqwest for making HTTP requests
use reqwest::blocking::Client; // Changed to blocking client
use serde_json::Value; // To represent the analysis_results as JSON

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

    // Get rules config path from command-line arguments
    if let Some(rules_config_path) = matches.get_one::<String>("rules-config") {
        config.rules_config = Some(rules_config_path.clone());
        // Optional: Add a debug print to confirm the path is being set
        if debug_level >= scoper::utilities::DebugLevel::Debug {
            println!("DEBUG: Rules config path set from command line: {}", rules_config_path);
        }
    }

    // Fallback: If rules_config is not set by CLI or sentinel.json (via Config::load),
    // try to find rules.json next to the executable.
    if config.rules_config.is_none() {
        if let Ok(exe_path) = env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let rules_path_beside_exe = exe_dir.join("rules.json");
                if rules_path_beside_exe.exists() {
                    if let Some(path_str) = rules_path_beside_exe.to_str() {
                        config.rules_config = Some(path_str.to_string());
                        if debug_level >= scoper::utilities::DebugLevel::Debug {
                            println!("DEBUG: Rules config path set from rules.json next to executable: {}", path_str);
                        }
                    } else {
                        if debug_level >= scoper::utilities::DebugLevel::Warn {
                            eprintln!("WARNING: Found rules.json next to executable, but its path is not valid UTF-8.");
                        }
                    }
                }
            }
        }
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

    // Determine the path to findings.json
    let output_dir_str = config.output_dir.as_deref().unwrap_or("findings");
    let findings_path = std::path::Path::new(output_dir_str).join("findings.json");

    if debug_level >= scoper::utilities::DebugLevel::Info {
        println!("INFO: Attempting to read findings from: {}", findings_path.display());
    }

    match std::fs::read_to_string(&findings_path) {
        Ok(findings_content) => {
            match serde_json::from_str::<Value>(&findings_content) {
                Ok(json_payload) => {
                    if let Err(e) = send_results_to_api(&config, &json_payload, debug_level) {
                        if debug_level >= scoper::utilities::DebugLevel::Error {
                            eprintln!("ERROR: Failed to send results to API: {}", e);
                        }
                    }
                }
                Err(e) => {
                    if debug_level >= scoper::utilities::DebugLevel::Error {
                        eprintln!("ERROR: Failed to parse findings.json content: {}", e);
                    }
                }
            }
        }
        Err(e) => {
            if debug_level >= scoper::utilities::DebugLevel::Error {
                eprintln!("ERROR: Failed to read findings.json from {}: {}", findings_path.display(), e);
            }
        }
    }
}

fn send_results_to_api(
    config: &Config,
    analysis_results: &Value, // Ensure this is serde_json::Value
    debug_level: scoper::utilities::DebugLevel,
) -> Result<(), Box<dyn std::error::Error>> { // Return a boxed error for more flexibility
    let api_url = config.api_url.as_deref().unwrap_or("https://api.scoper.cloud/api/v1/projects/3/analysis_submissions");

    if debug_level >= scoper::utilities::DebugLevel::Info {
        println!("INFO: Sending analysis results to {}", api_url);
    }

    let client = Client::new();
    let response = client.post(api_url).json(analysis_results).send()?;

    let status = response.status();
    if debug_level >= scoper::utilities::DebugLevel::Debug {
        println!("DEBUG: API Response Status: {}", status);
    }

    if status.is_success() {
        if debug_level >= scoper::utilities::DebugLevel::Info {
            println!("INFO: Successfully sent analysis results to API.");
        }
        // Optionally print response body for success if needed and content type is JSON
        // if debug_level >= scoper::utilities::DebugLevel::Debug {
        //     match response.json::<serde_json::Value>().await {
        //         Ok(json_body) => println!("DEBUG: API Response Body: {:#?}", json_body),
        //         Err(_) => match response.text().await {
        //             Ok(text_body) => println!("DEBUG: API Response Body (non-JSON): {}", text_body),
        //             Err(e) => eprintln!("ERROR: Failed to read API response body: {}", e),
        //         },
        //     }
        // }
    } else {
        let error_message = format!("ERROR: API request failed with status: {}.", status);
        if debug_level >= scoper::utilities::DebugLevel::Error {
            eprintln!("{}", error_message);
        }
        // Attempt to read the error response body
        match response.text() { // Changed from response.text().await to response.text()
            Ok(body) => {
                if debug_level >= scoper::utilities::DebugLevel::Error {
                    eprintln!("ERROR: API Response Body: {}", body);
                }
                return Err(format!("{} Body: {}", error_message, body).into());
            }
            Err(e) => {
                if debug_level >= scoper::utilities::DebugLevel::Error {
                    eprintln!("ERROR: Failed to read API error response body: {}", e);
                }
                return Err(error_message.into());
            }
        }
    }

    Ok(())
}
