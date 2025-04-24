use oxc_ast::AstKind;
use oxc_ast::ast::{TSAsExpression, TSNonNullExpression, TSType, TSTypeAssertion};
use oxc_ast_visit::Visit;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::Span;
use serde_json::Value;

use crate::rules::Rule;

/// Rule that detects usage of TypeScript's type assertions and non-null assertion operator
///
/// This rule flags potentially unsafe type assertions and non-null assertions which can lead to runtime errors
/// if used incorrectly. While type assertions might seem convenient, they bypass TypeScript's type checking
/// and can mask potential type issues that should be handled explicitly.
///
/// Type assertions can make code:
/// - Less safe by bypassing TypeScript's type checking
/// - Harder to maintain and understand
/// - More difficult to refactor
/// - More prone to runtime errors
///
/// ## Rule Details
///
/// Examples of **incorrect** code:
///
/// ```typescript
/// // Risky: Type assertion without validation
/// const userInput = someValue as User;
///
/// // Dangerous: Double assertion
/// const value = foo as any as SpecificType;
///
/// // Unsafe: Non-null assertion
/// const element = document.querySelector('.foo')!;
///
/// // Risky: Type assertion on unknown input
/// const data = JSON.parse(input) as MyType;
/// ```
///
/// Examples of **correct** code:
///
/// ```typescript
/// // Safe: Use type guard with proper runtime checks
/// function isUser(value: unknown): value is User {
///   return value &&
///          typeof value === 'object' &&
///          'id' in value &&
///          typeof value.id === 'string';
/// }
/// if (isUser(someValue)) {
///   const user = someValue; // TypeScript knows it's User
/// }
///
/// // Better: Runtime validation with instanceof
/// const element = document.querySelector('.foo');
/// if (element instanceof HTMLElement) {
///   element.classList.add('active'); // Safe - TypeScript knows the type
/// }
///
/// // Good: Use type narrowing with typeof
/// function processValue(value: unknown) {
///   if (typeof value === 'string') {
///     return value.toUpperCase(); // Safe - TypeScript knows it's string
///   }
///   return String(value);
/// }
///
/// // Best: Validate parsed JSON with proper type checking
/// function validateMyType(data: unknown): MyType {
///   if (!data || typeof data !== 'object') throw new Error('Invalid data');
///   // ... proper validation logic
///   return data as MyType; // Safe after validation
/// }
/// const data = validateMyType(JSON.parse(input));
/// ```
///
/// ## When Not To Use It
///
/// - In test files where type safety is less critical (configure with `skipInTests`)
/// - When working with DOM APIs where type assertions are sometimes unavoidable (configure with `allowDomAssertions`)
/// - In rare cases where TypeScript's type inference isn't sophisticated enough
///
/// ## Rule Options
///
/// - `skipInTests`: Set to `true` to disable the rule in test files (default: false)
/// - `allowDomAssertions`: Set to `true` to allow type assertions on DOM elements (default: true)
///
/// ## Best Practices
///
/// Instead of type assertions, prefer:
/// 1. Type guards with runtime validation
/// 2. instanceof checks for class instances
/// 3. typeof checks for primitives
/// 4. in operator for object property checks
/// 5. Array.isArray() for arrays
/// 6. Proper error handling instead of non-null assertions
pub struct TypeScriptAssertionRule {
    /// Whether to skip checking assertions in test files
    skip_in_tests: bool,
    /// Whether to allow type assertions in specific patterns (like DOM queries)
    allow_dom_assertions: bool,
}

impl TypeScriptAssertionRule {
    pub fn new() -> Self {
        Self {
            skip_in_tests: false,
            allow_dom_assertions: true,
        }
    }
}

/// Visitor implementation that tracks type assertions usage
struct AssertionVisitor {
    /// Collection of diagnostics found during AST traversal
    diagnostics: Vec<OxcDiagnostic>,
    /// Whether to skip assertions in tests
    skip_in_tests: bool,
    /// Whether to allow DOM-related assertions
    allow_dom_assertions: bool,
    /// Current file path being analyzed
    file_path: String,
}

impl AssertionVisitor {
    fn new(skip_in_tests: bool, allow_dom_assertions: bool, file_path: String) -> Self {
        Self {
            diagnostics: Vec::new(),
            skip_in_tests,
            allow_dom_assertions,
            file_path,
        }
    }

    fn is_dom_related_assertion(&self, type_annotation: &TSType) -> bool {
        // Check if the assertion involves DOM types like HTMLElement, Element, Node, etc.
        let type_name = format!("{:?}", type_annotation);
        type_name.contains("HTML")
            || type_name.contains("Element")
            || type_name.contains("Node")
            || type_name.contains("Document")
    }

    fn is_any_type(&self, type_annotation: &TSType) -> bool {
        // Use debug format to check for "any" type
        format!("{:?}", type_annotation).contains("any")
    }

