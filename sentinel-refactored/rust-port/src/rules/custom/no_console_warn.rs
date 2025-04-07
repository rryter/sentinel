use oxc_ast::AstKind;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::Span;

use crate::rules::Rule;

/// Rule that disallows console.warn calls specifically
pub struct NoConsoleWarnRule;

impl Rule for NoConsoleWarnRule {
    fn name(&self) -> &'static str {
        "no-console-warn"
    }
    
    fn description(&self) -> &'static str {
        "Disallows the use of console.warn"
    }
    
    fn run_on_node(&self, node: &AstKind, span: Span, _file_path: &str) -> Option<OxcDiagnostic> {
        if let AstKind::CallExpression(call_expr) = node {
            // Try to get the member expression from the callee
            if let Some(member_expr) = call_expr.callee.as_member_expression() {
                // Convert to a debug string and check if it contains console.warn
                let expr_debug = format!("{member_expr:?}");
                
                if expr_debug.contains("console") && expr_debug.contains("warn") {
                    return Some(
                        OxcDiagnostic::warn("Unexpected console.warn")
                            .with_help("Remove the console.warn or replace with proper logging")
                            .with_label(span.label("Use a logger instead of console.warn"))
                    );
                }
            }
        }
        None
    }
} 