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
pub struct AngularComponentClassSuffixRule {
    /// List of allowed component class suffixes
    suffixes: Vec<&'static str>,
    /// Cached formatted suffix list for error messages
    formatted_suffixes: String,
}

impl AngularComponentClassSuffixRule {
    pub fn new() -> Self {
        let suffixes = vec!["Component"];
        Self {
            formatted_suffixes: Self::format_suffix_list(&suffixes),
            suffixes,
        }
    }

    fn format_suffix_list(suffixes: &[&str]) -> String {
        suffixes.join("' or '")
    }
}

/// Visitor implementation that checks Angular component class names
struct ComponentClassVisitor<'a> {
    /// Collection of diagnostics found during AST traversal
    diagnostics: Vec<OxcDiagnostic>,
    /// List of allowed suffixes
    suffixes: &'a [&'static str],
    /// Pre-formatted suffix list for error messages
    formatted_suffixes: &'a str,
}

impl<'a> ComponentClassVisitor<'a> {
    #[inline]
    fn new(rule: &'a AngularComponentClassSuffixRule) -> Self {
        Self {
            diagnostics: Vec::with_capacity(1),
            suffixes: &rule.suffixes,
            formatted_suffixes: &rule.formatted_suffixes,
        }
    }

    #[inline]
    fn create_diagnostic(&self, class_name: &str, span: Span) -> OxcDiagnostic {
        OxcDiagnostic::error(format!(
            "Angular component class '{}' must have suffix '{}'",
            class_name, self.formatted_suffixes
        ))
        .with_help(format!(
            "Rename the class to end with '{}' to follow Angular naming convention",
            self.formatted_suffixes
        ))
        .with_label(span.label("Component class with missing suffix"))
    }

    #[inline]
    fn has_valid_suffix(&self, class_name: &str) -> bool {
        // Using iterator is more efficient than collecting into a temporary Vec
        self.suffixes
            .iter()
            .any(|&suffix| class_name.ends_with(suffix))
    }

    #[inline]
    fn is_component_decorator(&self, decorator: &Decorator) -> bool {
        static COMPONENT: &str = "Component";
        match &decorator.expression {
            Expression::Identifier(ident) => ident.name.as_str() == COMPONENT,
            Expression::CallExpression(call_expr) => {
                matches!(&call_expr.callee, Expression::Identifier(callee) if callee.name.as_str() == COMPONENT)
            }
            _ => false,
        }
    }
}

impl<'a> Visit<'a> for ComponentClassVisitor<'a> {
    fn visit_class(&mut self, class: &Class<'a>) {
        // Fast path if there are no decorators
        if class.decorators.is_empty() {
            return;
        }

        // Check if class has @Component decorator
        if class
            .decorators
            .iter()
            .any(|d| self.is_component_decorator(d))
        {
            // Get class name and check suffix
            if let Some(id) = &class.id {
                let class_name = id.name.as_str();
                if !self.has_valid_suffix(class_name) {
                    self.diagnostics
                        .push(self.create_diagnostic(class_name, class.span));
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
                    // Convert to static strings at config time, not runtime
                    self.suffixes = suffix_array
                        .iter()
                        .filter_map(|v| v.as_str())
                        .map(|s| Box::leak(s.to_string().into_boxed_str()) as &'static str)
                        .collect();
                    // Update formatted suffixes
                    self.formatted_suffixes = Self::format_suffix_list(&self.suffixes);
                }
            }
        }
    }

    fn run_on_node(&self, _node: &AstKind, _span: Span, _file_path: &str) -> Vec<OxcDiagnostic> {
        match _node {
            AstKind::Class(class) => {
                let mut visitor = ComponentClassVisitor::new(self);
                visitor.visit_class(class);
                visitor.diagnostics
            }
            _ => Vec::new(),
        }
    }
}
