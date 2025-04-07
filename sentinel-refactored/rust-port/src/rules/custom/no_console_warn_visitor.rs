use oxc_ast::ast::{CallExpression, Expression};
use oxc_ast::AstKind;
use oxc_ast_visit::Visit;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::{GetSpan, Span};
use oxc_semantic::SemanticBuilderReturn;

use crate::rules::Rule;

/// Rule that disallows console.warn calls specifically (using visitor pattern)
pub struct NoConsoleWarnVisitorRule;

struct ConsoleWarnVisitor {
    diagnostics: Vec<OxcDiagnostic>,
}

impl ConsoleWarnVisitor {
    fn new() -> Self {
        Self {
            diagnostics: Vec::new(),
        }
    }
}

impl<'a> Visit<'a> for ConsoleWarnVisitor {
    fn visit_call_expression(&mut self, call_expr: &CallExpression<'a>) {
        if let Some(member_expr) = call_expr.callee.as_member_expression() {
            // Using match instead of if let for better pattern matching
            match member_expr.object() {
                Expression::Identifier(ident) if ident.name.as_str() == "console" => {
                    if let Some(prop_name) = member_expr.static_property_name() {
                        if prop_name == "warn" {
                            self.diagnostics.push(
                                OxcDiagnostic::warn("Unexpected console.warn")
                                    .with_help("Remove the console.warn or replace with proper logging")
                                    .with_label(member_expr.span().label("Use a logger instead of console.warn"))
                            );
                        }
                    }
                }
                _ => {}
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

    fn run_on_node(&self, _node: &AstKind, _span: Span, _file_path: &str) -> Option<OxcDiagnostic> {
        None // We don't use this method since we're using the visitor pattern
    }

    fn run_on_semantic(&self, semantic_result: &SemanticBuilderReturn) -> Vec<OxcDiagnostic> {
        let mut visitor = ConsoleWarnVisitor::new();
        
        // Iterate through all AST nodes and let the visitor pattern handle traversal
        for node in semantic_result.semantic.nodes() {
            match node.kind() {
                AstKind::CallExpression(call_expr) => {
                    visitor.visit_call_expression(call_expr);
                }
                // We only care about call expressions, so skip other node types
                _ => {}
            }
        }
        
        visitor.diagnostics
    }
} 