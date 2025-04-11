use crate::rules::custom::prop_key_name;
use crate::rules::Rule;
use oxc_ast::ast::{
    Argument, CallExpression, Class, Decorator, Expression, ObjectPropertyKind, PropertyKey,
    TemplateLiteral,
};
use oxc_ast::AstKind;
use oxc_ast_visit::Visit;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::{GetSpan, Span};
use serde_json::Value;

/// Rule that enforces maximum lines in Angular component inline declarations
///
/// This rule ensures that inline template, styles and animations in @Component decorators
/// don't exceed the specified maximum number of lines.
///
/// ## Rule Details
///
/// By default:
/// - template: maximum 3 lines
/// - styles: maximum 3 lines
/// - animations: maximum 15 lines
///
/// Examples of **incorrect** code:
///
/// ```typescript
/// @Component({
///   template: `
///     <div>line 1</div>
///     <div>line 2</div>
///     <div>line 3</div>
///     <div>line 4</div>  // exceeds max 3 lines
///   `
/// })
/// ```
///
/// Examples of **correct** code:
///
/// ```typescript
/// @Component({
///   template: `
///     <div>line 1</div>
///     <div>line 2</div>
///     <div>line 3</div>
///   `
/// })
/// ```
pub struct AngularComponentMaxInlineDeclarationsRule {
    max_template_lines: usize,
    max_styles_lines: usize,
    max_animations_lines: usize,
}

impl AngularComponentMaxInlineDeclarationsRule {
    pub fn new() -> Self {
        Self {
            max_template_lines: 3,    // Default value
            max_styles_lines: 3,      // Default value
            max_animations_lines: 15, // Default value
        }
    }

    fn count_lines(content: &str) -> usize {
        content.lines().count()
    }
}

/// Visitor implementation that checks inline declaration lengths
struct InlineDeclarationsVisitor {
    /// Collection of diagnostics found during AST traversal
    diagnostics: Vec<OxcDiagnostic>,
    /// Maximum allowed lines
    max_template_lines: usize,
    max_styles_lines: usize,
    max_animations_lines: usize,
}

impl InlineDeclarationsVisitor {
    fn new(max_template: usize, max_styles: usize, max_animations: usize) -> Self {
        Self {
            diagnostics: Vec::new(),
            max_template_lines: max_template,
            max_styles_lines: max_styles,
            max_animations_lines: max_animations,
        }
    }

    fn create_diagnostic(
        &self,
        property: &str,
        lines: usize,
        max_lines: usize,
        span: Span,
    ) -> OxcDiagnostic {
        OxcDiagnostic::error(format!(
            "Inline {} has {} lines which exceeds the maximum allowed length of {} lines",
            property, lines, max_lines
        ))
        .with_help(format!(
            "Consider moving the {} content to a separate file or reducing its size",
            property
        ))
        .with_label(span.label(&format!("Inline {} exceeds maximum length", property)))
    }

    fn check_template(&mut self, template: &str, span: Span) {
        let lines = AngularComponentMaxInlineDeclarationsRule::count_lines(template);
        if lines > self.max_template_lines {
            self.diagnostics.push(self.create_diagnostic(
                "template",
                lines,
                self.max_template_lines,
                span,
            ));
        }
    }

    fn check_styles(&mut self, styles: &str, span: Span) {
        let lines = AngularComponentMaxInlineDeclarationsRule::count_lines(styles);
        if lines > self.max_styles_lines {
            self.diagnostics.push(self.create_diagnostic(
                "styles",
                lines,
                self.max_styles_lines,
                span,
            ));
        }
    }

    fn check_animations(&mut self, animations: &str, span: Span) {
        let lines = AngularComponentMaxInlineDeclarationsRule::count_lines(animations);
        if lines > self.max_animations_lines {
            self.diagnostics.push(self.create_diagnostic(
                "animations",
                lines,
                self.max_animations_lines,
                span,
            ));
        }
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
        match &decorator.expression {
            Expression::CallExpression(call_expr) => {
                // first() returns an Option<&Argument>, so we need to handle that
                if let Some(arg) = call_expr.arguments.first() {
                    // Now we need to match on the argument type
                    if let Argument::ObjectExpression(expr) = arg {
                        // Now we can match on the expression
                        // println!("debugg::: {}", expr.properties.len());

                        for property in &expr.properties {
                            if let ObjectPropertyKind::ObjectProperty(locProp) = property {
                                let name = prop_key_name(&locProp.key);
                                //println!("debugg:::{}", name);
                                //println!("debugg:::{}", locProp.span().start);
                                //println!("debugg:::{}", locProp.span().end);
                            }
                        }
                    }
                }
                true
            }
            _ => false,
        }
    }
}

impl<'a> Visit<'a> for InlineDeclarationsVisitor {
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

impl Rule for AngularComponentMaxInlineDeclarationsRule {
    fn name(&self) -> &'static str {
        "angular-component-max-inline-declarations"
    }

    fn description(&self) -> &'static str {
        "Enforces maximum number of lines in inline template, styles and animations"
    }

    fn set_config(&mut self, config: Value) {
        if let Some(obj) = config.as_object() {
            if let Some(template) = obj.get("template").and_then(Value::as_u64) {
                self.max_template_lines = template as usize;
            }
            if let Some(styles) = obj.get("styles").and_then(Value::as_u64) {
                self.max_styles_lines = styles as usize;
            }
            if let Some(animations) = obj.get("animations").and_then(Value::as_u64) {
                self.max_animations_lines = animations as usize;
            }
        }
    }

    fn run_on_node(&self, node: &AstKind, _span: Span) -> Vec<OxcDiagnostic> {
        let mut visitor = InlineDeclarationsVisitor::new(
            self.max_template_lines,
            self.max_styles_lines,
            self.max_animations_lines,
        );

        match node {
            AstKind::Class(class) => {
                visitor.visit_class(class);
            }
            _ => {}
        }

        visitor.diagnostics
    }
}
