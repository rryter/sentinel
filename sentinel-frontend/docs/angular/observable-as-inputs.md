# Observable as Inputs in Angular Components

A common question is whether passing Observables directly into components (e.g., `[data$]="data$"`) is an anti-pattern. This entry explores why this practice is discouraged and provides best practices for managing Observables in Angular components.

## Why Passing Observables Directly is Discouraged

### Encapsulation

**Definition:** Encapsulation is a core principle of component-based architecture. It dictates that components should manage their internal logic and state without exposing implementation details.

**Issue:** When you pass an Observable directly to a child component, you expose the data fetching strategy, breaking encapsulation. The child component, which should focus solely on displaying data, now needs to understand and manage the Observable.

### Complexity

- **Simplicity:** Keeping child components "dumb" (i.e., simple and focused only on presentation) reduces complexity.
- **Subscription Handling:** If child components receive Observables, they must handle subscriptions, which adds complexity. Mismanagement can lead to memory leaks or unexpected behaviors.
- **Testing:** Simple, dumb components are easier to test as they rely on plain inputs and outputs, without needing to mock Observables or handle asynchronous data.

### Change Detection

- **Angular's Mechanism:** Angular uses a change detection mechanism to update the view whenever the model changes.
- **Synchronous Operations:** Angular's change detection works best with synchronous data. When an Observable is passed directly, Angular cannot predict when the data will arrive, leading to potential performance issues and inefficient updates.

## Best Practices

### Subscribe in the Parent Component

**Data Handling:** The parent component should handle data fetching and subscriptions. This keeps the data flow and fetching logic centralized.

Example:

```typescript
export class ParentComponent implements OnInit {
  data: DataType;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.getData().subscribe((data) => (this.data = data));
  }
}
```

### Pass Plain Data to Child Components

**Simplicity:** Pass only the resolved data to the child components.

Example:

```html
<child-component [data]="data"></child-component>
```

### Using Async Pipe for Display

**Async Pipe:** In cases where you still want to pass an Observable, use the async pipe in the template to manage subscriptions and handle unsubscriptions automatically.

Example:

```html
<child-component [data]="data$ | async"></child-component>
```

### Separation of Concerns

- **Presentation vs Logic:** Keep the data logic and presentation logic separate. The parent component (or a service) handles the data, while the child component focuses on rendering.

## Do's and Don'ts

### Do's

✅ **Do handle subscriptions in parent components**

```typescript
// Good
export class ParentComponent {
  data: DataType;

  ngOnInit() {
    this.dataService.getData().subscribe((data) => (this.data = data));
  }
}
```

✅ **Do use async pipe in templates when needed**

```html
<!-- Good -->
<child-component [data]="data$ | async"></child-component>
```

✅ **Do pass plain data to child components**

```html
<!-- Good -->
<child-component [data]="resolvedData"></child-component>
```

✅ **Do implement OnDestroy for manual subscriptions**

```typescript
// Good
export class ParentComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.dataService
      .getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => (this.data = data));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### Don'ts

❌ **Don't pass Observables directly to child components**

```typescript
// Bad
export class ChildComponent {
  @Input() data$: Observable<DataType>;
}
```

❌ **Don't subscribe in child components**

```typescript
// Bad
export class ChildComponent implements OnInit {
  @Input() data$: Observable<DataType>;
  data: DataType;

  ngOnInit() {
    this.data$.subscribe((data) => (this.data = data));
  }
}
```

❌ **Don't forget to unsubscribe from Observables**

```typescript
// Bad
export class ParentComponent {
  ngOnInit() {
    this.dataService.getData().subscribe((data) => (this.data = data));
    // Missing unsubscribe logic
  }
}
```

❌ **Don't mix data fetching and presentation logic**

```typescript
// Bad
export class ChildComponent {
  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.getData().subscribe((data) => (this.data = data));
  }
}
```

## Conclusion

Passing Observables directly into Angular components is considered an anti-pattern due to issues with encapsulation, complexity, and change detection. By subscribing to Observables in the parent component and passing plain data to child components, you maintain simplicity, enhance testability, and ensure better performance. Adopting these best practices leads to cleaner, more maintainable Angular applications.
