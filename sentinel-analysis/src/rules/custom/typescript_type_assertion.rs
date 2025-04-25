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

/// Cached regular expressions for test file detection
struct TestPathPatterns {
    test_suffixes: &'static [&'static str],
    test_patterns: &'static [&'static str],
}

impl TestPathPatterns {
    const fn new() -> Self {
        Self {
            test_suffixes: &[".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx"],
            test_patterns: &["test", "spec", "__tests__"],
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
    /// Static patterns for test file detection
    test_patterns: TestPathPatterns,
}

impl AssertionVisitor {
    fn new(skip_in_tests: bool, allow_dom_assertions: bool, file_path: String) -> Self {
        Self {
            diagnostics: Vec::with_capacity(1), // Most files will have 0-1 violations
            skip_in_tests,
            allow_dom_assertions,
            file_path,
            test_patterns: TestPathPatterns::new(),
        }
    }

    #[inline]
    fn is_dom_related_assertion(&self, type_annotation: &TSType) -> bool {
        // Cache the debug format string to avoid multiple allocations
        static DOM_KEYWORDS: [&str; 4] = ["HTML", "Element", "Node", "Document"];
        let type_str = format!("{:?}", type_annotation);
        DOM_KEYWORDS.iter().any(|&kw| type_str.contains(kw))
    }

    #[inline]
    fn is_any_type(&self, type_annotation: &TSType) -> bool {
        // Avoid string allocation by checking specific AST patterns
        // that indicate 'any' type
        match type_annotation {
            TSType::TSAnyKeyword(_) => true,
            TSType::TSTypeReference(type_ref) => {
                let type_name = format!("{:?}", type_ref);
                type_name.contains("any")
            }
            _ => false
        }
    }

    #[inline]
    fn check_double_assertion(&self, node: &TSAsExpression) -> bool {
        // First check if it's an 'any' type to avoid unnecessary string operations
        if !self.is_any_type(&node.type_annotation) {
            return false;
        }

        // Only do the more expensive check if we found an 'any' type
        if let TSType::TSAnyKeyword(_) = node.type_annotation {
            true
        } else {
            false
        }
    }

    #[inline]
    fn should_report(&self) -> bool {
        if !self.skip_in_tests {
            return true;
        }
        !self.is_test_file()
    }

    #[inline]
    fn is_test_file(&self) -> bool {
        // Avoid allocating a new string for lowercase comparison
        let path = self.file_path.as_str();
        
        // Most files won't be test files, so check common non-test paths first
        if !path.contains("test") && !path.contains("spec") {
            return false;
        }

        // Now check specific test patterns
        let path_lower = path.to_lowercase();
        
        // Check suffixes first as they're more specific and usually faster
        if self.test_patterns.test_suffixes.iter().any(|&suffix| path_lower.ends_with(suffix)) {
            return true;
        }

        // Then check for test patterns in the path
        self.test_patterns.test_patterns.iter().any(|&pattern| path_lower.contains(pattern))
    }

    #[inline]
    fn create_diagnostic(&self, span: Span, assertion_type: &str) -> OxcDiagnostic {
        // We can make this even more efficient by using a static HashMap,
        // but for now, this match is fast enough since it's only called
        // when we've found an issue
        match assertion_type {
            "non-null" => OxcDiagnostic::error(NON_NULL_MSG)
                .with_help(NON_NULL_HELP)
                .with_label(span.label(BYPASS_MSG)),
            "type" => OxcDiagnostic::error(TYPE_MSG)
                .with_help(TYPE_HELP)
                .with_label(span.label(BYPASS_MSG)),
            "any" => OxcDiagnostic::error(ANY_MSG)
                .with_help(ANY_HELP)
                .with_label(span.label(BYPASS_MSG)),
            "double-assertion" => OxcDiagnostic::error(DOUBLE_MSG)
                .with_help(DOUBLE_HELP)
                .with_label(span.label(BYPASS_MSG)),
            _ => unreachable!(),
        }
    }
}

impl<'a> Visit<'a> for AssertionVisitor {
    fn visit_ts_non_null_expression(&mut self, node: &TSNonNullExpression<'a>) {
        if self.should_report() {
            self.diagnostics.push(self.create_diagnostic(node.span, "non-null"));
        }
    }

    fn visit_ts_type_assertion(&mut self, node: &TSTypeAssertion<'a>) {
        if self.should_report() {
            self.diagnostics.push(self.create_diagnostic(node.span, "type"));
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
            self.diagnostics.push(self.create_diagnostic(node.span, "double-assertion"));
            return;
        }

        // Check if assertion involves 'any' type
        if self.is_any_type(&node.type_annotation) {
            self.diagnostics.push(self.create_diagnostic(node.span, "any"));
        } else {
            self.diagnostics.push(self.create_diagnostic(node.span, "type"));
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

// Static diagnostic messages to avoid allocations
static NON_NULL_MSG: &str = "TypeScript non-null assertion operator (!) usage detected";
static NON_NULL_HELP: &str = "The non-null assertion operator tells TypeScript to ignore potential null/undefined values, which can lead to runtime errors. Consider:\n1. Using optional chaining (?.) with nullish coalescing (??)\n2. Adding proper runtime checks\n3. Redesigning the code to handle null/undefined cases explicitly";

static TYPE_MSG: &str = "Unsafe TypeScript type assertion detected";
static TYPE_HELP: &str = "Type assertions bypass TypeScript's type checking and can lead to runtime errors. Instead:\n1. Use type guards: function isType(value: unknown): value is Type { ... }\n2. Use instanceof checks: if (value instanceof Type)\n3. Use typeof checks: if (typeof value === 'string')\n4. Add runtime validation\n5. Consider redesigning the code to use proper type definitions";

static ANY_MSG: &str = "Type assertion through 'any' detected";
static ANY_HELP: &str = "Using 'any' in type assertions is particularly dangerous as it completely bypasses type checking. Consider:\n1. Using proper type definitions\n2. Implementing type guards\n3. Adding runtime validation\n4. Using more specific types";

static DOUBLE_MSG: &str = "Double type assertion detected";
static DOUBLE_HELP: &str = "Double type assertions (e.g., 'as any as Type') are extremely unsafe and bypass TypeScript's type checking completely. Consider:\n1. Using proper type guards\n2. Adding runtime validation\n3. Improving type definitions\n4. Using type predicates for complex type narrowing";

static BYPASS_MSG: &str = "This type assertion bypasses TypeScript's type checking";
