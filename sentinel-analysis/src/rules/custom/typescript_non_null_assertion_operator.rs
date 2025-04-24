use oxc_ast::AstKind;
use oxc_ast::ast::TSNonNullExpression;
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
    /// Whether to skip checking non-null assertions in test files
    skip_in_tests: bool,
}

impl TypeScriptNonNullAssertionRule {
    pub fn new() -> Self {
        Self {
            skip_in_tests: false, // Default value
        }
    }
}

/// Visitor implementation that tracks non-null assertion usage
struct NonNullAssertionVisitor {
    /// Collection of diagnostics found during AST traversal
    diagnostics: Vec<OxcDiagnostic>,
    /// Whether to skip assertions in tests
    skip_in_tests: bool,
    /// Current file path being analyzed
    file_path: String,
}

impl NonNullAssertionVisitor {
    fn new(skip_in_tests: bool, file_path: String) -> Self {
        Self {
            diagnostics: Vec::new(),
            skip_in_tests,
            file_path,
        }
    }

    fn create_diagnostic(&self, span: Span) -> OxcDiagnostic {
        OxcDiagnostic::error("TypeScript non-null assertion operator (!) usage detected")
            .with_help("The non-null assertion operator tells TypeScript to ignore potential null/undefined values, which can lead to runtime errors if the value is actually null. Consider:\n1. Using optional chaining (?.) with nullish coalescing (??)\n2. Adding proper runtime checks\n3. Redesigning the code to handle null/undefined cases explicitly")
            .with_label(span.label("This non-null assertion assumes the value cannot be null/undefined"))
    }

    fn is_test_file(&self) -> bool {
        let path = self.file_path.to_lowercase();
        path.contains("test")
            || path.contains("spec")
            || path.contains("__tests__")
            || path.ends_with(".test.ts")
            || path.ends_with(".test.tsx")
            || path.ends_with(".spec.ts")
            || path.ends_with(".spec.tsx")
    }

    fn should_report(&self) -> bool {
        !(self.skip_in_tests && self.is_test_file())
    }
}

impl<'a> Visit<'a> for NonNullAssertionVisitor {
    fn visit_ts_non_null_expression(&mut self, node: &TSNonNullExpression<'a>) {
        if self.should_report() {
            self.diagnostics.push(self.create_diagnostic(node.span));
        }
    }
}

impl Rule for TypeScriptNonNullAssertionRule {
    fn name(&self) -> &'static str {
        "typescript-non-null-assertion"
    }

    fn description(&self) -> &'static str {
        "Disallows TypeScript's non-null assertion operator"
    }

    fn set_config(&mut self, config: Value) {
        if let Some(obj) = config.as_object() {
            if let Some(skip_in_tests) = obj.get("skipInTests") {
                if let Some(skip) = skip_in_tests.as_bool() {
                    self.skip_in_tests = skip;
                }
            }
        }
    }

    fn run_on_node(&self, node: &AstKind, _span: Span, file_path: &str) -> Vec<OxcDiagnostic> {
        let mut visitor = NonNullAssertionVisitor::new(self.skip_in_tests, file_path.to_string());

        match node {
            AstKind::TSNonNullExpression(expression) => {
                visitor.visit_ts_non_null_expression(expression);
            }
            _ => {}
        }

        visitor.diagnostics
    }
}
