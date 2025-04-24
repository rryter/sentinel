use crate::FileAnalysisResult;
use crate::utilities::{DebugLevel, log};
use oxc_diagnostics::Error;
use oxc_diagnostics::Severity;
use oxc_diagnostics::reporter::Info;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tabled::{
    builder::Builder,
    settings::{Alignment, Style, object::Columns},
};

/// Structure for JSON export of findings
#[derive(Serialize, Deserialize)]
pub struct FindingEntry {
    pub rule: String,
    pub message: String,
    pub file: String,
    pub line: usize,
    pub column: usize,
    pub severity: String,
    pub help: Option<String>,
}

/// Structure for findings export with summary
#[derive(Serialize, Deserialize)]
pub struct FindingsExport {
    pub findings: Vec<FindingEntry>,
    pub summary: FindingsSummary,
}

/// Structure for findings summary
#[derive(Serialize, Deserialize)]
pub struct FindingsSummary {
    // Basic findings info
    pub total_findings: usize,
    pub findings_by_rule: HashMap<String, usize>,
    pub findings_by_severity: HashMap<String, usize>,
    pub timestamp: String,

    // Performance metrics
    pub total_duration_ms: u64,
    pub files_processed: usize,
    pub files_per_second_wall_time: f64,
    pub parallel_cores_used: usize,
    pub parallel_efficiency_percent: f64,
    pub scan_duration_ms: u64,
    pub analysis_duration_ms: u64,
}

/// Extract position information from diagnostic when available

/// Get total duration in ms
fn get_total_duration_ms(metrics: &crate::Metrics) -> u64 {
    // Calculate total duration as sum of scan and analysis duration
    let scan_ms = metrics
        .scan_duration
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let analysis_ms = metrics
        .analysis_duration
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    // Return the sum of scan and analysis duration
    scan_ms + analysis_ms
}

/// Export diagnostics to findings.json
pub fn export_findings_json(
    results: &[FileAnalysisResult],
    metrics: &crate::Metrics,
    debug_level: DebugLevel,
    output_dir: &String,
) {
    let mut findings: Vec<FindingEntry> = Vec::new();
    let mut rule_counts: HashMap<String, usize> = HashMap::new();
    let mut severity_counts: HashMap<String, usize> = HashMap::new();

    // Use static string references to avoid repeated allocations
    let error_str = "error".to_string();
    let warning_str = "warning".to_string();
    let info_str = "info".to_string();

    // Pre-allocate approximate capacity based on results size to avoid reallocations
    let estimated_findings = results.iter().map(|r| r.diagnostics.len()).sum::<usize>();
    if estimated_findings > 0 {
        findings.reserve(estimated_findings);
        rule_counts.reserve(estimated_findings / 5); // Assume average of 5 findings per rule
        severity_counts.reserve(3); // Typically just 3 severities
    }

    // Process each file result
    for result in results {
        // Extract position information once per file rather than per diagnostic
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

            // Get severity - reuse existing strings instead of creating new ones each time
            let severity = match rule_diagnostic.diagnostic.severity {
                Severity::Error => error_str.clone(),
                Severity::Warning => warning_str.clone(),
                _ => info_str.clone(),
            };

            // Count occurrences by severity
            *severity_counts.entry(severity.clone()).or_insert(0) += 1;

            // Create a basic finding entry
            let finding = FindingEntry {
                rule: rule_name.clone(),
                message,
                file: result.file_path.clone(),
                line: rule_diagnostic.line_number,
                column: rule_diagnostic.column_number,
                severity,
                help: rule_diagnostic
                    .diagnostic
                    .help
                    .as_ref()
                    .map(|h| h.to_string()),
            };

            // Add finding to the flat list
            findings.push(finding);
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

    // Get total duration in ms
    let total_duration_ms = get_total_duration_ms(metrics);

    // Get files processed and processing rate
    let files_processed = metrics.file_times.len();

    // Calculate files per second (wall time)
    let files_per_second_wall_time = if let Some(analysis_duration) = metrics.analysis_duration {
        if !analysis_duration.is_zero() {
            files_processed as f64 / analysis_duration.as_secs_f64()
        } else {
            0.0
        }
    } else {
        0.0
    };

    // Get parallel cores used
    let parallel_cores_used = rayon::current_num_threads();

    // Calculate parallel efficiency
    let parallel_efficiency_percent = if parallel_cores_used > 0 {
        let cumulative_processing_time: std::time::Duration = metrics.file_times.values().sum();
        if let Some(analysis_duration) = metrics.analysis_duration {
            if !analysis_duration.is_zero() {
                let speedup_factor =
                    cumulative_processing_time.as_secs_f64() / analysis_duration.as_secs_f64();
                (speedup_factor / parallel_cores_used as f64) * 100.0
            } else {
                0.0
            }
        } else {
            0.0
        }
    } else {
        0.0
    };

    // Get scan and analysis durations
    let scan_duration_ms = metrics
        .scan_duration
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let analysis_duration_ms = metrics
        .analysis_duration
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    // Create findings export structure
    let findings_export = FindingsExport {
        findings,
        summary: FindingsSummary {
            total_findings: rule_counts.values().sum::<usize>(),
            findings_by_rule: rule_counts,
            findings_by_severity: severity_counts,
            timestamp: chrono::Utc::now().to_rfc3339(),
            total_duration_ms,
            files_processed,
            files_per_second_wall_time,
            parallel_cores_used,
            parallel_efficiency_percent,
            scan_duration_ms,
            analysis_duration_ms,
        },
    };

    // Save to findings.json
    if !findings_export.findings.is_empty() {
        // Create the output directory if needed
        if let Err(e) = std::fs::create_dir_all(output_dir) {
            log(
                DebugLevel::Error,
                debug_level,
                &format!("Failed to create output directory {}: {}", output_dir, e),
            );
            return;
        }

        // Construct the full file path
        let file_path = format!("{}/findings.json", output_dir);

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
        match std::fs::write(&file_path, json) {
            Ok(_) => log(
                DebugLevel::Info,
                debug_level,
                &format!(
                    "Exported {} findings to {}",
                    findings_export.summary.total_findings, file_path
                ),
            ),
            Err(e) => log(
                DebugLevel::Error,
                debug_level,
                &format!("Failed to write {}: {}", file_path, e),
            ),
        }
    } else {
        log(DebugLevel::Info, debug_level, "No findings to export");
    }
}