    fn check_double_assertion(&self, node: &TSAsExpression) -> bool {
        // For now, we'll detect double assertions by checking if they use 'any'
        self.is_any_type(&node.type_annotation)
    }

    fn should_report(&self) -> bool {
        !(self.skip_in_tests && self.is_test_file())
    }

    fn is_test_file(&self) -> bool {
        let path = self.file_path.to_lowercase();
        path.contains("test")
            || path.contains("spec")
            || path.contains("__tests__")
            || path.ends_with(".test.ts")
            || path.ends_with(".test.tsx")
            || path.ends_with(".spec.ts")
            || path.ends_with(".spec.tsx")
    }

    fn create_assertion_diagnostic(&self, span: Span, assertion_type: &str) -> OxcDiagnostic {
        let (message, help) = match assertion_type {
            "non-null" => (
                "TypeScript non-null assertion operator (!) usage detected",
                "The non-null assertion operator tells TypeScript to ignore potential null/undefined values, which can lead to runtime errors. Consider:\n1. Using optional chaining (?.) with nullish coalescing (??)\n2. Adding proper runtime checks\n3. Redesigning the code to handle null/undefined cases explicitly",
            ),
            "type" => (
                "Unsafe TypeScript type assertion detected",
                "Type assertions bypass TypeScript's type checking and can lead to runtime errors. Instead:\n1. Use type guards: function isType(value: unknown): value is Type { ... }\n2. Use instanceof checks: if (value instanceof Type)\n3. Use typeof checks: if (typeof value === 'string')\n4. Add runtime validation\n5. Consider redesigning the code to use proper type definitions",
            ),
            "any" => (
                "Type assertion through 'any' detected",
                "Using 'any' in type assertions is particularly dangerous as it completely bypasses type checking. Consider:\n1. Using proper type definitions\n2. Implementing type guards\n3. Adding runtime validation\n4. Using more specific types",
            ),
            "double-assertion" => (
                "Double type assertion detected",
                "Double type assertions (e.g., 'as any as Type') are extremely unsafe and bypass TypeScript's type checking completely. Consider:\n1. Using proper type guards\n2. Adding runtime validation\n3. Improving type definitions\n4. Using type predicates for complex type narrowing",
            ),
            _ => unreachable!(),
        };

        OxcDiagnostic::error(message)
            .with_help(help)
            .with_label(span.label("This type assertion bypasses TypeScript's type checking"))
    }
}

impl<'a> Visit<'a> for AssertionVisitor {
    fn visit_ts_non_null_expression(&mut self, node: &TSNonNullExpression<'a>) {
        if self.should_report() {
            self.diagnostics
                .push(self.create_assertion_diagnostic(node.span, "non-null"));
        }
    }

    fn visit_ts_type_assertion(&mut self, node: &TSTypeAssertion<'a>) {
        if self.should_report() {
            self.diagnostics
                .push(self.create_assertion_diagnostic(node.span, "type"));
        }
    }

    fn visit_ts_as_expression(&mut self, node: &TSAsExpression<'a>) {
        if !self.should_report() {
            return;
        }

        // Skip DOM-related assertions if allowed
        if self.allow_dom_assertions && self.is_dom_related_assertion(&node.type_annotation) {
            return;
        }

        // Check for 'any' type assertions (simplified double assertion check)
        if self.check_double_assertion(node) {
            self.diagnostics
                .push(self.create_assertion_diagnostic(node.span, "double-assertion"));
            return;
        }

        // Check if assertion involves 'any' type
        if self.is_any_type(&node.type_annotation) {
            self.diagnostics
                .push(self.create_assertion_diagnostic(node.span, "any"));
        } else {
            self.diagnostics
                .push(self.create_assertion_diagnostic(node.span, "type"));
        }
    }
}

impl Rule for TypeScriptAssertionRule {
    fn name(&self) -> &'static str {
        "typescript-type-assertion"
    }

    fn description(&self) -> &'static str {
        "Disallows unsafe TypeScript type assertions and non-null assertions"
    }

    fn set_config(&mut self, config: Value) {
        if let Some(obj) = config.as_object() {
            if let Some(skip_tests) = obj.get("skipInTests").and_then(Value::as_bool) {
                self.skip_in_tests = skip_tests;
            }
            if let Some(allow_dom) = obj.get("allowDomAssertions").and_then(Value::as_bool) {
                self.allow_dom_assertions = allow_dom;
            }
        }
    }

    fn run_on_node(&self, node: &AstKind, _span: Span, file_path: &str) -> Vec<OxcDiagnostic> {
        let mut visitor = AssertionVisitor::new(
            self.skip_in_tests,
            self.allow_dom_assertions,
            file_path.to_string(),
        );
        match node {
            AstKind::TSNonNullExpression(n) => visitor.visit_ts_non_null_expression(n),
            AstKind::TSTypeAssertion(n) => visitor.visit_ts_type_assertion(n),
            AstKind::TSAsExpression(n) => visitor.visit_ts_as_expression(n),
            _ => {}
        }
        visitor.diagnostics
    }
}
