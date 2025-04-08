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