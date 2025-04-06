use std::collections::{HashMap, HashSet};
use oxc_ast::AstKind;
use oxc_diagnostics::OxcDiagnostic;
use oxc_semantic::SemanticBuilderReturn;
use oxc_span::{Span, GetSpan};

/// The result of running a rule on a file
pub struct RuleResult {
    pub file_path: String,
    pub diagnostics: Vec<OxcDiagnostic>,
}

/// Trait that all rules must implement
pub trait Rule: Send + Sync {
    /// Get the name of the rule
    fn name(&self) -> &'static str;
    
    /// Get a description of what the rule checks for
    fn description(&self) -> &'static str;
    
    /// Run the rule on a semantic node
    fn run_on_node(&self, node: &AstKind, span: Span, file_path: &str) -> Option<OxcDiagnostic>;
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
    pub fn is_rule_enabled(&self, rule_name: &str) -> bool {
        self.enabled_rules.contains(rule_name)
    }
    
    /// Get all registered rules
    pub fn get_registered_rules(&self) -> Vec<&'static str> {
        self.rules.keys().cloned().collect()
    }
    
    /// Get all enabled rules
    pub fn get_enabled_rules(&self) -> Vec<String> {
        self.enabled_rules.iter().cloned().collect()
    }
    
    /// Run all enabled rules on a file's semantic analysis
    pub fn run_rules(&self, semantic_result: &SemanticBuilderReturn, file_path: &str) -> RuleResult {
        let mut diagnostics = Vec::new();
        
        // Only process if we have rules enabled
        if !self.enabled_rules.is_empty() {
            // Iterate through all nodes in the semantic analysis
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
    
    /// Run enabled rules and print diagnostics
    pub fn run_rules_and_print(&self, semantic_result: &SemanticBuilderReturn, file_path: &str, source: &str) {
        let result = self.run_rules(semantic_result, file_path);
        
        if result.diagnostics.is_empty() {
            return;
        }
        
        println!("Found {} issues in {}", result.diagnostics.len(), file_path);
        for diagnostic in result.diagnostics {
            let error = diagnostic.with_source_code(source.to_string());
            println!("{:?}", error);
        }
    }
}

/// Built-in rule: No debugger statements
pub struct NoDebuggerRule;

impl Rule for NoDebuggerRule {
    fn name(&self) -> &'static str {
        "no-debugger"
    }
    
    fn description(&self) -> &'static str {
        "Disallow the use of debugger statements"
    }
    
    fn run_on_node(&self, node: &AstKind, span: Span, _file_path: &str) -> Option<OxcDiagnostic> {
        match node {
            AstKind::DebuggerStatement(_) => {
                Some(OxcDiagnostic::error("`debugger` statement is not allowed").with_label(span))
            }
            _ => None,
        }
    }
}

/// Built-in rule: No empty patterns
pub struct NoEmptyPatternRule;

impl Rule for NoEmptyPatternRule {
    fn name(&self) -> &'static str {
        "no-empty-pattern"
    }
    
    fn description(&self) -> &'static str {
        "Disallow empty destructuring patterns"
    }
    
    fn run_on_node(&self, node: &AstKind, span: Span, _file_path: &str) -> Option<OxcDiagnostic> {
        match node {
            AstKind::ArrayPattern(array) if array.elements.is_empty() => {
                Some(
                    OxcDiagnostic::error("empty destructuring pattern is not allowed")
                        .with_label(span.label("Empty array binding pattern"))
                )
            }
            AstKind::ObjectPattern(object) if object.properties.is_empty() => {
                Some(
                    OxcDiagnostic::error("empty destructuring pattern is not allowed")
                        .with_label(span.label("Empty object binding pattern"))
                )
            }
            _ => None,
        }
    }
}

/// Create a registry with all default rules registered
pub fn create_default_registry() -> RulesRegistry {
    let mut registry = RulesRegistry::new();
    
    // Register built-in rules
    registry.register_rule(Box::new(NoDebuggerRule));
    registry.register_rule(Box::new(NoEmptyPatternRule));
    
    // Enable the default rules
    registry.enable_rules(&["no-debugger", "no-empty-pattern"]);
    
    registry
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