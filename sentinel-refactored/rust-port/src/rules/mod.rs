use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use anyhow::Result;
use oxc_ast::ast::Program;
use serde::Deserialize;
use serde::Serialize;
use std::fs::File;
use std::io::Write;
use std::path::Path;
use oxc_span;
use std::time::{Duration, Instant};
use parking_lot::Mutex;
use num_cpus;

// --- Core Rule Definitions ---
// (If you have non-custom, built-in rules, they would be declared and registered here)

// --- Custom Rules Module ---
// This module will handle the dynamic discovery via build script
pub mod custom;

/// Type for rule factory functions
pub type RuleFactory = fn() -> Arc<dyn Rule>;

/// Rule plugin to encapsulate related rules
#[derive(Debug, Clone)]
pub struct RulePlugin {
    /// Name of the plugin
    pub name: String,
    /// Description of the plugin
    pub description: String,
    /// List of rule factory functions provided by this plugin
    pub rules: Vec<RuleFactory>,
}

/// Initialize the rule system (mainly for custom rules now)
pub fn initialize() {
    custom::initialize(); // Initialize the dynamic custom rules part
}

/// Get all rule plugins (built-in + custom)
pub fn get_all_plugins() -> Vec<RulePlugin> {
    let mut plugins = Vec::new();

    // Add built-in plugins here if any

    // Add custom plugins discovered dynamically
    if let Ok(custom_plugins) = custom::get_all_custom_plugins() {
        plugins.extend(custom_plugins);
    }

    plugins
}

/// Severity level for rule matches
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
pub enum RuleSeverity {
    /// A critical issue that must be fixed
    Error,
    /// An issue that should be addressed but isn't critical
    Warning,
}

// Implement Serialize manually for RuleSeverity
impl serde::Serialize for RuleSeverity {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            RuleSeverity::Error => serializer.serialize_str("error"),
            RuleSeverity::Warning => serializer.serialize_str("warning"),
        }
    }
}

impl RuleSeverity {
    /// Check if this severity level is at least as severe as the given level
    pub fn is_at_least(&self, level: RuleSeverity) -> bool {
        match (*self, level) {
            (RuleSeverity::Error, _) => true,
            (RuleSeverity::Warning, RuleSeverity::Error) => false,
            (RuleSeverity::Warning, _) => true,
        }
    }
}

/// Information about where in the source code a rule match occurred
#[derive(Debug, Clone, Serialize)]
pub struct SourceLocation {
    /// Line number (1-based)
    pub line: usize,
    /// Column number (1-based)
    pub column: usize,
    /// Start offset in the source text
    pub start: usize,
    /// End offset in the source text
    pub end: usize,
}

/// Helper function to create a SourceLocation from an oxc span
pub fn create_source_location(span: &oxc_span::Span) -> SourceLocation {
    SourceLocation {
        line: 1, // We don't have line information from the span
        column: 1, // We don't have column information from the span
        start: span.start as usize,
        end: span.end as usize,
    }
}

/// Result of evaluating a rule against a source file
#[derive(Debug, Clone, Serialize)]
pub struct RuleMatch {
    /// ID of the rule that produced this match
    pub rule_id: String,
    /// Path to the file containing the match
    pub file_path: String,
    /// Whether the rule matched (found a violation)
    pub matched: bool,
    /// Severity of this particular match
    pub severity: RuleSeverity,
    /// Human-readable description of the match
    pub message: Option<String>,
    /// Location in the source code where the match occurred
    pub location: Option<SourceLocation>,
    /// Additional data about the match
    pub metadata: HashMap<String, String>,
}

/// Collection of rule evaluation results
#[derive(Debug, Default, Serialize)]
pub struct RuleResults {
    /// All individual rule matches
    pub matches: Vec<RuleMatch>,
    /// Count of matches by rule ID
    pub counts: HashMap<String, usize>,
    /// Timestamp when the analysis was performed
    #[serde(skip)]
    timestamp: String,
}

