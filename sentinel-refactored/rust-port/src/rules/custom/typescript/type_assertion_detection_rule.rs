use std::sync::Arc;
use std::collections::HashMap;
use anyhow::Result;
use oxc_ast::ast::{Program, TSAsExpression, TSTypeAssertion, TSType, TSNonNullExpression, TSSatisfiesExpression};
use oxc_ast_visit::{Visit, walk};
use crate::rules::{Rule, RuleMatch, RuleSeverity};

/// Rule that detects TypeScript type assertions/castings in various forms
pub struct TypeScriptAssertionDetectionRule {
    id: String,
    description: String,
    tags: Vec<String>,
    severity: RuleSeverity,
    debug_mode: bool,
}

impl TypeScriptAssertionDetectionRule {
    pub fn new() -> Self {
        Self {
            id: "typescript-assertion-detection".to_string(),
            description: "Detects TypeScript type assertions (as Type, <Type>, etc.)".to_string(),
            tags: vec!["typescript".to_string(), "type-safety".to_string(), "assertions".to_string()],
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

// Types of assertions we want to detect
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
enum AssertionType {
    // 'as Type' syntax
    AsExpression,
    // '<Type>expr' syntax
    AngleBracketAssertion,
    // Non-null assertion: 'expr!' 
    NonNullAssertion,
    // 'expr as const'
    AsConstAssertion,
    // Type parameter assertion in satisfies operator
    SatisfiesAssertion,
}

impl AssertionType {
    fn as_str(&self) -> &'static str {
        match self {
            AssertionType::AsExpression => "as Type",
            AssertionType::AngleBracketAssertion => "<Type>expr",
            AssertionType::NonNullAssertion => "expr!",
            AssertionType::AsConstAssertion => "as const",
            AssertionType::SatisfiesAssertion => "satisfies Type",
        }
    }
}

// Visitor struct for finding TypeScript assertions
struct AssertionFinder {
    found_assertions: Vec<AssertionType>,
    debug_mode: bool,
}

impl AssertionFinder {
    fn new(debug_mode: bool) -> Self {
        Self {
            found_assertions: Vec::new(),
            debug_mode,
        }
    }
    
    fn add_assertion(&mut self, assertion_type: AssertionType) {
        if !self.found_assertions.contains(&assertion_type) {
            if self.debug_mode {
                println!("Found assertion: {:?}", assertion_type);
            }
            self.found_assertions.push(assertion_type);
        }
    }
    
    // Helper to check if a type might be 'const'
    fn is_likely_const_type(&self, ts_type: &TSType) -> bool {
        // In a production implementation, you'd need to properly check
        // the type structure, but for simplicity we'll just check if 
        // the string representation contains "const"
        format!("{:?}", ts_type).to_lowercase().contains("const")
    }
}

// Implement the Visit trait for AssertionFinder
impl<'a> Visit<'a> for AssertionFinder {
    // Visit expressions to find 'as Type' assertions
    fn visit_ts_as_expression(&mut self, node: &TSAsExpression<'a>) {
        if self.debug_mode {
            println!("Found 'as' expression");
        }
        
        // Check for "as const" separately
        let is_const = self.is_likely_const_type(&node.type_annotation);
        
        if is_const {
            self.add_assertion(AssertionType::AsConstAssertion);
        } else {
            self.add_assertion(AssertionType::AsExpression);
        }
        
        // Continue traversing the expression
        walk::walk_expression(self, &node.expression);
        walk::walk_ts_type(self, &node.type_annotation);
    }
    
    // Visit type assertions (<Type>expr)
    fn visit_ts_type_assertion(&mut self, node: &TSTypeAssertion<'a>) {
        if self.debug_mode {
            println!("Found TypeScript type assertion (<Type>expr)");
        }
        self.add_assertion(AssertionType::AngleBracketAssertion);
        
        // Continue traversing the expression
        walk::walk_expression(self, &node.expression);
        walk::walk_ts_type(self, &node.type_annotation);
    }
    
    // Visit for non-null assertions (expr!)
    fn visit_ts_non_null_expression(&mut self, node: &TSNonNullExpression<'a>) {
        if self.debug_mode {
            println!("Found non-null assertion (expr!)");
        }
        self.add_assertion(AssertionType::NonNullAssertion);
        
        // Continue traversing the expression
        walk::walk_expression(self, &node.expression);
    }
    
    // Visit for satisfies expressions (expr satisfies Type)
    fn visit_ts_satisfies_expression(&mut self, node: &TSSatisfiesExpression<'a>) {
        if self.debug_mode {
            println!("Found satisfies expression");
        }
        self.add_assertion(AssertionType::SatisfiesAssertion);
        
        // Continue traversing
        walk::walk_expression(self, &node.expression);
        walk::walk_ts_type(self, &node.type_annotation);
    }
}

impl Rule for TypeScriptAssertionDetectionRule {
    fn id(&self) -> &str { &self.id }
    fn description(&self) -> &str { &self.description }
    fn tags(&self) -> Vec<&str> { self.tags.iter().map(|s| s.as_str()).collect() }
    fn severity(&self) -> RuleSeverity { self.severity }
    
    fn evaluate(&self, program: &Program, file_path: &str) -> Result<RuleMatch> {
        if self.debug_mode {
            println!("Evaluating file for type assertions: {}", file_path);
        }
        
        // Skip non-TypeScript files
        if !file_path.ends_with(".ts") && !file_path.ends_with(".tsx") {
            return Ok(RuleMatch {
                rule_id: self.id.clone(),
                file_path: file_path.to_string(),
                matched: false,
                severity: self.severity,
                message: None,
                location: None,
                metadata: HashMap::new(),
            });
        }
        
        // Create our visitor
        let mut finder = AssertionFinder::new(self.debug_mode);
        
        // Start the AST traversal from the root Program node
        finder.visit_program(program);
        
        // Determine the match status
        let matched = !finder.found_assertions.is_empty();
        
        // Build the message based on found assertions
        let message = if matched {
            let assertion_count = finder.found_assertions.len();
            let assertion_list = finder.found_assertions.iter()
                .map(|assertion_type| format!("'{}'", assertion_type.as_str()))
                .collect::<Vec<_>>()
                .join(", ");
            
            Some(format!("Found {} type assertion style(s): {}. Consider using type guards or safer alternatives.", 
                        assertion_count, assertion_list))
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
                    let assertion_types: Vec<String> = finder.found_assertions.iter()
                        .map(|assertion_type| assertion_type.as_str().to_string())
                        .collect();
                    metadata.insert("found_assertion_types".to_string(), assertion_types.join(","));
                }
                metadata
            },
        })
    }
}

/// Create a rule that detects TypeScript type assertions
pub fn create_typescript_assertion_detection_rule() -> Arc<dyn Rule> {
    // In a real implementation, you might want to access debug mode from somewhere else,
    // like a global config or an environment variable
    let debug_mode = std::env::var("SENTINEL_DEBUG").map(|v| v == "1" || v.to_lowercase() == "true").unwrap_or(false);
    
    Arc::new(
        TypeScriptAssertionDetectionRule::new()
            .with_tags(vec!["typescript", "type-safety", "assertions"])
            .with_severity(RuleSeverity::Warning)
            .with_debug_mode(debug_mode)
    )
} 