use crate::rules::custom::prop_key_name;
use oxc_ast::AstKind;
use oxc_ast::ast::{Argument, Class, Decorator, Expression, ObjectPropertyKind};
use oxc_ast_visit::Visit;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::Span;

use crate::rules::Rule;

/// Rule that enforces maximum lines in Angular component inline declarations
pub struct AngularObsoleteStandaloneTrueRule {}

impl AngularObsoleteStandaloneTrueRule {
    pub fn new() -> Self {
        Self {}
    }
}

/// Visitor implementation that checks inline declaration lengths
struct DecoratorPropertyVisitor {
    /// Collection of diagnostics found during AST traversal
    diagnostics: Vec<OxcDiagnostic>,
}

impl DecoratorPropertyVisitor {
    fn new() -> Self {
        Self {
            diagnostics: Vec::new(),
        }
    }

    fn create_diagnostic(&self, name: &str, span: Span) -> OxcDiagnostic {
        return OxcDiagnostic::error(format!("Obsolete 'standalone: true' property detected"))
            .with_help(format!(
                "you can safely remove this line when using angular 19+"
            )).with_label(span.label(format!("@{} WHAT? usage", name)))
    }

    fn is_component_decorator(&self, decorator: &Decorator) -> bool {
        match &decorator.expression {
            Expression::Identifier(ident) => ident.name.as_str() == "Component",
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

    fn check_component_properties(&mut self, decorator: &Decorator) -> bool {
        let Expression::CallExpression(call_expr) = &decorator.expression else {
            return false;
        };

        let Some(Argument::ObjectExpression(expr)) = call_expr.arguments.first() else {
            return true;
        };

        for property in &expr.properties {
            if let ObjectPropertyKind::ObjectProperty(loc_prop) = property {
                if prop_key_name(&loc_prop.key) == "standalone" {
                    let diagnostic = self.create_diagnostic("name", loc_prop.span);
                    self.diagnostics.push(diagnostic);
                }
            }
        }

        true
    }
}
impl<'a> Visit<'a> for DecoratorPropertyVisitor {
    fn visit_class(&mut self, class: &Class<'a>) {
        // Check if class has @Component decorator
        let decorators = &class.decorators;
        if !decorators.is_empty() {
            for decorator in decorators {
                if self.is_component_decorator(decorator) {
                    self.check_component_properties(&decorator);
                    break;
                }
            }
        }
    }
}

impl Rule for AngularObsoleteStandaloneTrueRule {
    fn name(&self) -> &'static str {
        "angular-obsolete-standalone-true"
    }

    fn description(&self) -> &'static str {
        "Alerts when standalone is set to true, because since v19 this is the default"
    }

    fn run_on_node(&self, node: &AstKind, _span: Span) -> Vec<OxcDiagnostic> {
        let mut visitor = DecoratorPropertyVisitor::new();

        match node {
            AstKind::Class(class) => {
                visitor.visit_class(class);
            }
            _ => {}
        }

        visitor.diagnostics
    }
}
