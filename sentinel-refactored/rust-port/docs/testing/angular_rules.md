# Testing Angular Rules

This document describes the testing approach for Angular-specific rules in the TypeScript analyzer.

## Angular Decorator Detection Rule

The `AngularDecoratorDetectionRule` is designed to detect common Angular property decorators like `@Input()`, `@Output()`, etc. The tests for this rule are focused on ensuring that:

1. The rule correctly identifies Angular imports
2. It can detect property decorators on class members
3. It correctly handles various edge cases

### Test Cases

The test file `tests/rules/angular_decorator_test.rs` includes the following test cases:

#### 1. No Angular Imports

Tests that when a file doesn't import from `@angular/core`, the rule doesn't match, even if decorators are used.

```typescript
import { Something } from "other-lib";

class MyClass {
  @Input() property: string;
}
```

#### 2. Angular Import No Decorators

Tests that when a file imports from `@angular/core` but doesn't use any property decorators, the rule identifies the import but reports no decorators found.

```typescript
import { Component } from "@angular/core";

@Component({
  selector: "app-root",
  template: "<div></div>",
})
class MyComponent {
  property: string;
}
```

#### 3. Input Decorator

Tests that the rule correctly identifies the `@Input()` decorator.

```typescript
import { Component, Input } from "@angular/core";

@Component({
  selector: "app-root",
  template: "<div></div>",
})
class MyComponent {
  @Input() property: string;
}
```

#### 4. Output Decorator

Tests that the rule correctly identifies the `@Output()` decorator.

```typescript
import { Component, Output, EventEmitter } from "@angular/core";

@Component({
  selector: "app-root",
  template: "<div></div>",
})
class MyComponent {
  @Output() event = new EventEmitter<string>();
}
```

#### 5. Multiple Decorators

Tests that the rule correctly identifies multiple decorators in the same file.

```typescript
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
} from "@angular/core";

@Component({
  selector: "app-root",
  template: "<div #ref></div>",
})
class MyComponent {
  @Input() property: string;
  @Output() event = new EventEmitter<string>();
  @ViewChild("ref") elementRef: ElementRef;
}
```

#### 6. Method Decorators

Tests that the rule correctly handles method decorators which aren't in the target list.

```typescript
import { Component, HostListener } from "@angular/core";

@Component({
  selector: "app-root",
  template: "<div></div>",
})
class MyComponent {
  @HostListener("click")
  onClick() {
    console.log("Clicked!");
  }
}
```

### Running the Tests

To run the tests for Angular rules:

```bash
cargo test --test angular_decorator_test
```

To run all tests:

```bash
cargo test
```

## Future Test Enhancements

Future test improvements could include:

1. Testing more complex decorator syntax (e.g., `@Input('propName')`)
2. Testing decorators applied to getters/setters
3. Testing decorator behavior with inheritance
4. Performance testing with large files
5. Integration tests that verify behavior in a real codebase
