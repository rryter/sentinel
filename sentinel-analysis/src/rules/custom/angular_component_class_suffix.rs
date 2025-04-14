use oxc_ast::AstKind;
use oxc_ast::ast::{Class, Decorator, Expression};
use oxc_ast_visit::Visit;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::Span;
use serde_json::Value;

use crate::rules::Rule;

/// Rule that enforces Angular component class naming convention
///
/// This rule ensures that classes decorated with @Component have the suffix "Component"
/// (or a custom suffix specified in configuration).
///
/// ## Rule Details
///
/// Examples of **incorrect** code:
///
/// ```typescript
/// @Component({...})
/// export class MyClass {} // Missing "Component" suffix
///
/// @Component({...})
/// export class UserHandler {} // Missing "Component" suffix
/// ```
///
/// Examples of **correct** code:
///
/// ```typescript
/// @Component({...})
/// export class MyComponent {}
///
/// @Component({...})
/// export class UserHandlerComponent {}
/// ```
pub struct AngularComponentClassSuffixRule {
    /// List of allowed component class suffixes
    suffixes: Vec<String>,
}

impl AngularComponentClassSuffixRule {
    pub fn new() -> Self {
        Self {
            suffixes: vec!["Component".to_string()], // Default value
        }
    }
}

/// Visitor implementation that checks Angular component class names
struct ComponentClassVisitor {
    /// Collection of diagnostics found during AST traversal
    diagnostics: Vec<OxcDiagnostic>,
    /// List of allowed suffixes
    suffixes: Vec<String>,
}

impl ComponentClassVisitor {
    fn new(suffixes: Vec<String>) -> Self {
        Self {
            diagnostics: Vec::new(),
            suffixes,
        }
    }

    fn create_diagnostic(&self, class_name: &str, span: Span) -> OxcDiagnostic {
        let suffix_list = self.suffixes.join("' or '");
        OxcDiagnostic::error(format!(
            "Angular component class '{}' must have suffix '{}'",
            class_name, suffix_list
        ))
        .with_help(format!(
            "Rename the class to end with '{}' to follow Angular naming convention",
            suffix_list
        ))
        .with_label(span.label("Component class with missing suffix"))
    }

    fn has_valid_suffix(&self, class_name: &str) -> bool {
        self.suffixes
            .iter()
            .any(|suffix| class_name.ends_with(suffix))
    }

    fn is_component_decorator(&self, decorator: &Decorator) -> bool {
        match &decorator.expression {
            // Simple @Component decorator
            Expression::Identifier(ident) => ident.name.as_str() == "Component",
            // @Component({...}) decorator with configuration
            Expression::CallExpression(call_expr) => {
                if let Expression::Identifier(callee) = &call_expr.callee {
                    callee.name.as_str() == "Component"
                } else {
                    false
                }
            }
            _ => false,
        }
    }
}

impl<'a> Visit<'a> for ComponentClassVisitor {
    fn visit_class(&mut self, class: &Class<'a>) {
        // Check if class has @Component decorator
        let decorators = &class.decorators;
        if !decorators.is_empty() {
            for decorator in decorators {
                if self.is_component_decorator(decorator) {
                    // Get class name and check suffix
                    if let Some(id) = &class.id {
                        let class_name = id.name.as_str();
                        if !self.has_valid_suffix(class_name) {
                            self.diagnostics
                                .push(self.create_diagnostic(class_name, class.span));
                        }
                    }
                    break;
                }
            }
        }
    }
}

impl Rule for AngularComponentClassSuffixRule {
    fn name(&self) -> &'static str {
        "angular-component-class-suffix"
    }

    fn description(&self) -> &'static str {
        "Enforces that classes decorated with @Component have the suffix 'Component' (or custom suffix)"
    }

    fn set_config(&mut self, config: Value) {
        if let Some(obj) = config.as_object() {
            if let Some(suffixes) = obj.get("suffixes") {
                if let Some(suffix_array) = suffixes.as_array() {
                    self.suffixes = suffix_array
                        .iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect();
                }
            }
        }
    }

    fn run_on_node(&self, node: &AstKind, _span: Span) -> Vec<OxcDiagnostic> {
        let mut visitor = ComponentClassVisitor::new(self.suffixes.clone());

        match node {
            AstKind::Class(class) => {
                visitor.visit_class(class);
            }
            _ => {}
        }

        visitor.diagnostics
    }
}
