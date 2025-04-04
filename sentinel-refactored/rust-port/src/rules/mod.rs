use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use anyhow::Result;
use oxc_ast::ast::Program;

// Define rule modules
mod import_rule;

/// Macro to declare and automatically export rule factories
#[macro_export]
macro_rules! register_rules {
    ( $( $module:ident :: $factory:ident ),* ) => {
        $(
            pub use $module::$factory;
        )*
        
        // Get all rule factories in a vec
        pub fn get_rule_factories() -> Vec<RuleFactory> {
            vec![
                $(
                    $factory,
                )*
            ]
        }
    };
}

// Use the register_rules macro to automatically export all rule factories
register_rules!(
    import_rule::create_rxjs_import_rule,
    import_rule::create_angular_core_import_rule,
    import_rule::create_rxjs_operators_import_rule
);

// Re-export the ImportRule struct for those who need to import it directly
pub use import_rule::ImportRule;

/// Type for rule factory functions
pub type RuleFactory = fn() -> Arc<dyn Rule>;

/// Rule plugin to encapsulate related rules
pub struct RulePlugin {
    /// Name of the plugin
    pub name: String,
    /// Description of the plugin
    pub description: String,
    /// List of rule factory functions provided by this plugin
    pub rules: Vec<RuleFactory>,
}

/// Create a rule plugin for import-related rules
pub fn create_import_rule_plugin() -> RulePlugin {
    RulePlugin {
        name: "import-rules".to_string(),
        description: "Rules that check for various import patterns".to_string(),
        rules: get_rule_factories(),
    }
}

/// Get all built-in rule plugins
pub fn get_all_plugins() -> Vec<RulePlugin> {
    let plugins = vec![
        create_import_rule_plugin(),
        // Additional plugins can be added here
    ];
    plugins
}

/// Get all built-in rule plugins with debug info
pub fn get_all_plugins_with_debug() -> Vec<RulePlugin> {
    println!("Loading all available rule plugins...");
    let plugins = get_all_plugins();
    println!("Loaded {} plugins", plugins.len());
    plugins
}

/// Get all built-in rules from all plugins
pub fn get_all_rules() -> Vec<Arc<dyn Rule>> {
    let mut rules = Vec::new();
    
    for plugin in get_all_plugins() {
        for rule_factory in plugin.rules {
            rules.push(rule_factory());
        }
    }
    
    rules
}

/// Get all built-in rules from all plugins with debug info
pub fn get_all_rules_with_debug() -> Vec<Arc<dyn Rule>> {
    println!("Loading all available rules...");
    let mut rules = Vec::new();
    
    for plugin in get_all_plugins() {
        println!("Loading rules from plugin: {}", plugin.name);
        for rule_factory in plugin.rules {
            let rule = rule_factory();
            println!("  - Loaded rule: {} ({})", rule.id(), rule.description());
            rules.push(rule);
        }
    }
    
    println!("Total rules loaded: {}", rules.len());
    rules
}

/// Severity level for rule violations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum RuleSeverity {
    /// A critical issue that must be fixed
    Error,
    /// An issue that should be addressed but isn't critical
    Warning,
    /// Informational findings that might be useful
    Info,
}

impl RuleSeverity {
    /// Returns true if this severity is at least as severe as the given level
    pub fn is_at_least(&self, level: RuleSeverity) -> bool {
        match (self, level) {
            (RuleSeverity::Error, _) => true,
            (RuleSeverity::Warning, RuleSeverity::Error) => false,
            (RuleSeverity::Warning, _) => true,
            (RuleSeverity::Info, RuleSeverity::Info) => true,
            (RuleSeverity::Info, _) => false,
        }
    }
}

/// Information about where in the source code a rule match occurred
#[derive(Debug, Clone)]
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

/// Result of evaluating a rule against a source file
#[derive(Debug, Clone)]
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
#[derive(Debug, Default)]
pub struct RuleResults {
    /// All individual rule matches
    pub matches: Vec<RuleMatch>,
    /// Count of matches by rule ID
    pub counts: HashMap<String, usize>,
}

impl RuleResults {
    /// Create a new empty results collection
    pub fn new() -> Self {
        Self {
            matches: Vec::new(),
            counts: HashMap::new(),
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
    fn severity(&self) -> RuleSeverity {
        RuleSeverity::Warning
    }
    
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
        }
    }
    
    /// Enable or disable debug mode for verbose logging
    pub fn set_debug_mode(&mut self, debug: bool) {
        self.debug_mode = debug;
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
    
    /// Evaluate all enabled rules against a program
    pub fn evaluate_all(&self, program: &Program, file_path: &str) -> RuleResults {
        let mut results = RuleResults::new();
        
        if self.debug_mode {
            println!("Evaluating {} rules against file {}", self.enabled_rules.len(), file_path);
        }
        
        for rule in self.enabled_rules.values() {
            if self.debug_mode {
                println!("  - Evaluating rule: {}", rule.id());
            }
            
            match rule.evaluate(program, file_path) {
                Ok(rule_match) => {
                    if self.debug_mode && rule_match.matched {
                        println!("    * Rule matched: {} ({})", 
                                 rule.id(), rule_match.message.as_deref().unwrap_or("No message"));
                    }
                    results.add_match(rule_match);
                }
                Err(err) => {
                    if self.debug_mode {
                        println!("    * Rule evaluation failed: {}", err);
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
        
        if self.debug_mode {
            println!("Rule evaluation complete. {} matches found.", 
                     results.matches.iter().filter(|m| m.matched).count());
        }
        
        results
    }
}

// Base module for rule implementations
pub mod rules {
    // Rule implementations will be added here
} 