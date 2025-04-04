use std::collections::HashSet;
use regex::Regex;

/// A match for a rule in a file
pub struct RuleMatch {
    pub file_path: String,
    pub line: usize,
    pub rule_id: String,
    pub message: String,
    pub details: Option<String>,
}

/// Find RxJS imports in a file's content
pub fn find_rxjs_imports_in_content(file_path: &str, content: &str) -> Vec<RuleMatch> {
    let mut matches = Vec::new();
    let mut symbols = HashSet::new();
    
    // Look for RxJS imports
    let rxjs_import_regex = Regex::new(r#"(?m)^import\s+\{([^}]+)\}\s+from\s+['"]rxjs(?:/[^'"]*)?['"]"#).unwrap();
    let rxjs_whole_import_regex = Regex::new(r#"(?m)^import\s+\*\s+as\s+(\w+)\s+from\s+['"]rxjs['"]"#).unwrap();
    
    // Function to get line number for a position in content
    let get_line_number = |pos: usize| -> usize {
        content[..pos].lines().count() + 1
    };
    
    // Process imports like: import { Observable, Subject } from 'rxjs'
    for cap in rxjs_import_regex.captures_iter(content) {
        if let Some(imports_match) = cap.get(1) {
            let imports_str = imports_match.as_str();
            let pos = imports_match.start();
            let line_number = get_line_number(pos);
            
            // Split and trim the imports
            let imported_symbols: Vec<&str> = imports_str
                .split(',')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .collect();
            
            for symbol in &imported_symbols {
                // Handle aliased imports like: map as mapOperator
                let actual_symbol = symbol.split(" as ").next().unwrap_or(symbol).trim();
                symbols.insert(actual_symbol.to_string());
            }
            
            // Create a rule match for this import statement
            matches.push(RuleMatch {
                file_path: file_path.to_string(),
                line: line_number,
                rule_id: "rxjs-import".to_string(),
                message: format!("RxJS import: {}", imports_str.trim()),
                details: Some(format!("Imported symbols: {}", imported_symbols.join(", "))),
            });
        }
    }
    
    // Process whole imports like: import * as Rx from 'rxjs'
    for cap in rxjs_whole_import_regex.captures_iter(content) {
        if let Some(namespace_match) = cap.get(1) {
            let namespace = namespace_match.as_str();
            let pos = namespace_match.start();
            let line_number = get_line_number(pos);
            
            // Create a rule match for the namespace import
            matches.push(RuleMatch {
                file_path: file_path.to_string(),
                line: line_number,
                rule_id: "rxjs-namespace-import".to_string(),
                message: format!("RxJS namespace import as {}", namespace),
                details: Some("Whole RxJS library imported as a namespace".to_string()),
            });
        }
    }
    
    // If we found any symbols, add a summary match
    if !symbols.is_empty() {
        let symbols_vec: Vec<String> = symbols.into_iter().collect();
        matches.push(RuleMatch {
            file_path: file_path.to_string(),
            line: 0, // Summary doesn't have a specific line
            rule_id: "rxjs-symbols-summary".to_string(),
            message: format!("RxJS symbols: {}", symbols_vec.join(", ")),
            details: None,
        });
    }
    
    matches
} 