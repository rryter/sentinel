use std::sync::Arc;
use std::collections::{HashMap, HashSet};
use anyhow::Result;
use oxc_ast::ast::{Program, Decorator, Expression};
use oxc_ast_visit::{Visit, walk}; // Make sure you have this import for the trait
use crate::rules::{Rule, RuleMatch, RuleSeverity};

/// Rule that detects Angular property decorators like @Input, @Output, etc.
pub struct AngularDecoratorDetectionRule {
    id: String,
    description: String,
    decorator_names: HashSet<String>,
    tags: Vec<String>,
    severity: RuleSeverity,
    debug_mode: bool,
}

impl AngularDecoratorDetectionRule {
    pub fn new() -> Self {
        Self {
            id: "angular-decorators-detection".to_string(),
            description: "Detects Angular property decorators (@Input, @Output, @ViewChild, etc.)".to_string(),
            decorator_names: [
                "Input".to_string(),
                "Output".to_string(),
                "ViewChild".to_string(),
                "ViewChildren".to_string(),
                "ContentChild".to_string(),
                "ContentChildren".to_string(),
            ].into_iter().collect(),
            tags: vec!["angular".to_string(), "decorators".to_string(), "components".to_string()],
            severity: RuleSeverity::Warning,
            debug_mode: false,
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
    
    pub fn with_debug_mode(mut self, debug_mode: bool) -> Self {
        self.debug_mode = debug_mode;
        self
    }
}

// Visitor struct for finding Angular decorators
struct DecoratorFinder<'a> {
    target_decorator_names: &'a HashSet<String>,
    found_decorators: Vec<String>, // Only store the decorator names, not references
    debug_mode: bool,
}

impl<'a> DecoratorFinder<'a> {
    fn new(target_names: &'a HashSet<String>, debug_mode: bool) -> Self {
        Self {
            target_decorator_names: target_names,
            found_decorators: Vec::new(),
            debug_mode,
        }
    }
    
    // Extract decorator name from decorator expression
    fn get_decorator_name(&self, expr: &Expression) -> Option<String> {
        match expr {
            // Simple case: @Input
            Expression::Identifier(ident) => {
                if self.debug_mode {
                    println!("Found identifier decorator: @{}", ident.name);
                }
                Some(ident.name.to_string())
            },
            
            // Call expression case: @Input() or @Input('propName')
            Expression::CallExpression(call_expr) => {
                if let Expression::Identifier(ident) = &call_expr.callee {
                    if self.debug_mode {
                        println!("Found call expression decorator: @{}", ident.name);
                    }
                    Some(ident.name.to_string())
                } else {
                    if self.debug_mode {
                        println!("Call expression with non-identifier callee");
                    }
                    None
                }
            },
            
            // For other types of expressions, we'll ignore them for now
            _ => {
                if self.debug_mode {
                    println!("Unsupported decorator expression type");
                }
                None
            }
        }
    }
}

// Implement the Visit trait for DecoratorFinder
impl<'a> Visit<'a> for DecoratorFinder<'a> {
    // Override the method that visits Decorator nodes
    fn visit_decorator(&mut self, decorator: &Decorator<'a>) {
        // Extract the name from the decorator's expression
        if let Some(name) = self.get_decorator_name(&decorator.expression) {
            // Check if the extracted name is in our target set
            if self.target_decorator_names.contains(&name) {
                if self.debug_mode {
                    println!("Matched target decorator: @{}", name);
                }
                // Only store the name, not the reference
                if !self.found_decorators.contains(&name) {
                    self.found_decorators.push(name);
                }
            }
        }

        // Continue the traversal within the decorator expression
        walk::walk_decorator(self, decorator);
    }
}

impl Rule for AngularDecoratorDetectionRule {
    fn id(&self) -> &str { &self.id }
    fn description(&self) -> &str { &self.description }
    fn tags(&self) -> Vec<&str> { self.tags.iter().map(|s| s.as_str()).collect() }
    fn severity(&self) -> RuleSeverity { self.severity }
    
    fn evaluate(&self, program: &Program, file_path: &str) -> Result<RuleMatch> {
        if self.debug_mode {
            println!("Evaluating file: {}", file_path);
        }
        
        // Create our visitor
        let mut finder = DecoratorFinder::new(&self.decorator_names, self.debug_mode);
        
        // Start the AST traversal from the root Program node
        finder.visit_program(program);
        
        // Determine the match status
        let matched = !finder.found_decorators.is_empty();
        
        // Build the message based on found decorators
        let message = if matched {
            let decorator_count = finder.found_decorators.len();
            let decorator_list = finder.found_decorators.iter()
                .map(|name| format!("@{}", name))
                .collect::<Vec<_>>()
                .join(", ");
            
            Some(format!("Found {} Angular decorator(s): {}", decorator_count, decorator_list))
        } else {
            None
        };
        
        // For now, we don't specify a precise location
        let location = None;
        
        // Return the match result
        Ok(RuleMatch {
            rule_id: self.id.clone(),
            file_path: file_path.to_string(),
            matched,
            severity: self.severity,
            message,
            location,
            metadata: {
                let mut metadata = HashMap::new();
                if matched {
                    metadata.insert("found_decorators".to_string(), 
                                   finder.found_decorators.join(","));
                }
                metadata
            },
        })
    }
}

/// Create a rule that detects Angular property decorators
pub fn create_angular_decorator_detection_rule() -> Arc<dyn Rule> {
    // In a real implementation, you might want to access debug mode from somewhere else,
    // like a global config or an environment variable
    let debug_mode = std::env::var("SENTINEL_DEBUG").map(|v| v == "1" || v.to_lowercase() == "true").unwrap_or(false);
    
    Arc::new(
        AngularDecoratorDetectionRule::new()
            .with_tags(vec!["angular", "components", "decorators"])
            .with_severity(RuleSeverity::Warning)
            .with_debug_mode(debug_mode)
    )
} 