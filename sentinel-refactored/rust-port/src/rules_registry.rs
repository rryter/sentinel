use oxc_semantic::SemanticBuilderReturn;
use oxc_span::GetSpan;
use std::collections::{HashMap, HashSet};
use std::time::Duration;
use std::time::Instant;

// Import the Rule trait and rule implementations
pub use crate::rules::Rule;
pub use crate::rules::{NoDebuggerRule, NoEmptyPatternRule};
use crate::RuleDiagnostic;

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

    /// Run all enabled rules on a file's semantic analysis with metrics tracking.
    /// Returns diagnostics and a map of rule execution times for this specific run.
    pub fn run_rules_with_metrics(
        &self,
        semantic_result: &SemanticBuilderReturn,
        file_path: &str,
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
                        });
                    }

                    // Record the time taken locally
                    let duration = rule_start.elapsed();
                    rule_durations.insert(rule_name.to_string(), duration);
                }
            }

            // Check if any enabled rule actually uses node-based processing
            let has_node_based_rules = self.enabled_rules.iter().any(|rule_name| {
                self.rules.get(rule_name.as_str()).map_or(false, |_rule| {
                    // Heuristic: Check if the rule implements run_on_node.
                    // Since run_on_node now has a default `None` implementation,
                    // we need a way to know if a specific rule *overrides* it.
                    // Comparing function pointers for default methods is complex.
                    // A practical approach is to assume if a rule *might* return
                    // Some(...) from run_on_node, it's considered node-based.
                    // For now, we simplify: if a rule *could* be node-based, we run the loop.
                    // This avoids needing complex reflection or trait checks.
                    // TODO: A better long-term solution might involve adding metadata
                    // to the Rule trait (e.g., `uses_run_on_node() -> bool`).
                    true // Keep simplified check for now - run loop if any rule enabled.
                         // We accept the overhead if only visitor rules are present,
                         // as the inner loop won't record metrics anyway.
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
                            let diagnostics_vec = rule.run_on_node(&node_kind, span);

                            // Record the time taken *only if* a diagnostic was produced
                            let duration = rule_start.elapsed();

                            if !diagnostics_vec.is_empty() {
                                // Record time only when rule yielded results for this node
                                rule_durations.insert(rule_name.to_string(), duration);

                                // Add all diagnostics from the Vec to your collection
                                for diagnostic in diagnostics_vec {
                                    diagnostics.push(RuleDiagnostic {
                                        rule_id: rule_name.clone(),
                                        diagnostic,
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

    /// Run all enabled rules on a file's semantic analysis (no metrics)
    pub fn run_rules(
        &self,
        semantic_result: &SemanticBuilderReturn,
        file_path: &str,
    ) -> RuleResult {
        let mut diagnostics = Vec::new();

        // Only process if we have rules enabled
        if !self.enabled_rules.is_empty() {
            // First, run visitor-based rules
            for rule_name in &self.enabled_rules {
                if let Some(rule) = self.rules.get(rule_name.as_str()) {
                    // Run visitor-based analysis
                    let visitor_diagnostics = rule.run_on_semantic(semantic_result, file_path);

                    // Wrap each diagnostic with rule ID
                    for diagnostic in visitor_diagnostics {
                        diagnostics.push(RuleDiagnostic {
                            rule_id: rule_name.clone(),
                            diagnostic,
                        });
                    }
                }
            }

            // Check if any enabled rule actually uses node-based processing
            let has_node_based_rules = self.enabled_rules.iter().any(|rule_name| {
                self.rules.get(rule_name.as_str()).map_or(false, |_rule| {
                    // Heuristic check - see comments in run_rules_with_metrics
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
                            let diagnostic_vec = rule.run_on_node(&node_kind, span);

                            if !diagnostic_vec.is_empty() {
                                // Wrap each diagnostic with rule ID
                                for diagnostic in diagnostic_vec {
                                    diagnostics.push(RuleDiagnostic {
                                        rule_id: rule_name.clone(),
                                        diagnostic,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        RuleResult {
            file_path: file_path.to_string(),
            diagnostics,
        }
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
    register_custom_rules(&mut registry);

    // Enable the default rules with error severity
    registry.enable_rules(&[
        "no-debugger",
        "no-console-warn-visitor",
        "angular-legacy-decorators",
        "angular-input-count",
        "angular-component-class-suffix",
        "angular-component-max-inline-declarations",
        "angular-obsolete-standalone-true",
    ]);

    // Set default severities for rules
    registry.set_rule_severity("no-debugger", "error");
    registry.set_rule_severity("no-console-warn-visitor", "error");
    registry.set_rule_severity("angular-legacy-decorators", "error");
    registry.set_rule_severity("angular-input-count", "error");
    registry.set_rule_severity("angular-component-class-suffix", "error");
    registry.set_rule_severity("angular-component-max-inline-declarations", "error");
    registry.set_rule_severity("angular-obsolete-standalone-true", "error");

    registry
}

/// Register all custom rules with the registry
#[cfg(feature = "custom_rules")]
fn register_custom_rules(registry: &mut RulesRegistry) {
    use crate::rules::custom::{
        AngularComponentClassSuffixRule, AngularComponentMaxInlineDeclarationsRule,
        AngularInputCountRule, AngularLegacyDecoratorsRule, AngularObsoleteStandaloneTrueRule,
        NoConsoleWarnVisitorRule,
    };

    // Register the NoConsoleWarnVisitorRule
    registry.register_rule(Box::new(NoConsoleWarnVisitorRule));

    // Register the AngularLegacyDecoratorsRule
    registry.register_rule(Box::new(AngularLegacyDecoratorsRule));

    // Register the AngularInputCountRule with default settings
    registry.register_rule(Box::new(AngularInputCountRule::new()));

    // Register the AngularComponentClassSuffixRule with default settings
    registry.register_rule(Box::new(AngularComponentClassSuffixRule::new()));

    // Register the AngularComponentMaxInlineDeclarationsRule with default settings
    registry.register_rule(Box::new(AngularComponentMaxInlineDeclarationsRule::new()));

    // Register the AngularObsoleteStandaloneTrueRule with default settings
    registry.register_rule(Box::new(AngularObsoleteStandaloneTrueRule::new()));

    // Add more custom rules here as they are created
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
use crate::utilities::{log, DebugLevel};

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
                &format!("Enabled rules: {:?}", registry.get_enabled_rules()),
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
