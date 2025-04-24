use oxc_ast::AstKind;
use oxc_ast::ast::{Expression, TSNonNullExpression};
use oxc_ast_visit::Visit;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::Span;
use serde_json::Value;

use crate::rules::Rule;

/// Rule that detects usage of TypeScript's non-null assertion operator
///
/// This rule flags uses of the non-null assertion operator (`!`) which can be a source
/// of runtime errors if used incorrectly.
///
/// ## Rule Details
///
/// Examples of **incorrect** code:
///
/// ```typescript
/// const name = user!.name;
/// const element = document.querySelector('.foo')!;
/// function foo(bar?: string) {
///   return bar!.length;
/// }
/// ```
///
/// Examples of **correct** code:
///
/// ```typescript
/// const name = user?.name;
/// const element = document.querySelector('.foo') ?? null;
/// function foo(bar?: string) {
///   return bar?.length ?? 0;
/// }
/// ```
pub struct TypeScriptNonNullAssertionRule {
    /// Whether to allow non-null assertions in test files
    allow_in_tests: bool,
}

impl TypeScriptNonNullAssertionRule {
    pub fn new() -> Self {
        Self {
            allow_in_tests: false, // Default value
        }
    }
}

/// Visitor implementation that tracks non-null assertion usage
struct NonNullAssertionVisitor {
    /// Collection of diagnostics found during AST traversal
    diagnostics: Vec<OxcDiagnostic>,
}

impl NonNullAssertionVisitor {
    fn new() -> Self {
        Self {
            diagnostics: Vec::new(),
        }
    }

    fn create_diagnostic(&self, span: Span) -> OxcDiagnostic {
        OxcDiagnostic::error("Non-null assertion operator detected")
            .with_help("Consider using optional chaining (?.) or providing a default value instead")
            .with_label(span.label("Non-null assertion operator used here"))
    }
}

impl<'a> Visit<'a> for NonNullAssertionVisitor {
    fn visit_ts_non_null_expression(&mut self, node: &TSNonNullExpression<'a>) {
        self.diagnostics.push(self.create_diagnostic(node.span));
    }
}

impl Rule for TypeScriptNonNullAssertionRule {
    fn name(&self) -> &'static str {
        "typescript-non-null-assertion"
    }

    fn description(&self) -> &'static str {
        "Disallows TypeScript's non-null assertion operator"
    }

    fn run_on_node(&self, node: &AstKind, span: Span) -> Vec<OxcDiagnostic> {
        let mut visitor = NonNullAssertionVisitor::new();

        match node {
            AstKind::TSNonNullExpression(expression) => {
                visitor.visit_ts_non_null_expression(expression);
            }

            _ => {}
        }

        visitor.diagnostics
    }
}
