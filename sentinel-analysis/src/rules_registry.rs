use oxc_diagnostics::Error;
use oxc_diagnostics::reporter::Info;
use oxc_semantic::SemanticBuilderReturn;
use oxc_span::GetSpan;
use std::collections::{HashMap, HashSet};
use std::time::Duration;
use std::time::Instant;
// Import the Rule trait and rule implementations
use crate::RuleDiagnostic;
pub use crate::rules::Rule;
pub use crate::rules::{NoDebuggerRule, NoEmptyPatternRule};

/// The result of running a rule on a file
pub struct RuleResult {
    #[allow(dead_code)]
    pub file_path: String,
    pub diagnostics: Vec<RuleDiagnostic>,
}

/// A registry for all available rules
pub struct RulesRegistry {
    rules: HashMap<&'static str, Box<dyn Rule>>,
    enabled_rules: HashSet<String>,
    rule_severity: HashMap<String, String>,
}

impl RulesRegistry {
    /// Create a new registry with no rules
    pub fn new() -> Self {
        Self {
            rules: HashMap::new(),
            enabled_rules: HashSet::new(),
            rule_severity: HashMap::new(),
        }
    }

    /// Register a rule with the registry
    pub fn register_rule(&mut self, rule: Box<dyn Rule>) {
        let rule_name = rule.name();
        self.rules.insert(rule_name, rule);
    }

    /// Enable a rule by name
    pub fn enable_rule(&mut self, rule_name: &str) {
        self.enabled_rules.insert(rule_name.to_string());
    }

    /// Enable multiple rules by name
    pub fn enable_rules(&mut self, rule_names: &[&str]) {
        for name in rule_names {
            self.enable_rule(name);
        }
    }

    /// Disable a rule by name
    pub fn disable_rule(&mut self, rule_name: &str) {
        self.enabled_rules.remove(rule_name);
    }

    /// Check if a rule is enabled
    #[allow(dead_code)]
    pub fn is_rule_enabled(&self, rule_name: &str) -> bool {
        self.enabled_rules.contains(rule_name)
    }