impl RuleResults {
    /// Create a new empty results collection
    pub fn new() -> Self {
        Self {
            matches: Vec::new(),
            counts: HashMap::new(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
    
    /// Add a rule match to the results
    pub fn add_match(&mut self, rule_match: RuleMatch) {
        if rule_match.matched {
            *self.counts.entry(rule_match.rule_id.clone()).or_insert(0) += 1;
        }
        self.matches.push(rule_match);
    }
    
    /// Get the number of matches for a specific rule ID
    pub fn count_for_rule(&self, rule_id: &str) -> usize {
        *self.counts.get(rule_id).unwrap_or(&0)
    }
    
    /// Get all matches for a specific rule ID
    pub fn matches_for_rule(&self, rule_id: &str) -> Vec<&RuleMatch> {
        self.matches.iter()
            .filter(|m| m.rule_id == rule_id && m.matched)
            .collect()
    }
    
    /// Get all matches with at least the specified severity
    pub fn matches_with_min_severity(&self, severity: RuleSeverity) -> Vec<&RuleMatch> {
        self.matches.iter()
            .filter(|m| m.matched && m.severity.is_at_least(severity))
            .collect()
    }
    
    /// Export all rule findings to a JSON file
    pub fn export_to_json(&self, file_path: &str) -> Result<()> {
        let output = serde_json::json!({
            "timestamp": self.timestamp,
            "total_findings": self.matches.iter().filter(|m| m.matched).count(),
            "findings_by_rule": self.counts,
            "findings": self.matches.iter().filter(|m| m.matched).collect::<Vec<_>>(),
        });
        
        // Create the output file
        let path = Path::new(file_path);
        
        // Ensure the parent directory exists
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
                println!("Created directory: {}", parent.display());
            }
        }
        
        let mut file = File::create(path)?;
        
        // Write the JSON to the file
        let formatted_json = serde_json::to_string_pretty(&output)?;
        file.write_all(formatted_json.as_bytes())?;
        
        println!("");
        println!("Rule findings exported to: {}", file_path);
        
        Ok(())
    }
}

/// Core trait that all rules must implement
pub trait Rule: Send + Sync {
    /// Get the unique identifier for this rule
    fn id(&self) -> &str;
    
    /// Get a human-readable description of what this rule checks for
    fn description(&self) -> &str;
    
    /// Get the tags associated with this rule (for categorization)
    fn tags(&self) -> Vec<&str> {
        Vec::new()
    }
    
    /// Get the default severity of violations of this rule
    fn severity(&self) -> RuleSeverity;
    
    /// Evaluate this rule against a program
    /// 
    /// Returns a RuleMatch that indicates whether the rule matched (found a violation)
    /// and provides details about the match.
    fn evaluate(&self, program: &Program, file_path: &str) -> Result<RuleMatch>;
}

/// Registry that manages all available and enabled rules
pub struct RuleRegistry {
    /// All available rules
    available_rules: HashMap<String, Arc<dyn Rule>>,
    
    /// Currently enabled rules
    enabled_rules: HashMap<String, Arc<dyn Rule>>,
    
    /// Explicitly enabled rule IDs
    enabled_rule_ids: HashSet<String>,
    
    /// Explicitly disabled rule IDs
    disabled_rule_ids: HashSet<String>,
    
    /// Enabled rule tags
    enabled_tags: HashSet<String>,
    
    /// Disabled rule tags
    disabled_tags: HashSet<String>,
    
    /// Minimum severity level to enable
    min_severity: Option<RuleSeverity>,
    
    /// Debug mode for verbose logging
    debug_mode: bool,
    
    /// Performance metrics for rules
    performance_report: Arc<Mutex<RulePerformanceReport>>,
}

// Manually implement Debug for RuleRegistry
impl std::fmt::Debug for RuleRegistry {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("RuleRegistry")
            .field("available_rule_count", &self.available_rules.len())
            .field("enabled_rule_count", &self.enabled_rules.len())
            .field("enabled_rule_ids", &self.enabled_rule_ids)
            .field("disabled_rule_ids", &self.disabled_rule_ids)
            .field("enabled_tags", &self.enabled_tags)
            .field("disabled_tags", &self.disabled_tags)
            .field("min_severity", &self.min_severity)
            .field("debug_mode", &self.debug_mode)
            .finish()
    }
}

impl RuleRegistry {
    /// Create a new empty rule registry
    pub fn new() -> Self {
        Self {
            available_rules: HashMap::new(),
            enabled_rules: HashMap::new(),
            enabled_rule_ids: HashSet::new(),
            disabled_rule_ids: HashSet::new(),
            enabled_tags: HashSet::new(),
            disabled_tags: HashSet::new(),
            min_severity: None,
            debug_mode: false,
            performance_report: Arc::new(Mutex::new(RulePerformanceReport::new())),
        }
    }
    
