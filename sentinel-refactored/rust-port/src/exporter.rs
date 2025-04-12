use crate::utilities::{log, DebugLevel};
use crate::FileAnalysisResult;
use oxc_diagnostics::Severity;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tabled::{
    builder::Builder,
    settings::{object::Columns, Alignment, Style},
};

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

/// Structure for findings export with summary
#[derive(Serialize, Deserialize)]
pub struct FindingsExport {
    pub findings_by_rule: HashMap<String, Vec<FindingEntry>>,
    pub summary: FindingsSummary,
}

/// Structure for findings summary
#[derive(Serialize, Deserialize)]
pub struct FindingsSummary {
    pub total_findings: usize,
    pub findings_by_rule: HashMap<String, usize>,
    pub findings_by_severity: HashMap<String, usize>,
    pub timestamp: String,
}

/// Extract position information from diagnostic when available
fn extract_position_info(_diagnostic: &oxc_diagnostics::OxcDiagnostic) -> (u32, u32, u32, u32) {
    // Default position info if we can't extract better data
    // For now, we're using static defaults since accessing the span information
    // from OxcDiagnostic would require more complex handling of the internal structure
    // or creating a custom implementation
    (1, 0, 1, 0)
}

/// Export diagnostics to findings.json
pub fn export_findings_json(results: &[FileAnalysisResult], debug_level: DebugLevel) {
    let mut findings_by_rule: HashMap<String, Vec<FindingEntry>> = HashMap::new();
    let mut rule_counts: HashMap<String, usize> = HashMap::new();
    let mut severity_counts: HashMap<String, usize> = HashMap::new();

    // Process each file result
    for result in results {
        for rule_diagnostic in &result.diagnostics {
            // Get the message text
            let message = rule_diagnostic.diagnostic.message.to_string();

            // Get rule ID directly from RuleDiagnostic
            let rule_name = rule_diagnostic.rule_id.clone();

            // Log the rule ID at debug level
            log(
                DebugLevel::Debug,
                debug_level,
                &format!("Using rule ID '{}' for diagnostic: {}", rule_name, message),
            );

            // Count occurrences by rule
            *rule_counts.entry(rule_name.clone()).or_insert(0) += 1;

            // Extract position information when available
            let (start_line, start_column, end_line, end_column) =
                extract_position_info(&rule_diagnostic.diagnostic);

            // Get severity
            let severity = match rule_diagnostic.diagnostic.severity {
                Severity::Error => "error".to_string(),
                Severity::Warning => "warning".to_string(),
                _ => "info".to_string(),
            };

            // Count occurrences by severity
            *severity_counts.entry(severity.clone()).or_insert(0) += 1;

            // Create a basic finding entry
            let finding = FindingEntry {
                rule: rule_name.clone(),
                message,
                file: result.file_path.clone(),
                start_line,
                start_column,
                end_line,
                end_column,
                severity,
                help: rule_diagnostic
                    .diagnostic
                    .help
                    .as_ref()
                    .map(|h| h.to_string()),
            };

            // Add finding to findings_by_rule
            findings_by_rule.entry(rule_name).or_default().push(finding);
        }
    }

    // Print rule summary
    println!("\nRule hit summary:");
    println!("----------------");
    let mut rules: Vec<(&String, &usize)> = rule_counts.iter().collect();
    rules.sort_by(|a, b| a.0.cmp(b.0)); // Sort by rule name, alphabetically

    // Build table
    let mut builder = Builder::new();
    builder.push_record(["Rule", "Hits"]);

    for (rule, count) in rules {
        builder.push_record([rule.as_str(), &count.to_string()]);
    }

    let mut table = builder.build();
    table
        .with(Style::ascii_rounded())
        .modify(Columns::single(1), Alignment::right()); // Right align the second column (Hits) using 0-based index

    // Print the table
    println!("{}", table);

    println!("----------------");
    println!(
        "Total: {} issues found\n",
        rule_counts.values().sum::<usize>()
    );

    // Create findings export structure
    let findings_export = FindingsExport {
        findings_by_rule,
        summary: FindingsSummary {
            total_findings: rule_counts.values().sum::<usize>(),
            findings_by_rule: rule_counts,
            findings_by_severity: severity_counts,
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    };

    // Save to findings.json
    if !findings_export.findings_by_rule.is_empty() {
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
        let json = match serde_json::to_string_pretty(&findings_export) {
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
                &format!(
                    "Exported {} findings to findings/findings.json",
                    findings_export.summary.total_findings
                ),
            ),
            Err(e) => log(
                DebugLevel::Error,
                debug_level,
                &format!("Failed to write findings.json: {}", e),
            ),
        }
    } else {
        log(DebugLevel::Info, debug_level, "No findings to export");
    }
}