    /// Get all registered rules
    #[allow(dead_code)]
    pub fn get_registered_rules(&self) -> Vec<&'static str> {
        self.rules.keys().cloned().collect()
    }

    /// Set the severity for a rule
    pub fn set_rule_severity(&mut self, rule_name: &str, severity: &str) {
        self.rule_severity
            .insert(rule_name.to_string(), severity.to_string());
    }

    /// Get the severity for a rule
    pub fn get_rule_severity(&self, rule_name: &str) -> Option<&String> {
        self.rule_severity.get(rule_name)
    }

    /// Get all enabled rules
    pub fn get_enabled_rules(&self) -> Vec<String> {
        self.enabled_rules.iter().cloned().collect()
    }

    /// Run all enabled rules on a file's semantic analysis and get metrics by rule
    pub fn run_rules_with_metrics(
        &self,
        semantic_result: &SemanticBuilderReturn,
        file_path: &str,
        source_code: &str,
    ) -> (Vec<RuleDiagnostic>, HashMap<String, Duration>) {
        let mut diagnostics = Vec::new();
        let mut rule_durations = HashMap::new();

        // Only process if we have rules enabled
        if !self.enabled_rules.is_empty() {
            // First, run visitor-based rules
            for rule_name in &self.enabled_rules {
                if let Some(rule) = self.rules.get(rule_name.as_str()) {
                    // Time the rule execution
                    let rule_start = Instant::now();

                    // Run visitor-based analysis
                    let visitor_diagnostics = rule.run_on_semantic(semantic_result, file_path);

                    // Wrap each diagnostic with rule ID
                    for diagnostic in visitor_diagnostics {
                        diagnostics.push(RuleDiagnostic {
                            rule_id: rule_name.clone(),
                            diagnostic,
                            source_code: source_code.to_string(),
                            column_number: 0,
                            line_number: 0,
                        });
                    }

                    // Record the time taken locally
                    let duration = rule_start.elapsed();
                    rule_durations.insert(rule_name.to_string(), duration);
                }
            }

            // Check if any enabled rule actually uses node-based processing
            // For simplicity, we'll currently just scan all nodes for all rules
            // A future optimization would be to:
            // 1. Check if the rule implements run_on_node (requires modifying trait definition)
            // 2. Only traverse nodes if at least one rule implements run_on_node
            // 3. Only call run_on_node for rules that actually implement it (avoiding empty Vec allocations)
            let has_node_based_rules = self.enabled_rules.iter().any(|rule_name| {
                self.rules.get(rule_name.as_str()).map_or(false, |_rule| {
                    // For now, we assume all rules *might* use node-based processing
                    // In the future, we could have a trait method that returns whether
                    // the rule uses node-based processing
                    true
                })
            });

            // >>> Section 2: Run traditional node-based rules (Conditionally) <<<
            if has_node_based_rules {
                for node in semantic_result.semantic.nodes() {
                    let node_kind = node.kind();
                    let span = node.span();

                    // Run each enabled rule on this node
                    for rule_name in &self.enabled_rules {
                        if let Some(rule) = self.rules.get(rule_name.as_str()) {
                            // Time the rule execution
                            let rule_start = Instant::now();

                            // Run the rule
                            let diagnostics_vec = rule.run_on_node(&node_kind, span, &file_path);

                            // Record the time taken *only if* a diagnostic was produced
                            let duration = rule_start.elapsed();

                            if !diagnostics_vec.is_empty() {
                                // Record time only when rule yielded results for this node
                                rule_durations.insert(rule_name.to_string(), duration);

                                // Add all diagnostics from the Vec to your collection
                                for diagnostic in diagnostics_vec {
                                    let error = diagnostic
                                        .clone()
                                        .with_source_code(source_code.to_string());
                                    let (line, column) = extract_position_info(&error);
                                    diagnostics.push(RuleDiagnostic {
                                        rule_id: rule_name.clone(),
                                        diagnostic,
                                        source_code: source_code.to_string(),
                                        line_number: line,
                                        column_number: column,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        (diagnostics, rule_durations)
    }
}

/// Create a registry with all default rules registered
pub fn create_default_registry() -> RulesRegistry {
    let mut registry = RulesRegistry::new();

    // Register built-in rules
    registry.register_rule(Box::new(NoDebuggerRule));
    registry.register_rule(Box::new(NoEmptyPatternRule));

    // Register custom rules if the feature is enabled
    #[cfg(feature = "custom_rules")]
    {
        mod generated {
            include!(concat!(env!("OUT_DIR"), "/generated_rules.rs"));
        }
        generated::register_rules(&mut registry);
    }

    registry
}

/// Load a rule configuration from a JSON file
pub fn load_rule_config(
    path: &str,
) -> Result<Vec<(String, Option<serde_json::Value>, String)>, String> {
    let content = match std::fs::read_to_string(path) {
        Ok(content) => content,
        Err(err) => return Err(format!("Failed to read config file: {}", err)),
    };

    let config: serde_json::Value = match serde_json::from_str(&content) {
        Ok(config) => config,
        Err(err) => return Err(format!("Failed to parse config file: {}", err)),
    };

    if let Some(rules) = config.get("rules") {
        if let Some(rules_obj) = rules.as_object() {
            let mut rule_config = Vec::new();

            for (rule_name, value) in rules_obj.iter() {
                match value {
                    // Simple case: "rule-name": "error" or "rule-name": "warn"
                    serde_json::Value::String(severity) => {
                        rule_config.push((rule_name.clone(), None, severity.clone()));
                    }
                    // Complex case: "rule-name": ["error", { config object }]
                    serde_json::Value::Array(arr) if !arr.is_empty() => {
                        // First element should be severity string
                        let severity = match arr[0].as_str() {
                            Some(s) => s.to_string(),
                            None => "error".to_string(), // Default to error if not specified
                        };

                        // Get the configuration object if it exists
                        let config = if arr.len() > 1 {
                            Some(arr[1].clone())
                        } else {
                            None
                        };
                        rule_config.push((rule_name.clone(), config, severity));
                    }
                    // Invalid format
                    _ => {
                        return Err(format!("Invalid rule configuration for '{}'", rule_name));
                    }
                }
            }
            return Ok(rule_config);
        }
    }

    Err("Config file does not contain a valid 'rules' object".to_string())
}

/// Configure a registry from a list of rule names, configs, and severities
pub fn configure_registry(
    registry: &mut RulesRegistry,
    enabled_rules: &[(String, Option<serde_json::Value>, String)],
) {
    // Clear all previously enabled rules
    for rule in registry.get_enabled_rules() {
        registry.disable_rule(&rule);
    }

    // Enable the specified rules
    for (rule_name, rule_config, severity) in enabled_rules {
        registry.enable_rule(rule_name);
        registry.set_rule_severity(rule_name, severity);

        // If configuration is provided, set it on the rule
        if let Some(config) = rule_config {
            if let Some(rule) = registry.rules.get_mut(rule_name.as_str()) {
                rule.set_config(config.clone());
            }
        }
    }
}

use crate::utilities::config::Config;
/// Add the rule registry setup functions from main.rs at the end of the file
use crate::utilities::{DebugLevel, log};

/// Set up and configure the rules registry based on configuration and command line arguments
pub fn setup_rules_registry(
    config: &Config,
    args: &[String],
    debug_level: DebugLevel,
) -> RulesRegistry {
    let mut registry = create_default_registry();

    // Apply configuration in order of priority
    if let Some(rules) = super::utilities::config::get_enabled_rules(args) {
        // Command line arguments have highest priority
        configure_registry(&mut registry, &rules);
        log(
            DebugLevel::Info,
            debug_level,
            &format!(
                "Using command line rules: {:?}",
                registry.get_enabled_rules()
            ),
        );
    } else if let Some(rules_config_path) = &config.rules_config {
        // Config file comes next
        apply_rules_from_config(&mut registry, rules_config_path, debug_level);
    } else {
        // Default rules as fallback
        log(
            DebugLevel::Info,
            debug_level,
            &format!("Using default rules: {:?}", registry.get_enabled_rules()),
        );
    }

    registry
}

fn extract_position_info(error: &Error) -> (usize, usize) {
    let info = Info::new(error);
    return (info.start.line, info.start.column);
}

/// Apply rules from configuration file
pub fn apply_rules_from_config(
    registry: &mut RulesRegistry,
    config_path: &str,
    debug_level: DebugLevel,
) {
    log(
        DebugLevel::Trace,
        debug_level,
        &format!("Loading rules configuration from {}", config_path),
    );

    match load_rule_config(config_path) {
        Ok(enabled_rules) => {
            configure_registry(registry, &enabled_rules);
            log(
                DebugLevel::Info,
                debug_level,
                &format!(
                    "\x1b[94mINFO:\x1b[0m Enabled rules:\n{}",
                    registry
                        .get_enabled_rules()
                        .iter()
                        .map(|rule| format!("\x1b[32m  - {}\x1b[0m", rule))
                        .collect::<Vec<_>>()
                        .join("\n")
                ),
            );
        }
        Err(err) => {
            log(
                DebugLevel::Error,
                debug_level,
                &format!("Failed to load rules configuration: {}", err),
            );
            log(
                DebugLevel::Info,
                debug_level,
                &format!("Using default rules: {:?}", registry.get_enabled_rules()),
            );
        }
    }
}
