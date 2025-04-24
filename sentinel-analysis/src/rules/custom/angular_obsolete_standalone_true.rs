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
    diagnostics: Option<Vec<OxcDiagnostic>>,
}

impl DecoratorPropertyVisitor {
    const COMPONENT: &'static str = "Component";
    const STANDALONE: &'static str = "standalone";

    fn new() -> Self {
        Self { diagnostics: None }
    }

    #[inline]
    fn create_diagnostic(&mut self, span: Span) -> OxcDiagnostic {
        // Static strings for better performance
        static ERROR_MSG: &str = "Obsolete 'standalone: true' property detected";
        static HELP_MSG: &str = "you can safely remove this line when using angular 19+";
        static LABEL_MSG: &str = "@Component usage";

        OxcDiagnostic::error(ERROR_MSG)
            .with_help(HELP_MSG)
            .with_label(span.label(LABEL_MSG))
    }

    #[inline]
    fn is_component_decorator(&self, decorator: &Decorator) -> bool {
        match &decorator.expression {
            Expression::Identifier(ident) => ident.name.as_str() == Self::COMPONENT,
            Expression::CallExpression(call_expr) => {
                matches!(&call_expr.callee, Expression::Identifier(callee) if callee.name.as_str() == Self::COMPONENT)
            }
            _ => false,
        }
    }

    fn check_component_properties(&mut self, decorator: &Decorator) -> bool {
        // Match and early return if not a CallExpression
        let Expression::CallExpression(call_expr) = &decorator.expression else {
            return false;
        };

        // Match and early return if no object expression argument
        let Some(Argument::ObjectExpression(expr)) = call_expr.arguments.first() else {
            return true;
        };

        // Early return if no properties to check
        if expr.properties.is_empty() {
            return true;
        }

        // Use find() instead of for loop for better performance and cleaner code
        if let Some(ObjectPropertyKind::ObjectProperty(loc_prop)) = expr.properties.iter().find(|prop| {
            matches!(prop, ObjectPropertyKind::ObjectProperty(p) if prop_key_name(&p.key) == Self::STANDALONE)
        }) {
            // Create diagnostic first to avoid multiple mutable borrows
            let diagnostic = self.create_diagnostic(loc_prop.span);

            // Only allocate Vec when we find a violation
            if self.diagnostics.is_none() {
                self.diagnostics = Some(Vec::with_capacity(1));
            }

            // Now push the already created diagnostic
            self.diagnostics.as_mut().unwrap().push(diagnostic);
            false // Return false to indicate we found a violation
        } else {
            true // Return true if no violation found
        }
    }
}

impl<'a> Visit<'a> for DecoratorPropertyVisitor {
    fn visit_class(&mut self, class: &Class<'a>) {
        // Optimize decorator lookup by avoiding iterator methods
        for decorator in &class.decorators {
            if self.is_component_decorator(decorator) {
                self.check_component_properties(decorator);
                break; // Exit early once we find and process the Component decorator
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

    fn run_on_node(&self, _node: &AstKind, _span: Span, _file_path: &str) -> Vec<OxcDiagnostic> {
        let mut visitor = DecoratorPropertyVisitor::new();

        if let AstKind::Class(class) = _node {
            visitor.visit_class(class);
        }

        // Avoid unnecessary allocation if there are no diagnostics
        visitor.diagnostics.unwrap_or_default()
    }
}
