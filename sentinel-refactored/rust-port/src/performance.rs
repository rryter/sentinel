use std::collections::HashMap;
use chrono;
use serde_json;

/// RuleStats tracks performance statistics for a single rule
#[derive(Debug, Clone)]
pub struct RuleStats {
    pub file_count: u64,
    pub match_count: u64,
    pub total_execution_time_ms: f64,
    pub normalized_execution_time_ms: f64,
}

impl RuleStats {
    pub fn new() -> Self {
        Self {
            file_count: 0,
            match_count: 0,
            total_execution_time_ms: 0.0,
            normalized_execution_time_ms: 0.0,
        }
    }
    
    pub fn avg_execution_time_ms(&self) -> f64 {
        if self.file_count > 0 {
            self.total_execution_time_ms / self.file_count as f64
        } else {
            0.0
        }
    }
}

/// Updates the rule performance data JSON structure with:
/// - Timestamp information 
/// - Core count
/// - Execution times (both raw and normalized)
/// - Files processed per second
pub fn generate_performance_report(rule_stats: &HashMap<String, RuleStats>, 
                                total_execution_time_ms: f64,
                                normalized_execution_time_ms: f64,
                                total_evaluations: u64) -> serde_json::Value {
    // Get the number of CPU cores
    let core_count = num_cpus::get_physical() as u64;
    
    // Create timestamp in ISO 8601 format
    let now = std::time::SystemTime::now();
    let datetime: chrono::DateTime<chrono::Utc> = now.into();
    let timestamp = datetime.to_rfc3339();
    
    // Process each rule's statistics
    let rule_performance = rule_stats.iter().map(|(rule_id, stats)| {
        serde_json::json!({
            "ruleId": rule_id,
            "fileCount": stats.file_count,
            "matchCount": stats.match_count,
            "totalExecutionTimeMs": stats.total_execution_time_ms,
            "normalizedExecutionTimeMs": stats.normalized_execution_time_ms,
            "avgExecutionTimeMs": stats.avg_execution_time_ms()
        })
    }).collect::<Vec<_>>();
    
    serde_json::json!({
        "timestamp": timestamp,
        "coreCount": core_count,
        "totalExecutionTimeMs": total_execution_time_ms,
        "normalizedExecutionTimeMs": normalized_execution_time_ms,
        "totalEvaluations": total_evaluations,
        "filesPerSecond": if normalized_execution_time_ms > 0.0 { 
            ((total_evaluations as f64) / rule_stats.len() as f64) / (normalized_execution_time_ms / 1000.0)
        } else { 
            0.0 
        },
        "rulePerformance": rule_performance
    })
} 