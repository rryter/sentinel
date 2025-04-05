use std::sync::Arc;
use std::collections::HashMap;
use anyhow::Result;
use oxc_ast::ast::{Program};
use crate::rules::{Rule, RuleMatch, RuleSeverity};

/// Rule that detects Angular property decorators like @Input, @Output, etc.
pub struct AngularDecoratorRule {
    id: String,
    description: String,
    decorator_names: Vec<String>,
    tags: Vec<String>,
    severity: RuleSeverity,
}

impl AngularDecoratorRule {
    pub fn new() -> Self {
        Self {
            id: "angular-decorators".to_string(),
            description: "Detects Angular property decorators (@Input, @Output, @ViewChild, etc.)".to_string(),
            decorator_names: vec![
                "Input".to_string(),
                "Output".to_string(),
                "ViewChild".to_string(),
                "ViewChildren".to_string(),
                "ContentChild".to_string(),
                "ContentChildren".to_string(),
            ],
            tags: vec!["angular".to_string(), "decorators".to_string(), "components".to_string()],
            severity: RuleSeverity::Warning,
        }
    }
    
    pub fn with_tags(mut self, tags: Vec<&str>) -> Self {
        self.tags = tags.into_iter().map(|s| s.to_string()).collect();
        self
    }
    
    pub fn with_severity(mut self, severity: RuleSeverity) -> Self {
        self.severity = severity;
        self
    }
}

impl Rule for AngularDecoratorRule {
    fn id(&self) -> &str { &self.id }
    fn description(&self) -> &str { &self.description }
    fn tags(&self) -> Vec<&str> { self.tags.iter().map(|s| s.as_str()).collect() }
    fn severity(&self) -> RuleSeverity { self.severity }
    
    fn evaluate(&self, program: &Program, file_path: &str) -> Result<RuleMatch> {
        let mut matched = false;
        let mut message = None;
        let location = None;
        let found_decorators: Vec<String> = Vec::new();
        
        // Check if the file imports Angular core (necessary for decorators)
        let mut imports_angular = false;
        
        for stmt in &program.body {
            if let Some(module_decl) = stmt.as_module_declaration() {
                match module_decl {
                    oxc_ast::ast::ModuleDeclaration::ImportDeclaration(import_decl) => {
                        if import_decl.source.value == "@angular/core" {
                            imports_angular = true;
                            break;
                        }
                    },
                    _ => {}
                }
            }
        }
        
        // Only proceed if we have Angular imports
        if imports_angular {
            // Since we don't have complete AST type information, we'll use a simplified approach
            // In a real implementation, we'd iterate through class declarations and their elements
            // to find decorators with names matching our target decorators
            
            // Placeholder: In a more complete implementation, we would:
            // 1. Find class declarations
            // 2. For each class, examine its elements (properties/methods)
            // 3. Check for decorators on those elements
            // 4. Check if decorator names match our target list
            
            // For demonstration purposes, we'll just mark that Angular imports were found
            matched = imports_angular;
            message = Some(format!(
                "This file imports Angular Core and may contain property decorators ({}).",
                self.decorator_names.join(", @")
            ));
        }
        
        Ok(RuleMatch {
            rule_id: self.id.clone(),
            file_path: file_path.to_string(),
            matched,
            severity: self.severity,
            message,
            location,
            metadata: {
                let mut metadata = HashMap::new();
                if !found_decorators.is_empty() {
                    metadata.insert(
                        "found_decorators".to_string(),
                        found_decorators.join(", ")
                    );
                }
                metadata
            },
        })
    }
}

/// Create a rule that detects Angular property decorators
pub fn create_angular_decorator_rule() -> Arc<dyn Rule> {
    Arc::new(
        AngularDecoratorRule::new()
            .with_tags(vec!["angular", "components", "decorators"])
            .with_severity(RuleSeverity::Warning)
    )
} 