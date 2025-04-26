use oxc_ast::AstKind;
use oxc_ast::ast::{CallExpression, Class, ClassElement, Expression};
use oxc_ast_visit::Visit;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::Span;

use crate::rules::Rule;

/// Rule that prevents naming collisions between Angular outputs and native DOM events
pub struct AngularOutputEventCollisionRule {}

impl AngularOutputEventCollisionRule {
    pub fn new() -> Self {
        Self {}
    }
}

/// List of common DOM event names to check against
const DOM_EVENTS: &[&str] = &[
    "click", "dblclick", "mousedown", "mouseup", "mouseover", "mouseout", "mousemove",
    "keydown", "keypress", "keyup", "submit", "reset", "change", "focus", "blur",
    "load", "unload", "resize", "scroll", "select", "input", "contextmenu",
    "dragstart", "drag", "dragenter", "dragleave", "dragover", "drop", "dragend",
    "touchstart", "touchmove", "touchend", "touchcancel"
];

/// Visitor implementation that checks Angular output names
struct OutputEventVisitor {
    /// Collection of diagnostics found during AST traversal
    diagnostics: Vec<OxcDiagnostic>,
}

impl OutputEventVisitor {
    fn new() -> Self {
        Self {
            diagnostics: Vec::new(),
        }
    }

    fn create_diagnostic(span: Span, event_name: &str) -> OxcDiagnostic {
        OxcDiagnostic::error(format!("Output name '{}' collides with native DOM event", event_name))
            .with_help("Choose a different name to avoid confusion with native browser events")
            .with_label(span.label("Output declaration"))
    }
}

impl<'a> Visit<'a> for OutputEventVisitor {
    fn visit_class(&mut self, node: &Class<'a>) {
        // Iterate through class elements to find property definitions
        for element in &node.body.elements {
            if let ClassElement::PropertyDefinition(prop) = element {
                // Get the property name
                if let Some(Expression::Identifier(key)) = &prop.key {
                    let prop_name = key.name.as_str();
                    
                    // Check if this property's value is an output() call
                    if let Some(Expression::CallExpression(call)) = &prop.value {
                        if let Expression::Identifier(callee) = &call.callee {
                            if callee.name.as_str() == "output" && DOM_EVENTS.contains(&prop_name) {
                                self.diagnostics.push(Self::create_diagnostic(call.span, prop_name));
                            }
                        }
                    }
                }
            }
        }
    }
}

impl Rule for AngularOutputEventCollisionRule {
    fn name(&self) -> &'static str {
        "angular-output-event-collision"
    }

    fn description(&self) -> &'static str {
        "Prevents naming collisions between Angular outputs and native DOM events"
    }

    fn run_on_node(&self, node: &AstKind, _span: Span, _file_path: &str) -> Vec<OxcDiagnostic> {
        let mut visitor = OutputEventVisitor::new();
        
        match node {
            AstKind::Class(class) => {
                visitor.visit_class(class);
            }
            _ => {}
        }

        visitor.diagnostics
    }
}
