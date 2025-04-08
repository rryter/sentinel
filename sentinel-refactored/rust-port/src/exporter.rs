/// Export diagnostics to findings.json
pub fn export_findings_json(results: &[FileAnalysisResult], debug_level: DebugLevel) {
    let mut findings = Vec::new();
    let mut rule_counts = HashMap::new();
    
    // Process each file result
    for result in results {
        for diagnostic in &result.diagnostics {

            // Get the message text and try to determine rule name
            let message = diagnostic.message.to_string();
            
            // Create a basic finding entry
            let finding = FindingEntry {
                rule: diagnostic.code.to_string(),
                message,
                file: result.file_path.clone(),
                start_line: 1,   // We don't have accurate location info
                start_column: 0, // so we use defaults
                end_line: 1,
                end_column: 0,
                severity: match diagnostic.severity {
                    oxc_diagnostics::Severity::Error => "error".to_string(),
                    oxc_diagnostics::Severity::Warning => "warning".to_string(),
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