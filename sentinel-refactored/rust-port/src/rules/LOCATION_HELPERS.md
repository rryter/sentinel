# Source Location Helpers for Rules

This document describes the source location helpers that have been added to the Sentinel rules system to standardize how rules report the location of findings.

## Overview

Rules should provide location information about where in the source code a violation was found. This helps developers quickly locate and address issues. The `SourceLocation` struct in `src/rules/mod.rs` represents a location in source code:

```rust
pub struct SourceLocation {
    /// Line number (1-based)
    pub line: usize,
    /// Column number (1-based)
    pub column: usize,
    /// Start offset in the source text
    pub start: usize,
    /// End offset in the source text
    pub end: usize,
}
```

## Helper Function

To standardize how source locations are created from AST spans, we've added a helper function:

```rust
/// Helper function to create a SourceLocation from an oxc AST span
pub fn create_source_location(span: &oxc_ast::span::Span) -> SourceLocation {
    SourceLocation {
        line: span.start_line,
        column: span.start_column,
        start: span.start,
        end: span.end,
    }
}
```

## Usage in Rules

Rules should use this helper function to create source locations. Here's a typical pattern:

1. Track spans in your visitor that detects issues:

```rust
struct MyRuleFinder {
    // ... other fields ...
    spans: Vec<Span>, // Store spans for location information
}
```

2. While visiting AST nodes, store spans when issues are found:

```rust
fn visit_some_node(&mut self, node: &SomeNode<'a>) {
    if /* issue detected */ {
        self.spans.push(node.span);
    }
}
```

3. In the `evaluate` method, use the helper to create location information:

```rust
fn evaluate(&self, program: &Program, file_path: &str) -> Result<RuleMatch> {
    // ... rule logic ...

    // Set location using the first found issue's span
    let location = if !finder.spans.is_empty() {
        Some(create_source_location(&finder.spans[0]))
    } else {
        None
    };

    // ... create RuleMatch ...
}
```

4. For multiple occurrences, consider adding additional locations as metadata:

```rust
if finder.spans.len() > 1 {
    let additional_locations = finder.spans.iter().skip(1)
        .map(|span| format!("{}:{}", span.start_line, span.start_column))
        .collect::<Vec<_>>()
        .join(";");
    metadata.insert("additional_locations".to_string(), additional_locations);
}
```

## Rules Using This Pattern

The following rules have been updated to use the source location helper:

1. `TypeScriptAssertionDetectionRule` - Detects TypeScript type assertions
2. `AngularDecoratorDetectionRule` - Detects Angular decorators
3. `ImportRule` (RxJS rules) - Detects imports from specific modules

When implementing new rules, please follow this pattern to ensure consistent location reporting across the codebase.
