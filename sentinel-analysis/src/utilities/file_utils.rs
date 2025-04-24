use crate::utilities::{DebugLevel, log};
use std::time::{Duration, Instant};
use walkdir::WalkDir;

/// Find all TypeScript files in the given directory and subdirectories
pub fn find_typescript_files(dir: &str) -> Vec<String> {
    WalkDir::new(dir)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|e| {
            let path = e.path();
            path.is_file()
                && path
                    .extension()
                    .map_or(false, |ext| ext == "ts" || ext == "tsx")
        })
        .map(|e| e.path().to_string_lossy().to_string())
        .collect()
}

/// Find TypeScript files in the given directory and return them with timing information
pub fn find_files(dir_path: &str, debug_level: DebugLevel) -> (Vec<String>, Duration) {
    log(
        DebugLevel::Info,
        debug_level,
        &format!("\x1b[94mINFO:\x1b[0m Scanning directory: \x1b[93m{}\x1b[0m", dir_path),
    );

    let scan_start = Instant::now();
    let files = find_typescript_files(dir_path);
    let scan_duration = scan_start.elapsed();

    log(
        DebugLevel::Info,
        debug_level,
        &format!("Found {} TypeScript files", files.len()),
    );
    log(
        DebugLevel::Trace,
        debug_level,
        &format!("Processing with {} threads", rayon::current_num_threads()),
    );

    (files, scan_duration)
}
