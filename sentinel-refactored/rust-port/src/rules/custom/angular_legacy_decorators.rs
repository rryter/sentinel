use oxc_ast::ast::{Decorator, Expression};
use oxc_ast::AstKind;
use oxc_ast_visit::Visit;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::{GetSpan, Span};
use std::collections::HashSet;

use crate::rules::Rule;

/// Rule that checks for legacy Angular decorators that should be replaced with signal-based alternatives
///
/// This rule detects usage of legacy Angular decorators (@Input, @Output, etc.) that have been 
/// replaced with more modern signal-based alternatives in newer Angular versions.
///
/// ## Rule Details
///
/// Examples of **incorrect** code (legacy decorators):
///
/// ```typescript
/// import { Input, Output } from '@angular/core';
/// @Input() property: string;
/// @Output() event = new EventEmitter<void>();
/// ```
///
/// Examples of **correct** code (signal-based alternatives):
///
/// ```typescript
/// import { input, output } from '@angular/core';
/// property = input<string>();
/// event = output<void>();
/// ```
pub struct AngularLegacyDecoratorsRule;

/// Visitor implementation that detects usage of legacy Angular decorators
struct LegacyDecoratorsVisitor {
    /// Collection of diagnostics found during AST traversal
    diagnostics: Vec<OxcDiagnostic>,
    /// Set of decorator names to check
    restricted_decorators: HashSet<&'static str>,
}

impl LegacyDecoratorsVisitor {
    fn new() -> Self {
        let mut restricted_decorators = HashSet::new();
        restricted_decorators.insert("Input");
        restricted_decorators.insert("Output");
        restricted_decorators.insert("ViewChild");
        restricted_decorators.insert("ViewChildren");
        restricted_decorators.insert("ContentChild");
        restricted_decorators.insert("ContentChildren");

        Self {
            diagnostics: Vec::new(),
            restricted_decorators,
        }
    }

    /// Helper method to create a diagnostic for legacy Angular decorator usage
    fn create_decorator_diagnostic(&self, name: &str, span: Span) -> OxcDiagnostic {
        OxcDiagnostic::warn(format!("Legacy Angular @{} decorator detected", name))
            .with_help(format!("Replace @{} decorator with the signal-based alternative {}()", name, name.to_lowercase()))
            .with_label(span.label(format!("@{} decorator usage", name)))
    }
}

impl<'a> Visit<'a> for LegacyDecoratorsVisitor {
    fn visit_decorator(&mut self, decorator: &Decorator<'a>) {
        match &decorator.expression {
            // Simple identifier decorator: @Input
            Expression::Identifier(ident) => {
                let name = ident.name.as_str();
                if self.restricted_decorators.contains(name) {
                    self.diagnostics
                        .push(self.create_decorator_diagnostic(name, decorator.span()));
                }
            }
            // Decorator with arguments: @Input() or @Input('propName')
            Expression::CallExpression(call_expr) => {
                // Check if the callee is an identifier (most common case)
                if let Expression::Identifier(callee_ident) = &call_expr.callee {
                    let name = callee_ident.name.as_str();
                    if self.restricted_decorators.contains(name) {
                        self.diagnostics
                            .push(self.create_decorator_diagnostic(name, decorator.span()));
                    }
                }
            }
            _ => {}
        }
    }
}

impl Rule for AngularLegacyDecoratorsRule {
    fn name(&self) -> &'static str {
        "angular-legacy-decorators"
    }

    fn description(&self) -> &'static str {
        "Detects usage of legacy Angular decorators that should be replaced with signal-based alternatives"
    }

    fn run_on_node(&self, node: &AstKind, _span: Span) -> Vec<OxcDiagnostic> {
        let mut visitor = LegacyDecoratorsVisitor::new();

        match node {
            AstKind::Decorator(decorator) => {
                visitor.visit_decorator(decorator);
            }
            _ => {}
        }

        visitor.diagnostics
    }
}
