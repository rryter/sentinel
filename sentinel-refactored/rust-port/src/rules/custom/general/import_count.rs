use std::sync::Arc;
use std::collections::HashMap;
use anyhow::Result;
use oxc_ast::ast::{Program};
use crate::rules::{Rule, RuleMatch, RuleSeverity};

/// Rule that counts the number of import statements in a file.
pub struct ImportCountRule {
    id: String,
    description: String,
    tags: Vec<String>,
    warning_threshold: usize, 
    error_threshold: usize,
}

impl ImportCountRule {
    pub fn new() -> Self {
        Self {
            id: "import-count".to_string(),
            description: "Counts the number of import statements in a file.".to_string(),
            tags: vec!["general".to_string(), "imports".to_string(), "metrics".to_string()],
            warning_threshold: 10,
            error_threshold: 20,
        }
    }
    
    pub fn with_tags(mut self, tags: Vec<&str>) -> Self {
        self.tags = tags.into_iter().map(|s| s.to_string()).collect();
        self
    }
    
    pub fn with_warning_threshold(mut self, threshold: usize) -> Self {
        self.warning_threshold = threshold;
        self
    }

    pub fn with_error_threshold(mut self, threshold: usize) -> Self {
        self.error_threshold = threshold;
        self
    }
}

impl Rule for ImportCountRule {
    fn id(&self) -> &str { &self.id }
    fn description(&self) -> &str { &self.description }
    fn tags(&self) -> Vec<&str> { self.tags.iter().map(|s| s.as_str()).collect() }
    
    // The base severity is now determined dynamically in evaluate()
    fn severity(&self) -> RuleSeverity { RuleSeverity::Warning }
    
    fn evaluate(&self, program: &Program, file_path: &str) -> Result<RuleMatch> {
        let mut import_count = 0;
        let location = None; // Location finding might be complex, starting without it

        for stmt in &program.body {
            if let Some(module_decl) = stmt.as_module_declaration() {
                match module_decl {
                    oxc_ast::ast::ModuleDeclaration::ImportDeclaration(_) => {
                        import_count += 1;
                    },
                    // Consider counting ExportNamedDeclaration with source, ExportAllDeclaration too?
                    // oxc_ast::ast::ModuleDeclaration::ExportNamedDeclaration(decl) if decl.source.is_some() => {
                    //     import_count += 1; 
                    // },
                    // oxc_ast::ast::ModuleDeclaration::ExportAllDeclaration(_) => {
                    //     import_count += 1;
                    // }
                    _ => {}
                }
            }
        }

        // Create appropriate rule match based on thresholds
        if import_count >= self.error_threshold {
            // For errors, use a distinct rule ID
            let rule_id = format!("{}-error", self.id);
            let message = Some(format!(
                "Found {} import statements, exceeding the error threshold of {}.",
                import_count, self.error_threshold
            ));
            
            Ok(RuleMatch {
                rule_id,
                file_path: file_path.to_string(),
                matched: true,
                severity: RuleSeverity::Error,
                message,
                location,
                metadata: {
                    let mut metadata = HashMap::new();
                    metadata.insert(
                        "import_count".to_string(), 
                        import_count.to_string()
                    );
                    metadata.insert(
                        "warning_threshold".to_string(),
                        self.warning_threshold.to_string()
                    );
                    metadata.insert(
                        "error_threshold".to_string(),
                        self.error_threshold.to_string()
                    );
                    metadata
                },
            })
        } else if import_count >= self.warning_threshold {
            // For warnings, use the original rule ID
            let message = Some(format!(
                "Found {} import statements, exceeding the warning threshold of {}.",
                import_count, self.warning_threshold
            ));
            
            Ok(RuleMatch {
                rule_id: self.id.clone(),
                file_path: file_path.to_string(),
                matched: true,
                severity: RuleSeverity::Warning,
                message,
                location,
                metadata: {
                    let mut metadata = HashMap::new();
                    metadata.insert(
                        "import_count".to_string(), 
                        import_count.to_string()
                    );
                    metadata.insert(
                        "warning_threshold".to_string(),
                        self.warning_threshold.to_string()
                    );
                    metadata.insert(
                        "error_threshold".to_string(),
                        self.error_threshold.to_string()
                    );
                    metadata
                },
            })
        } else {
            // No thresholds exceeded
            Ok(RuleMatch {
                rule_id: self.id.clone(),
                file_path: file_path.to_string(),
                matched: false,
                severity: RuleSeverity::Warning,
                message: None,
                location,
                metadata: {
                    let mut metadata = HashMap::new();
                    metadata.insert(
                        "import_count".to_string(), 
                        import_count.to_string()
                    );
                    metadata.insert(
                        "warning_threshold".to_string(),
                        self.warning_threshold.to_string()
                    );
                    metadata.insert(
                        "error_threshold".to_string(),
                        self.error_threshold.to_string()
                    );
                    metadata
                },
            })
        }
    }
}

/// Create a rule that counts import statements
pub fn create_import_count_rule() -> Arc<dyn Rule> {
    Arc::new(
        ImportCountRule::new()
            .with_warning_threshold(10)
            .with_error_threshold(20)
            .with_tags(vec!["general", "imports", "metrics"])
    )
}
