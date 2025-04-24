use oxc_ast::AstKind;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::Span;

use crate::rules::Rule;

/// Rule that disallows debugger statements
pub struct NoDebuggerRule;

impl Rule for NoDebuggerRule {
    fn name(&self) -> &'static str {
        "no-debugger"
    }

    fn description(&self) -> &'static str {
        "Disallow the use of debugger statements"
    }

    fn run_on_node(&self, node: &AstKind, span: Span, _file_path: &str) -> Vec<OxcDiagnostic> {
        match node {
            AstKind::DebuggerStatement(_) => {
                vec![OxcDiagnostic::error("`debugger` statement is not allowed").with_label(span)]
            }
            _ => Vec::new(),
        }
    }
}
