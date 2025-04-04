use std::sync::Arc;
use std::collections::HashMap;
use anyhow::Result;
use oxc_ast::ast::{Program, ModuleDeclaration};
use crate::rules::{Rule, RuleMatch, RuleSeverity};

/// Rule that checks for Angular directive selectors in the code
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
    fn id(&self) -> &str {
        &self.id
    }
    
    fn description(&self) -> &str {
        &self.description
    }
    
    fn tags(&self) -> Vec<&str> {
        self.tags.iter().map(|s| s.as_str()).collect()
    }
    
    fn severity(&self) -> RuleSeverity {
        self.severity
    }
    
    fn evaluate(&self, program: &Program, file_path: &str) -> Result<RuleMatch> {
        // This is a simplified implementation for demonstration purposes
        // A real implementation would parse the TypeScript code to find @Directive decorators
        // and check their selector properties
        
        // Check if the file imports Angular core (simple heuristic)
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
        
        // For demonstration, we'll just return a simple match
        let matched = imports_angular;
        let message = if matched {
            Some("This file imports Angular Core and might contain directives. Check directive selectors follow the naming pattern.".to_string())
        } else {
            None
        };
        
        Ok(RuleMatch {
            rule_id: self.id.clone(),
            file_path: file_path.to_string(),
            matched,
            severity: self.severity,
            message,
            location: None, // In a real implementation, you would provide location info
            metadata: HashMap::new(),
        })
    }
}

/// Factory function to create this rule
pub fn create_directive_selector_rule() -> Arc<dyn Rule> {
    Arc::new(DirectiveSelectorRule::new())
} 