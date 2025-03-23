---
title: "Avoid TypeScript Type Assertions"
description: "Type assertions in TypeScript can lead to runtime errors and should be minimized."
severity: "medium"
filePattern: "**/*.{ts,tsx}"
language: "typescript"
---

# Avoid TypeScript Type Assertions

Type assertions in TypeScript can be powerful tools, but their use should be cautiously approached.

## Problem Description

Type assertions (using `as` syntax or angle brackets `<Type>`) bypass TypeScript's type checking system, potentially leading to runtime errors. This rule identifies type assertions that could be replaced with safer alternatives.

## Examples of Problematic Patterns

```typescript
// Using 'as' keyword for type assertion

const inputElement = document.querySelector("input") as HTMLInputElement;

// Using angle bracket syntax
const buttonElement = <HTMLButtonElement>document.querySelector("button");

// Asserting to 'any' or 'unknown'
const data = someValue as any;

// Double assertion
const value = obj as unknown as SpecificType;
```

## Best Practices

1. **Use Type Guards**: Implement runtime type checks instead of assertions.

```typescript
// Better approach with type guard
function isHTMLInputElement(
  element: Element | null
): element is HTMLInputElement {
  return element !== null && element.tagName === "INPUT";
}

const element = document.querySelector("input");
if (isHTMLInputElement(element)) {
  // TypeScript knows element is HTMLInputElement here
  element.value = "New value";
}
```

2. **Leverage Type Inference**: Let TypeScript infer types when possible.

3. **Use Proper Typing**: Define interfaces and types for your data structures.

## Exceptions

Type assertions are acceptable in these scenarios:

- Working with libraries that lack type definitions
- Narrowing types in complex scenarios where type guards are impractical
- Interacting with APIs that return broadly typed results

## Impact

- **Safety**: High - Removing type assertions reduces runtime errors
- **Maintainability**: Medium - Code becomes more explicit about types
- **Performance**: None - This is a compile-time concern only