    /// Enable or disable debug mode for verbose logging
    pub fn set_debug_mode(&mut self, debug: bool) {
        self.debug_mode = debug;
    }
    
    /// Check if debug mode is enabled
    pub fn is_debug_mode(&self) -> bool {
        self.debug_mode
    }
    
    /// Register a new rule with the registry
    pub fn register(&mut self, rule: Arc<dyn Rule>) {
        let rule_id = rule.id().to_string();
        if self.debug_mode {
            println!("Registering rule: {} - {}", rule_id, rule.description());
        }
        self.available_rules.insert(rule_id.clone(), rule);
        self.update_enabled_rules();
    }
    
    /// Register a plugin with the registry
    pub fn register_plugin(&mut self, plugin: &RulePlugin) {
        if self.debug_mode {
            println!("Registering plugin: {} - {}", plugin.name, plugin.description);
            println!("  Contains {} rules", plugin.rules.len());
        }
        
        for rule_factory in &plugin.rules {
            let rule = rule_factory();
            if self.debug_mode {
                println!("  - Adding rule: {} ({})", rule.id(), rule.description());
            }
            self.register(rule);
        }
    }
    
    /// Register all rules from multiple plugins
    pub fn register_all_plugins(&mut self, plugins: Vec<RulePlugin>) {
        if self.debug_mode {
            println!("Registering {} plugins", plugins.len());
        }
        for plugin in plugins {
            self.register_plugin(&plugin);
        }
        if self.debug_mode {
            println!("Finished registering all plugins");
        }
    }
    
    /// Register multiple rules at once
    pub fn register_all(&mut self, rules: Vec<Arc<dyn Rule>>) {
        for rule in rules {
            self.register(rule);
        }
    }
    
    /// Get a rule by ID
    pub fn get_rule(&self, rule_id: &str) -> Option<&Arc<dyn Rule>> {
        self.available_rules.get(rule_id)
    }
    
    /// Get all available rules
    pub fn available_rules(&self) -> impl Iterator<Item = (&String, &Arc<dyn Rule>)> {
        self.available_rules.iter()
    }
    
    /// Get all enabled rules
    pub fn enabled_rules(&self) -> impl Iterator<Item = (&String, &Arc<dyn Rule>)> {
        self.enabled_rules.iter()
    }
    
    /// Check if a rule is enabled
    pub fn is_rule_enabled(&self, rule_id: &str) -> bool {
        self.enabled_rules.contains_key(rule_id)
    }
    
    /// Enable a specific rule by ID
    pub fn enable_rule(&mut self, rule_id: &str) {
        self.enabled_rule_ids.insert(rule_id.to_string());
        self.disabled_rule_ids.remove(rule_id);
        self.update_enabled_rules();
    }
    
    /// Disable a specific rule by ID
    pub fn disable_rule(&mut self, rule_id: &str) {
        self.disabled_rule_ids.insert(rule_id.to_string());
        self.enabled_rule_ids.remove(rule_id);
        self.update_enabled_rules();
    }
    
    /// Enable rules with a specific tag
    pub fn enable_tag(&mut self, tag: &str) {
        self.enabled_tags.insert(tag.to_string());
        self.update_enabled_rules();
    }
    
    /// Disable rules with a specific tag
    pub fn disable_tag(&mut self, tag: &str) {
        self.disabled_tags.insert(tag.to_string());
        self.update_enabled_rules();
    }
    
    /// Set minimum severity level (only rules with this severity or higher will be enabled)
    pub fn set_min_severity(&mut self, severity: RuleSeverity) {
        self.min_severity = Some(severity);
        self.update_enabled_rules();
    }
    
    /// Clear all filters and enable all rules
    pub fn enable_all_rules(&mut self) {
        self.enabled_rule_ids.clear();
        self.disabled_rule_ids.clear();
        self.enabled_tags.clear();
        self.disabled_tags.clear();
        self.min_severity = None;
        
        // Copy all available rules to enabled rules
        self.enabled_rules = self.available_rules.clone();
    }
    
