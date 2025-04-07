use std::collections::{HashMap, HashSet};
use std::time::Instant;
use oxc_diagnostics::OxcDiagnostic;
use oxc_semantic::SemanticBuilderReturn;
use oxc_span::GetSpan;
use std::sync::{Arc, Mutex};

// Import the Rule trait and rule implementations
pub use crate::rules::Rule;
pub use crate::rules::{NoDebuggerRule, NoEmptyPatternRule};
use crate::metrics::Metrics;

/// The result of running a rule on a file
pub struct RuleResult {
    #[allow(dead_code)]
    pub file_path: String,
    pub diagnostics: Vec<OxcDiagnostic>,
}

/// A registry for all available rules
pub struct RulesRegistry {
    rules: HashMap<&'static str, Box<dyn Rule>>,
    enabled_rules: HashSet<String>,
}

impl RulesRegistry {
    /// Create a new registry with no rules
    pub fn new() -> Self {
        Self {
            rules: HashMap::new(),
            enabled_rules: HashSet::new(),
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
    
    /// Get all enabled rules
    pub fn get_enabled_rules(&self) -> Vec<String> {
        self.enabled_rules.iter().cloned().collect()
    }
    
    /// Run all enabled rules on a file's semantic analysis with metrics tracking
    pub fn run_rules_with_metrics(&self, semantic_result: &SemanticBuilderReturn, file_path: &str, metrics: Arc<Mutex<Metrics>>) -> RuleResult {
        let mut diagnostics = Vec::new();
        
        // Only process if we have rules enabled
        if !self.enabled_rules.is_empty() {
            // First, run visitor-based rules
            for rule_name in &self.enabled_rules {
                if let Some(rule) = self.rules.get(rule_name.as_str()) {
                    // Time the rule execution
                    let rule_start = Instant::now();
                    
                    // Run visitor-based analysis
                    let mut visitor_diagnostics = rule.run_on_semantic(semantic_result, file_path);
                    diagnostics.append(&mut visitor_diagnostics);
                    
                    // Record the time taken
                    let duration = rule_start.elapsed();
                    if let Ok(mut metrics_guard) = metrics.lock() {
                        metrics_guard.record_rule_time(rule_name, duration);
                    }
                }
            }

            // Then run traditional node-based rules
            for node in semantic_result.semantic.nodes() {
                let node_kind = node.kind();
                let span = node.span();
                
                // Run each enabled rule on this node
                for rule_name in &self.enabled_rules {
                    if let Some(rule) = self.rules.get(rule_name.as_str()) {
                        // Time the rule execution
                        let rule_start = Instant::now();
                        
                        // Run the rule
                        let diagnostic_option = rule.run_on_node(&node_kind, span, file_path);
                        
                        // Record the time taken *only if* a diagnostic was produced
                        let duration = rule_start.elapsed();
                        
                        // Add any diagnostic that was produced
                        if let Some(diagnostic) = diagnostic_option {
                            // Record time only when rule yielded a result for this node
                            if let Ok(mut metrics_guard) = metrics.lock() {
                                metrics_guard.record_rule_time(rule_name, duration);
                            }
                            diagnostics.push(diagnostic);
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
    
    /// Run all enabled rules on a file's semantic analysis (no metrics)
    pub fn run_rules(&self, semantic_result: &SemanticBuilderReturn, file_path: &str) -> RuleResult {
        let mut diagnostics = Vec::new();
        
        // Only process if we have rules enabled
        if !self.enabled_rules.is_empty() {
            // First, run visitor-based rules
            for rule_name in &self.enabled_rules {
                if let Some(rule) = self.rules.get(rule_name.as_str()) {
                    // Run visitor-based analysis
                    let mut visitor_diagnostics = rule.run_on_semantic(semantic_result, file_path);
                    diagnostics.append(&mut visitor_diagnostics);
                }
            }

            // Then run traditional node-based rules
            for node in semantic_result.semantic.nodes() {
                let node_kind = node.kind();
                let span = node.span();
                
                // Run each enabled rule on this node
                for rule_name in &self.enabled_rules {
                    if let Some(rule) = self.rules.get(rule_name.as_str()) {
                        if let Some(diagnostic) = rule.run_on_node(&node_kind, span, file_path) {
                            diagnostics.push(diagnostic);
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
    
    // Enable the default rules
    registry.enable_rules(&["no-debugger", "no-empty-pattern"]);
    
    registry
}

/// Register all custom rules with the registry
#[cfg(feature = "custom_rules")]
fn register_custom_rules(registry: &mut RulesRegistry) {
    use crate::rules::custom::NoConsoleWarnVisitorRule;
    
    
    // Register the NoConsoleWarnVisitorRule
    registry.register_rule(Box::new(NoConsoleWarnVisitorRule));
    
    // Add more custom rules here as they are created
}

/// Load a rule configuration from a JSON file
pub fn load_rule_config(path: &str) -> Result<Vec<String>, String> {
    let content = match std::fs::read_to_string(path) {
        Ok(content) => content,
        Err(err) => return Err(format!("Failed to read config file: {}", err)),
    };
    
    let config: serde_json::Value = match serde_json::from_str(&content) {
        Ok(config) => config,
        Err(err) => return Err(format!("Failed to parse config file: {}", err)),
    };
    
    if let Some(rules) = config.get("rules") {
        if let Some(rules_array) = rules.as_array() {
            let rule_names = rules_array
                .iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect();
            return Ok(rule_names);
        }
    }
    
    Err("Config file does not contain a 'rules' array".to_string())
}

/// Configure a registry from a list of rule names to enable
pub fn configure_registry(registry: &mut RulesRegistry, enabled_rules: &[String]) {
    // Clear all previously enabled rules
    for rule in registry.get_enabled_rules() {
        registry.disable_rule(&rule);
    }
    
    // Enable the specified rules
    for rule in enabled_rules {
        registry.enable_rule(rule);
    }
} 