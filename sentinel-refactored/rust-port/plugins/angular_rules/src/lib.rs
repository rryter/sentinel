// Bring in types from the main analyzer crate
use typescript_analyzer::rules::{
    Rule, RuleFactory, RuleMatch, RulePlugin, RuleSeverity
};
// Dependencies for the rule implementation
use std::sync::Arc;
use std::collections::HashMap;
use anyhow::Result;
use oxc_ast::ast::{Program, ModuleDeclaration};

// --- Rule Implementation (copied from original location) --- //

pub struct DirectiveSelectorRule {
    id: String,
    description: String,
    tags: Vec<String>,
    severity: RuleSeverity,
}

impl DirectiveSelectorRule {
    pub fn new() -> Self {
        Self {
            id: "angular-directive-selector".to_string(),
            description: "Checks for proper Angular directive selector naming".to_string(),
            tags: vec!["angular".to_string(), "directive".to_string(), "selector".to_string()],
            severity: RuleSeverity::Warning,
        }
    }
}

impl Rule for DirectiveSelectorRule {
    fn id(&self) -> &str { &self.id }
    fn description(&self) -> &str { &self.description }
    fn tags(&self) -> Vec<&str> { self.tags.iter().map(|s| s.as_str()).collect() }
    fn severity(&self) -> RuleSeverity { self.severity }

    fn evaluate(&self, program: &Program, file_path: &str) -> Result<RuleMatch> {
        let mut imports_angular = false;
        for stmt in &program.body {
            if let Some(module_decl) = stmt.as_module_declaration() {
                if let ModuleDeclaration::ImportDeclaration(import_decl) = module_decl {
                    if import_decl.source.value == "@angular/core" {
                        imports_angular = true;
                        break;
                    }
                }
            }
        }
        let matched = imports_angular;
        let message = if matched {
            Some("This file imports Angular Core. Check directive selectors.".to_string())
        } else { None };

        Ok(RuleMatch {
            rule_id: self.id.clone(),
            file_path: file_path.to_string(),
            matched,
            severity: self.severity,
            message,
            location: None, 
            metadata: HashMap::new(),
        })
    }
}

pub fn create_directive_selector_rule() -> Arc<dyn Rule> {
    Arc::new(DirectiveSelectorRule::new())
}

// --- Plugin Registration --- //

#[no_mangle]
pub extern "C" fn register_plugin() -> *mut RulePlugin {
    // Create the plugin structure
    let plugin = RulePlugin {
        name: "Angular Rules".to_string(),
        description: "A collection of rules specific to Angular.".to_string(),
        rules: vec![create_directive_selector_rule as RuleFactory],
    };
    
    // Allocate the plugin on the heap and return a raw pointer
    // The main application will take ownership via Box::from_raw
    Box::into_raw(Box::new(plugin))
} 