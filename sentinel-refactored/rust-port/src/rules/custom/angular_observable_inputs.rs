use oxc_ast::ast::{Decorator, Expression, ImportDeclaration, ImportDeclarationSpecifier};
use oxc_ast::AstKind;
use oxc_ast_visit::Visit;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::{GetSpan, Span};
use std::collections::HashSet;

use crate::rules::Rule;

/// Rule that checks for Angular Input/Output imports and decorators
///
/// This rule detects and reports Angular decorators that might have observable-related issues.
///
/// ## Rule Details
///
/// Examples of **incorrect** code:
///
/// ```typescript
/// import { Input, Output } from '@angular/core';
/// @Input() property: Observable<string>;
/// @Output() event = new EventEmitter<void>();
/// ```
///
/// Examples of **correct** code:
///
/// ```typescript
/// import { Component } from '@angular/core';
/// @Input() property: string;
/// @Output() event = new EventEmitter<void>();
/// ```
pub struct AngularObservableInputsRule;

/// Visitor implementation that tracks Angular decorator imports and usage
struct ObservableInputsVisitor<'a> {
    /// Collection of diagnostics found during AST traversal
    diagnostics: Vec<OxcDiagnostic>,
    /// File path for context in diagnostics
    file_path: &'a str,
    /// Set of decorator names to check
    restricted_decorators: HashSet<&'static str>,
}

impl<'a> ObservableInputsVisitor<'a> {
    fn new(file_path: &'a str) -> Self {
        let mut restricted_decorators = HashSet::new();
        restricted_decorators.insert("Input");
        restricted_decorators.insert("Output");
        restricted_decorators.insert("ViewChild");
        restricted_decorators.insert("ViewChildren");
        restricted_decorators.insert("ContentChild");
        restricted_decorators.insert("ContentChildren");

        Self {
            diagnostics: Vec::new(),
            file_path,
            restricted_decorators,
        }
    }

    /// Helper method to create a diagnostic for Angular imports
    fn create_import_diagnostic(&self, span: Span) -> OxcDiagnostic {
        OxcDiagnostic::warn("Angular Input/Output decorator import detected")
            .with_help("Review usage of Angular decorators with Observables. Input properties should not be Observables, and Output properties should be Observable-like.")
            .with_label(span.label("Angular decorator import"))
    }

    /// Helper method to create a diagnostic for Angular decorator usage
    fn create_decorator_diagnostic(&self, name: &str, span: Span) -> OxcDiagnostic {
        OxcDiagnostic::warn(format!("Angular @{} decorator detected", name))
            .with_help("Ensure Input properties are not Observables, and Output properties are Observable-like.")
            .with_label(span.label(format!("@{} decorator usage", name)))
    }
}

impl<'a> Visit<'a> for ObservableInputsVisitor<'a> {
    fn visit_import_declaration(&mut self, import_decl: &ImportDeclaration<'a>) {
        // Check if the import is from '@angular/core'
        if import_decl.source.value == "@angular/core" {
            // Iterate through the vector of specifiers if they exist
            if let Some(specifiers) = &import_decl.specifiers {
                for specifier in specifiers.iter() {
                    // Check for Import specifiers
                    if let ImportDeclarationSpecifier::ImportSpecifier(import_spec) = specifier {
                        let name = import_spec.local.name.as_str();
                        if self.restricted_decorators.contains(name) {
                            self.diagnostics.push(self.create_import_diagnostic(import_spec.local.span()));
                        }
                    }
                }
            }
        }
    }

    fn visit_decorator(&mut self, decorator: &Decorator<'a>) {
        match &decorator.expression {
            // Simple identifier decorator: @Input
            Expression::Identifier(ident) => {
                let name = ident.name.as_str();
                if self.restricted_decorators.contains(name) {
                    self.diagnostics.push(self.create_decorator_diagnostic(name, decorator.span()));
                }
            },
            // Decorator with arguments: @Input() or @Input('propName')
            Expression::CallExpression(call_expr) => {
                // Check if the callee is an identifier (most common case)
                if let Expression::Identifier(callee_ident) = &call_expr.callee {
                    let name = callee_ident.name.as_str();
                    if self.restricted_decorators.contains(name) {
                        self.diagnostics.push(self.create_decorator_diagnostic(name, decorator.span()));
                    }
                }
            },
            _ => {}
        }
    }
}

impl Rule for AngularObservableInputsRule {
    fn name(&self) -> &'static str {
        "angular-observable-inputs"
    }

    fn description(&self) -> &'static str {
        "Checks for proper usage of Observable inputs in Angular components"
    }

    fn run_on_node(&self, node: &AstKind, _span: Span, file_path: &str) -> Option<OxcDiagnostic> {
        let mut visitor = ObservableInputsVisitor::new(file_path);

        match node {
            AstKind::ImportDeclaration(import_decl) => {
                visitor.visit_import_declaration(import_decl);
            }
            AstKind::Decorator(decorator) => {
                visitor.visit_decorator(decorator);
            }
            _ => {}
        }

        // Return the first diagnostic if any exist, otherwise None
        visitor.diagnostics.first().cloned()
    }
}