    /// Clear all filters and disable all rules
    pub fn disable_all_rules(&mut self) {
        self.enabled_rule_ids.clear();
        self.disabled_rule_ids.clear();
        self.enabled_tags.clear();
        self.disabled_tags.clear();
        self.min_severity = None;
        self.enabled_rules.clear();
    }
    
    /// Update the set of enabled rules based on current filters
    fn update_enabled_rules(&mut self) {
        self.enabled_rules.clear();
        
        if self.debug_mode {
            println!("Updating enabled rules. Available rules: {}", self.available_rules.len());
            println!("Filters: min_severity={:?}, enabled_tags={:?}, disabled_tags={:?}",
                     self.min_severity, self.enabled_tags, self.disabled_tags);
            
            let mut enabled_count = 0;
            let mut filtered_out = 0;
            
            for (id, rule) in &self.available_rules {
                // Skip explicitly disabled rules
                if self.disabled_rule_ids.contains(id) {
                    println!("  - Rule {} is explicitly disabled", id);
                    filtered_out += 1;
                    continue;
                }
                
                // Check for explicit enablement
                let explicitly_enabled = self.enabled_rule_ids.contains(id);
                
                // If we have explicit enables and this rule isn't in the list, skip it
                // (unless it was specifically enabled)
                if !self.enabled_rule_ids.is_empty() && !explicitly_enabled {
                    println!("  - Rule {} is not in explicitly enabled list", id);
                    filtered_out += 1;
                    continue;
                }
                
                // Check tag filters
                let rule_tags: HashSet<_> = rule.tags().into_iter().map(|s| s.to_string()).collect();
                
                // Skip if it has any disabled tags
                if !self.disabled_tags.is_empty() && !self.disabled_tags.is_disjoint(&rule_tags) {
                    println!("  - Rule {} has disabled tags: {:?}", id, rule_tags);
                    filtered_out += 1;
                    continue;
                }
                
                // Skip if we have enabled tags and it doesn't have any of them
                if !self.enabled_tags.is_empty() && self.enabled_tags.is_disjoint(&rule_tags) {
                    println!("  - Rule {} doesn't have any enabled tags: {:?}", id, rule_tags);
                    filtered_out += 1;
                    continue;
                }
                
                // Check severity filter
                if let Some(min_severity) = self.min_severity {
                    if !rule.severity().is_at_least(min_severity) {
                        println!("  - Rule {} severity {:?} doesn't meet minimum {:?}", 
                                 id, rule.severity(), min_severity);
                        filtered_out += 1;
                        continue;
                    }
                }
                
                // Rule passed all filters, so enable it
                println!("  + Enabling rule: {} ({:?})", id, rule.severity());
                self.enabled_rules.insert(id.clone(), rule.clone());
                enabled_count += 1;
            }
            
            println!("Rules enabled: {}, filtered out: {}", enabled_count, filtered_out);
        } else {
            // Non-debug version without excessive logging
            for (id, rule) in &self.available_rules {
                // Skip explicitly disabled rules
                if self.disabled_rule_ids.contains(id) {
                    continue;
                }
                
                // Check for explicit enablement
                let explicitly_enabled = self.enabled_rule_ids.contains(id);
                
                // If we have explicit enables and this rule isn't in the list, skip it
                if !self.enabled_rule_ids.is_empty() && !explicitly_enabled {
                    continue;
                }
                
                // Check tag filters
                let rule_tags: HashSet<_> = rule.tags().into_iter().map(|s| s.to_string()).collect();
                
                // Skip if it has any disabled tags
                if !self.disabled_tags.is_empty() && !self.disabled_tags.is_disjoint(&rule_tags) {
                    continue;
                }
                
                // Skip if we have enabled tags and it doesn't have any of them
                if !self.enabled_tags.is_empty() && self.enabled_tags.is_disjoint(&rule_tags) {
                    continue;
                }
                
                // Check severity filter
                if let Some(min_severity) = self.min_severity {
                    if !rule.severity().is_at_least(min_severity) {
                        continue;
                    }
                }
                
                // Rule passed all filters, so enable it
                self.enabled_rules.insert(id.clone(), rule.clone());
            }
        }
    }
    
    /// Get a clone of the performance report
    pub fn performance_report(&self) -> RulePerformanceReport {
        self.performance_report.lock().clone()
    }
    
