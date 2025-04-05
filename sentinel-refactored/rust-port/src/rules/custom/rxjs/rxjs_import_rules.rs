use std::sync::Arc;
use std::collections::HashMap;
use anyhow::Result;
use oxc_ast::ast::{Program, ModuleDeclaration};
use crate::rules::{Rule, RuleMatch, RuleSeverity, create_source_location}; 

// Copied from original import_rule.rs
/// Rule that checks for imports of specific modules
pub struct ImportRule {
    id: String,
    description: String,
    module_name: String,
    tags: Vec<String>,
    severity: RuleSeverity,
}

// Copied from original import_rule.rs
impl ImportRule {
    pub fn new(id: String, description: String, module_name: String) -> Self {
        Self {
            id,
            description,
            module_name,
            tags: vec!["imports".to_string()],
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

// Copied from original import_rule.rs
impl Rule for ImportRule {
    fn id(&self) -> &str { &self.id }
    fn description(&self) -> &str { &self.description }
    fn tags(&self) -> Vec<&str> { self.tags.iter().map(|s| s.as_str()).collect() }
    fn severity(&self) -> RuleSeverity { self.severity }
    
    fn evaluate(&self, program: &Program, file_path: &str) -> Result<RuleMatch> {
        let mut matched = false;
        let mut message = None;
        let mut location = None;
        
        for stmt in &program.body {
            if let Some(module_decl) = stmt.as_module_declaration() {
                if let ModuleDeclaration::ImportDeclaration(import_decl) = module_decl {
                    let src_str = import_decl.source.value.as_str();
                    if src_str == self.module_name {
                        matched = true;
                        message = Some(format!("Found import of module '{}'", self.module_name));
                        location = Some(create_source_location(&import_decl.span));
                        break;
                    }
                }
            }
        }
        
        Ok(RuleMatch {
            rule_id: self.id.clone(),
            file_path: file_path.to_string(),
            matched,
            severity: self.severity,
            message,
            location,
            metadata: HashMap::new(),
        })
    }
}

/// Create a rule that checks for imports of 'rxjs'
pub fn create_rxjs_import_rule() -> Arc<dyn Rule> {
    Arc::new(
        ImportRule::new(
            "import-rxjs".to_string(),
            "Detects imports from 'rxjs' module".to_string(),
            "rxjs".to_string(),
        )
        .with_tags(vec!["rxjs", "imports", "dependencies"])
        .with_severity(RuleSeverity::Warning)
    )
}

/// Create a rule that checks for imports of 'rxjs/operators'
pub fn create_rxjs_operators_import_rule() -> Arc<dyn Rule> {
    Arc::new(
        ImportRule::new(
            "import-rxjs-operators".to_string(),
            "Detects imports from 'rxjs/operators' module".to_string(),
            "rxjs/operators".to_string(),
        )
        .with_tags(vec!["rxjs", "imports", "dependencies"])
        .with_severity(RuleSeverity::Warning)
    )
} 