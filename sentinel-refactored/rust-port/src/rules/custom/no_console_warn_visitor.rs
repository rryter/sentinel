use oxc_ast::ast::{CallExpression, Expression};
use oxc_ast::AstKind;
use oxc_ast_visit::Visit;
use oxc_diagnostics::OxcDiagnostic;
use oxc_semantic::SemanticBuilderReturn;
use oxc_span::{GetSpan, Span};

use crate::rules::Rule;

/// Rule that disallows console.warn calls specifically (using visitor pattern)
///
/// This rule detects and reports uses of `console.warn()` in TypeScript/JavaScript code.
/// It leverages the visitor pattern for efficient traversal of the AST.
///
/// ## Rule Details
///
/// Examples of **incorrect** code:
///
/// ```js
/// console.warn('Warning message');
/// console.warn('Multiple', 'arguments', { data: true });
/// ```
///
/// Examples of **correct** code:
///
/// ```js
/// console.log('Info message');
/// console.error('Error message');
/// logger.warn('Warning with proper logger');
/// ```
pub struct NoConsoleWarnVisitorRule;

/// Visitor implementation that tracks console.warn calls
struct ConsoleWarnVisitor<'a> {
    /// Collection of diagnostics found during AST traversal
    diagnostics: Vec<OxcDiagnostic>,
    /// File path for context in diagnostics
    file_path: &'a str,
}

impl<'a> ConsoleWarnVisitor<'a> {
    fn new(file_path: &'a str) -> Self {
        Self {
            diagnostics: Vec::new(),
            file_path,
        }
    }

    /// Helper method to create a diagnostic for console.warn usage
    fn create_diagnostic(&self, span: Span) -> OxcDiagnostic {
        OxcDiagnostic::warn("Unexpected console.warn")
            .with_help("Remove the console.warn or replace with proper logging")
            .with_label(span.label("Use a logger instead of console.warn"))
    }
}

impl<'a> Visit<'a> for ConsoleWarnVisitor<'a> {
    fn visit_call_expression(&mut self, call_expr: &CallExpression<'a>) {
        if let Some(member_expr) = call_expr.callee.as_member_expression() {
            // Check if it's a console.warn call
            if let Expression::Identifier(ident) = member_expr.object() {
                if ident.name.as_str() == "console" {
                    if let Some(prop_name) = member_expr.static_property_name() {
                        if prop_name == "warn" {
                            self.diagnostics
                                .push(self.create_diagnostic(member_expr.span()));
                        }
                    }
                }
            }
        }
    }
}

impl Rule for NoConsoleWarnVisitorRule {
    fn name(&self) -> &'static str {
        "no-console-warn-visitor"
    }

    fn description(&self) -> &'static str {
        "Disallows the use of console.warn (Visitor Pattern implementation)"
    }

    fn run_on_node(&self, node: &AstKind, _span: Span, file_path: &str) -> Option<OxcDiagnostic> {
        let mut visitor = ConsoleWarnVisitor::new(file_path);

        match node {
            AstKind::CallExpression(call_expr) => {
                visitor.visit_call_expression(call_expr);
            }
            // We only care about call expressions, so skip other node types
            _ => {}
        }

        // Return the first diagnostic if any exist, otherwise None
        visitor.diagnostics.first().cloned()
    }
}