    /// Export performance data to a JSON file
    pub fn export_performance_to_json(&self, file_path: &str) -> Result<()> {
        let report = self.performance_report.lock().clone();
        report.export_to_json(file_path)
    }
    
    /// Evaluate all enabled rules against a program
    pub fn evaluate_all(&self, program: &Program, file_path: &str) -> RuleResults {
        let mut results = RuleResults::new();
        
        // Remove per-file debugging output, but keep summary counts
        let debug_file_level = false; // Hard-code to false to disable per-file logs
        
        if self.debug_mode && debug_file_level {
            println!("Evaluating {} rules against file {}", self.enabled_rules.len(), file_path);
        }
        
        for rule in self.enabled_rules.values() {
            if self.debug_mode && debug_file_level {
                println!("  - Evaluating rule: {}", rule.id());
            }
            
            // Start timing the rule evaluation
            let start_time = Instant::now();
            let rule_result = rule.evaluate(program, file_path);
            let duration = start_time.elapsed();
            
            // Track performance metrics
            match &rule_result {
                Ok(rule_match) => {
                    // Update performance metrics
                    let mut report = self.performance_report.lock();
                    report.add_rule_execution(rule.id(), duration, rule_match.matched);
                    drop(report); // Explicitly drop the lock
                    
                    if self.debug_mode && debug_file_level && rule_match.matched {
                        println!("    * Rule matched: {} ({}) in {:?}", 
                                 rule.id(), rule_match.message.as_deref().unwrap_or("No message"), duration);
                    }
                    results.add_match(rule_match.clone());
                }
                Err(err) => {
                    // Still track performance even if the rule failed
                    let mut report = self.performance_report.lock();
                    report.add_rule_execution(rule.id(), duration, false);
                    drop(report); // Explicitly drop the lock
                    
                    if self.debug_mode && debug_file_level {
                        println!("    * Rule evaluation failed: {} in {:?}", err, duration);
                    }
                    // Create an error match for the rule evaluation failure
                    let error_match = RuleMatch {
                        rule_id: rule.id().to_string(),
                        file_path: file_path.to_string(),
                        matched: false,
                        severity: RuleSeverity::Error,
                        message: Some(format!("Rule evaluation failed: {}", err)),
                        location: None,
                        metadata: HashMap::new(),
                    };
                    results.add_match(error_match);
                }
            }
        }
        
        if self.debug_mode && debug_file_level {
            println!("Rule evaluation complete. {} matches found.", 
                     results.matches.iter().filter(|m| m.matched).count());
        }
        
        results
    }
}

/// Performance metrics for a single rule
#[derive(Debug, Clone, Serialize)]
pub struct RulePerformanceMetrics {
    /// ID of the rule
    pub rule_id: String,
    /// Total execution time for this rule across all files
    pub total_execution_time: Duration,
    /// Number of files this rule has been evaluated against
    pub file_count: usize,
    /// Number of files where this rule found issues
    pub match_count: usize,
}

impl RulePerformanceMetrics {
    /// Create new metrics for a rule
    pub fn new(rule_id: String) -> Self {
        Self {
            rule_id,
            total_execution_time: Duration::default(),
            file_count: 0,
            match_count: 0,
        }
    }
    
    /// Add timing data for a single rule evaluation
    pub fn add_execution(&mut self, duration: Duration, matched: bool) {
        self.total_execution_time += duration;
        self.file_count += 1;
        if matched {
            self.match_count += 1;
        }
    }
    
    /// Get the average execution time per file
    pub fn average_execution_time(&self) -> Duration {
        if self.file_count == 0 {
            Duration::default()
        } else {
            self.total_execution_time / self.file_count as u32
        }
    }
    
    /// Convert duration to milliseconds for serialization
    pub fn execution_time_ms(&self) -> f64 {
        self.total_execution_time.as_secs_f64() * 1000.0
    }
    
    /// Convert average duration to milliseconds for serialization
    pub fn average_execution_time_ms(&self) -> f64 {
        self.average_execution_time().as_secs_f64() * 1000.0
    }
}

/// Collection of performance metrics for all rules
#[derive(Debug, Default, Serialize, Clone)]
pub struct RulePerformanceReport {
    /// Performance metrics by rule ID
    pub metrics: HashMap<String, RulePerformanceMetrics>,
    /// Total execution time across all rules
    pub total_execution_time: Duration,
    /// Total number of file evaluations
    pub total_evaluations: usize,
    /// Number of cores used for normalization (automatically detected)
    pub core_count: usize,
    /// Timestamp when the report was created
    #[serde(skip)]
    timestamp: String,
}

