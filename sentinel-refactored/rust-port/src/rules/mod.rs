// Module declarations
pub mod no_debugger;
pub mod no_empty_pattern;

// Try to import custom rules if they exist
#[cfg(feature = "custom_rules")]
pub mod custom;

// Re-export types and functions needed by other modules
use oxc_ast::AstKind;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::Span;

/// Trait that all rules must implement
pub trait Rule: Send + Sync {
    /// Get the name of the rule
    fn name(&self) -> &'static str;
    
    /// Get a description of what the rule checks for
    #[allow(dead_code)]
    fn description(&self) -> &'static str;
    
    /// Run the rule on a semantic node
    fn run_on_node(&self, node: &AstKind, span: Span, file_path: &str) -> Option<OxcDiagnostic>;
}

// Re-export rules for easier access
pub use no_debugger::NoDebuggerRule;
pub use no_empty_pattern::NoEmptyPatternRule;

// Re-export custom rules if they exist
