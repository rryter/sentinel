# Type Guards

## The Problem

We needed to create a type-safe guard for checking if a value matches our `AccidentContext` type.

## Initial Setup

```typescript
export const accidentContexts = ['work', 'way-to-work', 'outside-work'] as const;
export type AccidentContext = (typeof accidentContexts)[number];
```

This approach had limitations:

- Required array-to-type conversion
- Less explicit about valid values
- Required type assertions in the guard

## Evolution of Solutions

### 1. Array-based with Type Assertion

```typescript
export function isAccidentContext(value: unknown): value is AccidentContext {
  if (typeof value !== 'string') return false;
  return accidentContexts.includes(value as AccidentContext);
}
```

Problems:

- Required type assertion
- Not truly type-safe
- Used array operations

### 2. Const Object First Attempt

```typescript
export const accidentContext = {
  work: 'work',
  wayToWork: 'way-to-work',
  outside: 'outside',
} as const;
```

Better because:

- Creates a type-safe "enum-like" structure
- Provides autocompletion
- Centralizes string literals

### 3. Object Values Check

```typescript
export function isAccidentContext(value: unknown): value is AccidentContext {
  return typeof value === 'string' && Object.values(accidentContext).includes(value as AccidentContext);
}
```

Problems:

- Still needed type assertion
- Checked values instead of keys
- Not strict enough (allowed any string to be checked)

### 4. Explicit Value Checking

```typescript
export function isAccidentContext(value: unknown): value is AccidentContext {
  if (typeof value !== 'string') return false;
  return value === accidentContext.work || value === accidentContext.wayToWork || value === accidentContext.outside;
}
```

Problems:

- Verbose
- Required manual maintenance
- Not DRY

### 5. Final Solution: Using `in` Operator

```typescript
export function isAccidentContext(value: unknown): value is AccidentContext {
  return typeof value === 'string' && value in accidentContext;
}
```

Benefits:

- Leverages TypeScript's type system
- No type assertions needed
- Uses native JavaScript `in` operator
- Perfectly type-safe
- Concise and maintainable
- Checks against object keys instead of values

## Key Learnings

1. Prefer const objects over arrays for defining string literal unions
2. Use TypeScript's built-in type narrowing when possible
3. Avoid type assertions when possible
4. The `in` operator provides both runtime checking and type safety
5. Working with the type system is better than working around it

## Best Practice

Define constants as const objects and use the `in` operator for type guards when dealing with string literal unions.
