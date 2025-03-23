# Avoid Type Assertions When Possible

## Description

Type assertions in TypeScript can be powerful tools, but their use should be cautiously approached. Type assertions (using `as Type` or `<Type>` syntax) effectively tell the TypeScript compiler to trust your judgment rather than verifying type compatibility itself.

## Reasons to Avoid Type Assertions

1. **Safety and Type Checking**: TypeScript's type system is designed to catch errors at compile time. By using type assertions, you're telling the compiler to trust you, potentially bypassing type checks. This can lead to runtime errors if the assertion is incorrect.

2. **Code Maintainability**: Type assertions can make your code harder to understand and maintain. Other developers (or even yourself at a later time) may not easily understand why a particular assertion was made, especially if it's incorrect or unnecessary.

3. **Refactoring Issues**: When you refactor your code, type assertions might not automatically adjust to new types, leading to subtle bugs. TypeScript's type inference and checking can adapt better to changes, helping to catch issues early.

4. **Potential for Hidden Bugs**: Incorrect type assertions can hide bugs. For example, asserting that an object has a certain shape when it does not can lead to undefined behavior and errors that are hard to trace.

5. **Encouraging Good Practices**: Relying on type assertions can be a crutch that discourages proper type design and validation. Avoiding assertions encourages better type definitions, interfaces, and overall type safety practices.

## When Type Assertions Are Appropriate

While it's often better to avoid type assertions, there are situations where they are necessary:

1. **Type Narrowing**: When you are certain about the type in a specific context, but TypeScript cannot infer it. For example, when working with DOM elements:

```typescript
const inputElement = document.querySelector('input') as HTMLInputElement;
```

2. **Interoperability**: When integrating with third-party libraries that are not typed or are loosely typed, and you need to assert specific types.

3. **Complex Type Scenarios**: In advanced type scenarios where TypeScript's inference falls short, you need to guide the compiler.

## Best Practices

To minimize risks associated with type assertions, consider the following best practices:

1. **Use Type Guards**: Use type guards to narrow down types at runtime safely. This avoids the need for assertions by providing TypeScript with runtime information.

```typescript
function isHTMLElement(element: any): element is HTMLElement {
  return element instanceof HTMLElement;
}

const element = document.getElementById('myElement');
if (isHTMLElement(element)) {
  // TypeScript now knows element is an HTMLElement
}
```

2. **Type Inference**: Leverage TypeScript's powerful type inference as much as possible. Explicitly declare types only when necessary, particularly for function return types.

3. **Minimize Assertions**: Use assertions sparingly and only when confident about the type. Always try to validate data through checks and guards instead.

4. **Document Assertions**: When you use type assertions, comment on why the assertion is necessary. This helps other developers understand your rationale.

```typescript
// Using type assertion because the API always returns a Product object
// even though the return type is defined as unknown
const product = fetchProduct(id) as Product;
```

## Detection Patterns

The rule detects the following patterns:

```typescript
// Type assertion using 'as' syntax
const value = expression as Type;

// Type assertion using angle bracket syntax (deprecated in JSX)
const value = <Type>expression;
```

## Preferred Alternatives

```typescript
// Using type guards
function isType(value: any): value is Type {
  return value instanceof Type || 'property' in value;
}

if (isType(value)) {
  // Use value as Type
}

// Using type predicates with Array.filter
const typedValues = values.filter((v): v is Type => isType(v));

// Using proper typing from the beginning
function getValues(): Type[] {
  // implementation
  return values;
}
```

## References

- [TypeScript Handbook: Type Assertions](https://www.typescriptlang.org/docs/handbook/basic-types.html#type-assertions)
- [Type Guards and Type Assertions](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-type-assertions)
