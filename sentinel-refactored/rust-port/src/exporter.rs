use crate::FileAnalysisResult;
use crate::utilities::{DebugLevel, log};
use oxc_diagnostics::Severity;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Structure for JSON export of findings
#[derive(Serialize, Deserialize)]
pub struct FindingEntry {
    pub rule: String,
    pub message: String,
    pub file: String,
    pub start_line: u32,
    pub start_column: u32,
    pub end_line: u32,
    pub end_column: u32,
    pub severity: String,
    pub help: Option<String>,
}

/// Export diagnostics to findings.json
pub fn export_findings_json(results: &[FileAnalysisResult], debug_level: DebugLevel) {
    let mut findings = Vec::new();
    let mut rule_counts = HashMap::new();
    
    // Process each file result
    for result in results {
        for diagnostic in &result.diagnostics {

            // Get the message text and try to determine rule name
            let message = diagnostic.message.to_string();
            
            // Count occurrences by rule
            let rule_name = diagnostic.code.to_string();
            *rule_counts.entry(rule_name.clone()).or_insert(0) += 1;
            
            // Create a basic finding entry
            let finding = FindingEntry {
                rule: rule_name,
                message,
                file: result.file_path.clone(),
                start_line: 1,   // We don't have accurate location info
                start_column: 0, // so we use defaults
                end_line: 1,
                end_column: 0,
                severity: match diagnostic.severity {
                    Severity::Error => "error".to_string(),
                    Severity::Warning => "warning".to_string(),
                    _ => "info".to_string(),
                },
                help: diagnostic.help.as_ref().map(|h| h.to_string()),
            };
            
            findings.push(finding);
        }
    }
    
    // Print rule summary
    println!("\nRule hit summary:");
    println!("----------------");
    let mut rules: Vec<(&String, &usize)> = rule_counts.iter().collect();
    rules.sort_by(|a, b| b.1.cmp(a.1)); // Sort by count, descending
    
    for (rule, count) in rules {
        println!("{}: {} hits", rule, count);
    }
    println!("----------------");
    println!("Total: {} issues found\n", findings.len());
    
    // Save to findings.json
    if !findings.is_empty() {
        // Create findings directory if needed
        if let Err(e) = std::fs::create_dir_all("findings") {
            log(
                DebugLevel::Error,
                debug_level,
                &format!("Failed to create findings directory: {}", e),
            );
            return;
        }
        
        // Write findings to JSON
        let json = match serde_json::to_string_pretty(&findings) {
            Ok(json) => json,
            Err(e) => {
                log(
                    DebugLevel::Error,
                    debug_level,
                    &format!("Failed to serialize findings: {}", e),
                );
                return;
            }
        };
        
        // Write to file
        match std::fs::write("findings/findings.json", json) {
            Ok(_) => log(
                DebugLevel::Info,
                debug_level,
                &format!("Exported {} findings to findings/findings.json", findings.len()),
            ),
            Err(e) => log(
                DebugLevel::Error, 
                debug_level,
                &format!("Failed to write findings.json: {}", e),
            ),
        }
    } else {
        log(
            DebugLevel::Info,
            debug_level,
            "No findings to export",
        );
    }
}