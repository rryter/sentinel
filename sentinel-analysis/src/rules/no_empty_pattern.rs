use oxc_ast::AstKind;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::Span;

use crate::rules::Rule;

/// Rule that disallows empty destructuring patterns
pub struct NoEmptyPatternRule;

impl Rule for NoEmptyPatternRule {
    fn name(&self) -> &'static str {
        "no-empty-pattern"
    }

    fn description(&self) -> &'static str {
        "Disallow empty destructuring patterns"
    }

    fn run_on_node(&self, _node: &AstKind, _span: Span, _file_path: &str) -> Vec<OxcDiagnostic> {
        match _node {
            AstKind::ArrayPattern(array) if array.elements.is_empty() => vec![
                OxcDiagnostic::error("empty destructuring pattern is not allowed")
                    .with_label(_span.label("Empty array binding pattern")),
            ],
            AstKind::ObjectPattern(object) if object.properties.is_empty() => vec![
                OxcDiagnostic::error("empty destructuring pattern is not allowed")
                    .with_label(_span.label("Empty object binding pattern")),
            ],
            _ => Vec::new(),
        }
    }
}
