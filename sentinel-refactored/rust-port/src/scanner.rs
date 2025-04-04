use std::path::Path;
use std::fs;
use anyhow::Result;

/// Information about a TypeScript file
pub struct TypeScriptFile {
    pub path: String,
    pub size: u64,
    pub line_count: usize,
}

/// Read a TypeScript file and gather information about it
pub fn read_typescript_file(path: &Path) -> Result<TypeScriptFile> {
    let metadata = fs::metadata(path)?;
    let content = fs::read_to_string(path)?;
    
    let line_count = content.lines().count();
    
    Ok(TypeScriptFile {
        path: path.to_string_lossy().into_owned(),
        size: metadata.len(),
        line_count,
    })
}

/// Check if a file is likely a TypeScript file based on extension
pub fn is_typescript_file(path: &Path) -> bool {
    if let Some(ext) = path.extension() {
        if let Some(ext_str) = ext.to_str() {
            return ext_str == "ts" || ext_str == "tsx";
        }
    }
    
    false
}

/// Get all TypeScript files in a directory recursively
#[allow(dead_code)] // Will be used in the future
pub fn get_typescript_files(dir: &Path) -> Result<Vec<TypeScriptFile>> {
    let mut files = Vec::new();
    
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        
        if path.is_dir() {
            // Recursively process subdirectories
            let mut subdir_files = get_typescript_files(&path)?;
            files.append(&mut subdir_files);
        } else if is_typescript_file(&path) {
            // Process TypeScript file
            let file_info = read_typescript_file(&path)?;
            files.push(file_info);
        }
    }
    
    Ok(files)
} 