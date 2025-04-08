use oxc_ast::ast::{
    Decorator, Expression, ImportDeclaration, ImportDeclarationSpecifier, PropertyDefinition,
};
use oxc_ast::AstKind;
use oxc_ast_visit::Visit;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::{GetSpan, Span};
use std::collections::HashSet;

use crate::rules::Rule;

/// Rule that checks for excessive Angular signal inputs
///
/// This rule detects and reports when a component has too many signal inputs,
/// which can indicate poor component design or excessive coupling.
///
/// ## Rule Details
///
/// Examples of **incorrect** code:
///
/// ```typescript
/// import { Component, input } from '@angular/core';
///
/// @Component({...})
/// export class MyComponent {
///   prop1 = input<string>();
///   prop2 = input<number>();
///   prop3 = input<boolean>();
///   prop4 = input<Date>();
///   prop5 = input<object>();
///   // ... many more inputs
/// }
/// ```
///
/// Examples of **correct** code:
///
/// ```typescript
/// import { Component, input } from '@angular/core';
///
/// @Component({...})
/// export class MyComponent {
///   // Reasonable number of inputs
///   prop1 = input<string>();
///   prop2 = input<number>();
///   prop3 = input<boolean>();
/// }
/// ```
pub struct AngularInputCountRule;

/// Visitor implementation that tracks Angular decorator imports and usage
struct InputCountVisitor<'a> {
    /// Collection of diagnostics found during AST traversal
    diagnostics: Vec<OxcDiagnostic>,
    /// File path for context in diagnostics
    file_path: &'a str,
    /// input count
    input_count: usize,
}

impl<'a> InputCountVisitor<'a> {
    fn new(file_path: &'a str) -> Self {
        Self {
            diagnostics: Vec::new(),
            file_path,
            input_count: 0,
        }
    }

    /// Helper method to create a diagnostic for Angular decorator usage
    fn create_decorator_diagnostic(&self, name: &str, span: Span) -> OxcDiagnostic {
        OxcDiagnostic::warn(format!("Angular @{} decorator detected", name))
            .with_help("Ensure Input properties are not Observables, and Output properties are Observable-like.")
            .with_label(span.label(format!("@{} decorator usage", name)))
    }
}

impl<'a> Visit<'a> for InputCountVisitor<'a> {
    fn visit_property_definition(&mut self, property_definition: &PropertyDefinition<'a>) {
        println!("property_definition: {:?}", property_definition);
        if let Some(value) = &property_definition.value {
            // Match on the Expression
            match value {
                // Call expression: input<type>() or input()
                Expression::CallExpression(call_expr) => {
                    println!("value: {:?}", call_expr);

                    if let Expression::Identifier(callee_ident) = &call_expr.callee {
                        let name = callee_ident.name.as_str();
                        if name == "input" {
                            println!(">>>name: {:?}", name);
                            
                            // Count the number of input properties in the class
                            self.input_count += 1;
                            println!(">>>input count: {:?}", self.input_count);
                            
                            // Only add diagnostic if we exceed the limit
                            if self.input_count > 5 && self.diagnostics.is_empty() {
                                self.diagnostics.push(
                                    OxcDiagnostic::warn("Too many Angular input properties detected")
                                        .with_help("Consider breaking this component into smaller components with fewer inputs")
                                        .with_label(property_definition.span().label(
                                            format!("Component has {} inputs, which exceeds the recommended maximum of 5", self.input_count)
                                        ))
                                );
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }
}

impl Rule for AngularInputCountRule {
    fn name(&self) -> &'static str {
        "angular-input-count"
    }

    fn description(&self) -> &'static str {
        "Checks for excessive Angular signal inputs"
    }

    fn run_on_node(&self, node: &AstKind, _span: Span, file_path: &str) -> Option<OxcDiagnostic> {
        let mut visitor = InputCountVisitor::new(file_path);

        match node {
            AstKind::Class(class) => {
                // Visit the entire class, which contains all properties
                visitor.visit_class(class);
            }
            _ => {}
        }

        visitor.diagnostics.first().cloned()

    }
}
