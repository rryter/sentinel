use oxc_ast::AstKind;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::Span;

use crate::rules::Rule;

/// Rule that disallows console.* calls
pub struct NoConsoleRule;

impl Rule for NoConsoleRule {
    fn name(&self) -> &'static str {
        "no-console"
    }
    
    fn description(&self) -> &'static str {
        "Disallow the use of console.* methods"
    }
    
    fn run_on_node(&self, node: &AstKind, span: Span, _file_path: &str) -> Option<OxcDiagnostic> {
        match node {
            AstKind::CallExpression(call_expr) => {
                // Check if it's a member expression (e.g., console.log)
                if let Some(member_expr) = &call_expr.callee.as_member_expression() {
                    // Get the source text of the expression and check for "console"
                    let expr_str = format!("{:?}", member_expr);
                    if expr_str.contains("console.") {
                        return Some(
                            OxcDiagnostic::error("console.* calls are not allowed")
                                .with_label(span)
                        );
                    }
                }
                None
            }
            _ => None,
        }
    }
} 