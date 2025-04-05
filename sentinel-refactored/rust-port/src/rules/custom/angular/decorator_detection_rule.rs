use std::sync::Arc;
use std::collections::HashMap;
use anyhow::Result;
use oxc_ast::ast::{Program, ModuleDeclaration, Statement, Declaration, Expression, Decorator, ClassElement};
use crate::rules::{Rule, RuleMatch, RuleSeverity};

/// Rule that detects Angular property decorators like @Input, @Output, etc.
pub struct AngularDecoratorDetectionRule {
    id: String,
    description: String,
    decorator_names: Vec<String>,
    tags: Vec<String>,
    severity: RuleSeverity,
}

impl AngularDecoratorDetectionRule {
    pub fn new() -> Self {
        Self {
            id: "angular-decorators-detection".to_string(),
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

impl Rule for AngularDecoratorDetectionRule {
    fn id(&self) -> &str { &self.id }
    fn description(&self) -> &str { &self.description }
    fn tags(&self) -> Vec<&str> { self.tags.iter().map(|s| s.as_str()).collect() }
    fn severity(&self) -> RuleSeverity { self.severity }
    
    fn evaluate(&self, program: &Program, file_path: &str) -> Result<RuleMatch> {
        let mut matched = false;
        let mut message = None;
        let location = None;
        let mut found_decorators = Vec::new();
        
        // Check if the file imports Angular core (necessary for decorators)
        let mut imports_angular = false;
        
        for stmt in &program.body {
            if let Some(module_decl) = stmt.as_module_declaration() {
                if let ModuleDeclaration::ImportDeclaration(import_decl) = module_decl {
                    let src_str = import_decl.source.value.as_str();
                    if src_str == "@angular/core" {
                        imports_angular = true;
                        break;
                    }
                }
            }
        }
        
        // Only proceed if we have Angular imports
        if imports_angular {
            // 1. Find class declarations and their decorators
            for stmt in &program.body {
                self.process_statement(stmt, &mut found_decorators);
            }
            
            // Check if we found any decorators
            if !found_decorators.is_empty() {
                // Mark as matched when we find Angular property decorators (this generates a warning)
                matched = true;
                message = Some(format!(
                    "Found Angular property decorators: @{}",
                    found_decorators.join(", @")
                ));
            } else {
                // We found Angular imports but no decorators - don't generate a warning
                matched = false;
                message = Some(format!(
                    "This file imports Angular Core but no property decorators ({}) were found.",
                    self.decorator_names.join(", @")
                ));
            }
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

impl AngularDecoratorDetectionRule {
    // Process a statement to find class declarations and their decorators
    fn process_statement(&self, stmt: &Statement, found_decorators: &mut Vec<String>) {
        if let Some(decl) = stmt.as_declaration() {
            if let Declaration::ClassDeclaration(class_decl) = decl {
                // Look through each class member
                for member in &class_decl.body.body {
                    // Class elements can be properties, methods, etc.
                    match member {
                        ClassElement::PropertyDefinition(prop_def) => {
                            for decorator in &prop_def.decorators {
                                self.check_decorator(decorator, found_decorators);
                            }
                        },
                        ClassElement::MethodDefinition(method_def) => {
                            for decorator in &method_def.decorators {
                                self.check_decorator(decorator, found_decorators);
                            }
                        },
                        // Other class element types can be added here if needed
                        _ => {}
                    }
                }
            }
        }
    }
    
    // Check if a decorator matches our target list
    fn check_decorator(&self, decorator: &Decorator, found_decorators: &mut Vec<String>) {
        if let Some(name) = self.extract_decorator_name(decorator) {
            if self.decorator_names.contains(&name) && !found_decorators.contains(&name) {
                found_decorators.push(name);
            }
        }
    }
    
    // Extract decorator name from decorator expression
    fn extract_decorator_name(&self, decorator: &Decorator) -> Option<String> {
        match &decorator.expression {
            // Simple case: @Input
            Expression::Identifier(ident) => Some(ident.name.to_string()),
            
            // Call expression case: @Input() or @Input('propName')
            Expression::CallExpression(call_expr) => {
                if let Expression::Identifier(ident) = &call_expr.callee {
                    Some(ident.name.to_string())
                } else {
                    None
                }
            },
            
            // For other types of expressions, we'll ignore them for now
            _ => None
        }
    }
}

/// Create a rule that detects Angular property decorators
pub fn create_angular_decorator_detection_rule() -> Arc<dyn Rule> {
    Arc::new(
        AngularDecoratorDetectionRule::new()
            .with_tags(vec!["angular", "components", "decorators"])
            .with_severity(RuleSeverity::Warning)
    )
} 