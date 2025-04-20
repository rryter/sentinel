// Module declarations
pub mod no_debugger;
pub mod no_empty_pattern;

// Try to import custom rules if they exist
#[cfg(feature = "custom_rules")]
pub mod custom;

// Re-export types and functions needed by other modules
use oxc_ast::AstKind;
use oxc_diagnostics::OxcDiagnostic;
use oxc_semantic::SemanticBuilderReturn;
use oxc_span::Span;
use serde_json::Value;

/// Trait that all rules must implement
pub trait Rule: Send + Sync {
    /// Get the name of the rule
    fn name(&self) -> &'static str;

    /// Get a description of what the rule checks for
    #[allow(dead_code)]
    fn description(&self) -> &'static str;

    /// Set configuration for this rule
    /// Default implementation does nothing - rules must override to use configuration
    fn set_config(&mut self, _config: Value) {}

    /// Run the rule on a specific AST node (optional)
    /// Rules primarily using the visitor pattern might not implement this.
    /// Default implementation returns an empty Vec.
    fn run_on_node(&self, _node: &AstKind, _span: Span) -> Vec<OxcDiagnostic> {
        Vec::new()
    }

    /// Run the rule using the visitor pattern (optional)
    /// Default implementation returns an empty Vec
    ///
    /// @param semantic_result The result of semantic analysis
    /// @param file_path The path of the file being analyzed
    fn run_on_semantic(
        &self,
        _semantic_result: &SemanticBuilderReturn,
        _file_path: &str,
    ) -> Vec<OxcDiagnostic> {
        Vec::new()
    }
}

// Re-export rules for easier access
pub use no_debugger::NoDebuggerRule;
pub use no_empty_pattern::NoEmptyPatternRule;

// Re-export custom rules if they exist
#[cfg(feature = "custom_rules")]
pub use custom::*;