impl RulePerformanceReport {
    /// Create a new empty performance report
    pub fn new() -> Self {
        Self {
            metrics: HashMap::new(),
            total_execution_time: Duration::default(),
            total_evaluations: 0,
            core_count: num_cpus::get(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
    
    /// Add performance data for a rule evaluation
    pub fn add_rule_execution(&mut self, rule_id: &str, duration: Duration, matched: bool) {
        let metric = self.metrics
            .entry(rule_id.to_string())
            .or_insert_with(|| RulePerformanceMetrics::new(rule_id.to_string()));
        
        metric.add_execution(duration, matched);
        self.total_execution_time += duration;
        self.total_evaluations += 1;
    }
    
    /// Get normalized total execution time accounting for parallelism
    pub fn normalized_execution_time(&self) -> Duration {
        if self.core_count <= 1 {
            self.total_execution_time
        } else {
            // Estimate the wall-clock time by dividing by number of cores
            // This is a rough approximation of actual parallelism benefit
            self.total_execution_time / self.core_count as u32
        }
    }

    /// Get normalized execution time in milliseconds
    pub fn normalized_execution_time_ms(&self) -> f64 {
        self.normalized_execution_time().as_secs_f64() * 1000.0
    }
    
    /// Get the top N slowest rules by total execution time
    pub fn top_slowest_rules(&self, n: usize) -> Vec<&RulePerformanceMetrics> {
        let mut metrics: Vec<&RulePerformanceMetrics> = self.metrics.values().collect();
        metrics.sort_by(|a, b| b.total_execution_time.cmp(&a.total_execution_time));
        metrics.truncate(n);
        metrics
    }
    
    /// Export performance data to a JSON file
    pub fn export_to_json(&self, file_path: &str) -> Result<()> {
        // Prepare data for charting libraries
        let rule_performance_data: Vec<serde_json::Value> = self.metrics.values()
            .map(|metric| {
                serde_json::json!({
                    "ruleId": metric.rule_id,
                    "totalExecutionTimeMs": metric.execution_time_ms(),
                    "averageExecutionTimeMs": metric.average_execution_time_ms(),
                    "fileCount": metric.file_count,
                    "matchCount": metric.match_count,
                    // Add normalized times per rule (approximation)
                    "normalizedExecutionTimeMs": metric.execution_time_ms() / self.core_count as f64,
                })
            })
            .collect();
        
        let output = serde_json::json!({
            "timestamp": self.timestamp,
            "coreCount": self.core_count,
            "totalExecutionTimeMs": self.total_execution_time.as_secs_f64() * 1000.0,
            "normalizedExecutionTimeMs": self.normalized_execution_time_ms(),
            "totalEvaluations": self.total_evaluations,
            "parallelExecution": true,
            "executionTimeExplanation": "totalExecutionTimeMs represents the cumulative time across all CPU cores. normalizedExecutionTimeMs provides an estimate of wall-clock time by accounting for parallel execution.",
            "topSlowestRules": self.top_slowest_rules(10).iter().map(|m| {
                serde_json::json!({
                    "ruleId": m.rule_id,
                    "totalExecutionTimeMs": m.execution_time_ms(),
                    "averageExecutionTimeMs": m.average_execution_time_ms(),
                    "normalizedExecutionTimeMs": m.execution_time_ms() / self.core_count as f64,
                    "fileCount": m.file_count,
                    "matchCount": m.match_count,
                })
            }).collect::<Vec<_>>(),
            "rulePerformance": rule_performance_data,
        });
        
        // Ensure the parent directory exists
        let path = Path::new(file_path);
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
                println!("Created directory: {}", parent.display());
            }
        }
        
        // Create the output file
        let mut file = File::create(path)?;
        
        // Write the JSON to the file
        let formatted_json = serde_json::to_string_pretty(&output)?;
        file.write_all(formatted_json.as_bytes())?;
        
        println!("Rule performance data exported to: {}", file_path);
        
        Ok(())
    }
}

// Base module for rule implementations
pub mod rules {
    // Rule implementations will be added here
} 