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
    severity: RuleSeverity,
    // Optional: Add a threshold field if you want to trigger the rule only above a certain count
    threshold: usize, 
}

impl ImportCountRule {
    pub fn new() -> Self {
        Self {
            id: "import-count".to_string(),
            description: "Counts the number of import statements in a file.".to_string(),
            tags: vec!["general".to_string(), "imports".to_string(), "metrics".to_string()],
            severity: RuleSeverity::Info, // Default severity, can be changed
            threshold: 10, // Example threshold
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

    // Optional: Add a method to configure the threshold
    pub fn with_threshold(mut self, threshold: usize) -> Self {
        self.threshold = threshold;
        self
    }
}

impl Rule for ImportCountRule {
    fn id(&self) -> &str { &self.id }
    fn description(&self) -> &str { &self.description }
    fn tags(&self) -> Vec<&str> { self.tags.iter().map(|s| s.as_str()).collect() }
    fn severity(&self) -> RuleSeverity { self.severity }
    
    fn evaluate(&self, program: &Program, file_path: &str) -> Result<RuleMatch> {
        let mut import_count = 0;
        let mut message = None;
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

        println!("import_count: {}", import_count);
        println!("threshold: {}", self.threshold);

        // let matched = import_count > 0; // Simple match: true if any imports exist
        // Or, match based on a threshold:
        let matched = import_count > self.threshold;

        if matched {
             // message = Some(format!("Found {} import statement(s).", import_count));
             // If using a threshold:
             message = Some(format!(
                "Found {} import statements, exceeding the threshold of {}.",
                import_count, self.threshold
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
                metadata.insert(
                    "import_count".to_string(), 
                    import_count.to_string()
                );
                // Optionally add threshold to metadata
                metadata.insert(
                    "threshold".to_string(),
                    self.threshold.to_string()
                );
                metadata
            },
        })
    }
}

/// Create a rule that counts import statements
pub fn create_import_count_rule() -> Arc<dyn Rule> {
    Arc::new(
        ImportCountRule::new()
            .with_threshold(10) // Explicitly set the desired threshold
            .with_tags(vec!["general", "imports", "metrics"])
            .with_severity(RuleSeverity::Info) // Set desired severity
    )
}
