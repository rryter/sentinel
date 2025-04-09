use oxc_ast::ast::{Expression, PropertyDefinition};
use oxc_ast::AstKind;
use oxc_ast_visit::Visit;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::Span;
use serde_json::Value;

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
pub struct AngularInputCountRule {
    /// Maximum number of inputs allowed before triggering a warning
    max_inputs: usize,
}

impl AngularInputCountRule {
    pub fn new() -> Self {
        Self {
            max_inputs: 5, // Default value
        }
    }
}

/// Visitor implementation that tracks Angular decorator imports and usage
struct InputCountVisitor {
    /// Collection of diagnostics found during AST traversal
    diagnostics: Vec<OxcDiagnostic>,
    /// input count
    input_count: usize,
    /// Maximum number of inputs allowed
    max_inputs: usize,
}

impl InputCountVisitor {
    fn new(max_inputs: usize) -> Self {
        Self {
            diagnostics: Vec::new(),
            input_count: 0,
            max_inputs,
        }
    }

    fn create_decorator_diagnostic(&self, span: Span) -> OxcDiagnostic {
        OxcDiagnostic::warn("Too many Angular input properties detected")
            .with_help("Consider breaking this component into smaller components with fewer inputs")
            .with_label(span.label(format!(
                "Component has {} inputs, which exceeds the recommended maximum of {}",
                self.input_count, self.max_inputs
            )))
    }
}

impl<'a> Visit<'a> for InputCountVisitor {
    fn visit_property_definition(&mut self, property_definition: &PropertyDefinition<'a>) {
        if let Some(value) = &property_definition.value {
            // Match on the Expression
            match value {
                // Call expression: input<type>() or input()
                Expression::CallExpression(call_expr) => {
                    if let Expression::Identifier(callee_ident) = &call_expr.callee {
                        let name = callee_ident.name.as_str();
                        if name == "input" {
                            // Count the number of input properties in the class
                            self.input_count += 1;
                            // Only add diagnostic if we exceed the limit
                            if self.input_count > self.max_inputs && self.diagnostics.is_empty() {
                                self.diagnostics
                                    .push(self.create_decorator_diagnostic(call_expr.span));
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

    fn set_config(&mut self, config: Value) {
        if let Some(obj) = config.as_object() {
            if let Some(max_inputs) = obj.get("maxInputs") {
                if let Some(max) = max_inputs.as_u64() {
                    self.max_inputs = max as usize;
                }
            }
        }
    }

    fn run_on_node(&self, node: &AstKind, _span: Span) -> Option<OxcDiagnostic> {
        let mut visitor = InputCountVisitor::new(self.max_inputs);

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
