# UI Component Command

Generate modern Angular standalone components with signals, using Spartan UI components from `libs/ui`.

## Usage

```
/ui-component <component-name> <reference-description>
```

**Arguments:**
- `component-name` (required): Name for the component in kebab-case (e.g., "user-card", "task-list", "metric-display")
- `reference-description` (required): Description of what the component should do and how it should look

**Examples:**
```bash
/ui-component user-card "A card component that displays user info with avatar, name, email, and a follow button"
/ui-component metric-display "Display a metric with a large number, label, trend indicator (up/down arrow), and percentage change"
/ui-component task-list "A list of tasks with checkboxes, due dates, priority badges, and delete buttons"
```

## Output Structure

Generated files are saved to:
```
sentinel-frontend/libs/shared/ui-custom/src/lib/components/<component-name>/
├── <component-name>.component.ts
├── <component-name>.component.html
└── <component-name>.component.css
```

## Instructions

When this command is invoked, follow these steps:

### 1. Gather Context from Angular Docs (Optional)
If Context7 is available, use it to fetch relevant Angular documentation:
```bash
npx context7 search angular
# Then use the correct project path:
npx context7 <angular-project-path> "angular signals input output model"
npx context7 <angular-project-path> "standalone components"
```

If Context7 is not available, proceed with the following Angular patterns:
- Modern signal APIs: `signal()`, `computed()`, `effect()`
- Input/output patterns: `input()`, `input.required()`, `output()`, `model()`
- Standalone component syntax with `standalone: true`
- Modern control flow: `@if`, `@for`, `@switch`, `@defer`
- Use `inject()` for dependency injection instead of constructor injection

### 2. Identify Spartan UI Components to Use

Available Spartan UI components in `libs/ui`:
- **Layout**: `ui-card-helm`, `ui-separator-helm`, `ui-accordion-helm`, `ui-sheet-helm`, `ui-dialog-helm`, `ui-sidebar-helm`
- **Forms**: `ui-input-helm`, `ui-textarea-helm`, `ui-checkbox-helm`, `ui-radio-group-helm`, `ui-select-helm`, `ui-switch-helm`, `ui-slider-helm`, `ui-form-field-helm`
- **Buttons**: `ui-button-helm`, `ui-button-group-helm`, `ui-toggle-helm`, `ui-toggle-group-helm`
- **Data Display**: `ui-table-helm`, `ui-badge-helm`, `ui-avatar-helm`, `ui-progress-helm`, `ui-skeleton-helm`, `ui-empty-helm`
- **Feedback**: `ui-alert-helm`, `ui-alert-dialog-helm`, `ui-tooltip-helm`, `ui-popover-helm`, `ui-hover-card-helm`, `ui-sonner-helm`, `ui-spinner-helm`
- **Navigation**: `ui-tabs-helm`, `ui-menu-helm`, `ui-breadcrumb-helm`, `ui-pagination-helm`
- **Utilities**: `ui-icon-helm`, `ui-label-helm`, `ui-typography-helm`, `ui-scroll-area-helm`, `ui-resizable-helm`, `ui-kbd-helm`

Choose appropriate components based on the reference description.

### 3. Generate Component TypeScript File

Create a **standalone** component following these patterns:

**Component Structure:**
```typescript
import { ChangeDetectionStrategy, Component, input, output, model, signal, computed } from '@angular/core';
import { HlmButtonDirective } from '@spartan-ng/helm/button';
import { HlmCardDirective, HlmCardHeaderDirective, HlmCardContentDirective } from '@spartan-ng/helm/card';
// Import other Spartan UI components as needed

@Component({
  selector: 'app-<component-name>',
  standalone: true,
  imports: [
    // List all Spartan UI components used
    HlmButtonDirective,
    HlmCardDirective,
    HlmCardHeaderDirective,
    HlmCardContentDirective,
    // Add others as needed
  ],
  templateUrl: './<component-name>.component.html',
  styleUrls: ['./<component-name>.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class <ComponentName>Component {
  // Use input() for read-only inputs
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');

  // Use output() for events
  readonly clicked = output<void>();

  // Use model() for two-way binding
  readonly value = model<number>(0);

  // Use signal() for internal state
  protected readonly isExpanded = signal(false);

  // Use computed() for derived state
  protected readonly displayValue = computed(() => {
    return `${this.title()}: ${this.value()}`;
  });

  // Methods
  protected handleClick() {
    this.clicked.emit();
  }

  protected toggle() {
    this.isExpanded.update(v => !v);
  }
}
```

**Key Patterns:**
- Use `ChangeDetectionStrategy.OnPush` for better performance
- Use `input()` for props, `input.required()` for required props
- Use `output()` for events
- Use `model()` for two-way bound properties
- Use `signal()` for internal reactive state
- Use `computed()` for derived values
- Use `readonly` for public API properties
- Use `protected` for template-only methods and properties
- Always make component `standalone: true`
- Import Spartan UI directives/components, not modules

### 4. Generate Component HTML Template

Use modern Angular template syntax:

**Control Flow:**
```html
<!-- Use @if instead of *ngIf -->
@if (isExpanded()) {
  <div>Expanded content</div>
}

<!-- Use @for instead of *ngFor -->
@for (item of items(); track item.id) {
  <div>{{ item.name }}</div>
}

<!-- Use @switch instead of *ngSwitchCase -->
@switch (status()) {
  @case ('loading') {
    <app-spinner />
  }
  @case ('success') {
    <div>Success!</div>
  }
  @default {
    <div>Unknown status</div>
  }
}

<!-- Use @defer for lazy loading -->
@defer (on viewport) {
  <heavy-component />
} @placeholder {
  <app-skeleton />
}
```

**Spartan UI Components:**
Use Spartan UI components with their directive syntax:
```html
<button hlmBtn (click)="handleClick()">Click me</button>

<div hlmCard>
  <div hlmCardHeader>
    <h3 hlmCardTitle>{{ title() }}</h3>
    <p hlmCardDescription>{{ subtitle() }}</p>
  </div>
  <div hlmCardContent>
    <!-- Content here -->
  </div>
</div>

<input hlmInput [value]="inputValue()" (input)="updateValue($event)" />

<span hlmBadge>Badge</span>

<div hlmAvatar>
  <img [src]="avatarUrl()" alt="Avatar" />
</div>
```

### 5. Generate Component CSS File

Create minimal CSS for custom styling:
- Only add CSS that can't be achieved with Spartan UI or Tailwind
- Use CSS custom properties for theming when possible
- Keep styles scoped to the component
- Add comments explaining custom styles

```css
/* Custom styles that extend Spartan UI */
:host {
  display: block;
}

.custom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
```

### 6. Create the Component Files

Use the Write tool to create all three files:
1. `<component-name>.component.ts`
2. `<component-name>.component.html`
3. `<component-name>.component.css`

Save them to: `sentinel-frontend/libs/shared/ui-custom/src/lib/components/<component-name>/`

### 7. Generate Usage Example

Provide a clear usage example showing:
- How to import the component
- Example template usage with all inputs/outputs
- Common use cases

Example:
```typescript
// In another component
import { <ComponentName>Component } from '@shared/ui-custom';

@Component({
  imports: [<ComponentName>Component],
  template: `
    <app-<component-name>
      [title]="myTitle"
      [subtitle]="mySubtitle"
      [(value)]="currentValue"
      (clicked)="handleClick()"
    />
  `
})
export class MyComponent {
  protected myTitle = 'Example';
  protected mySubtitle = 'Subtitle';
  protected currentValue = signal(42);

  protected handleClick() {
    console.log('Component clicked!');
  }
}
```

## Important Notes

- **Always use modern Angular syntax**: signals, standalone components, new control flow
- **No NgModules**: Components should be standalone
- **Use inject() instead of constructor DI**: More modern and flexible
- **Spartan UI over custom HTML**: Use Spartan UI components as building blocks
- **OnPush change detection**: Always use for better performance
- **Type safety**: Always provide proper TypeScript types
- **Accessibility**: Ensure proper ARIA labels, semantic HTML, keyboard navigation
- **Naming convention**: Components should be kebab-case, class names should be PascalCase
- **Template syntax**: Use `@if/@for/@switch` not `*ngIf/*ngFor/*ngSwitch`
- **Signal calls**: Remember to call signals with `()`: `mySignal()` not `mySignal`

## Common Patterns

### Presentational Component (Dumb Component)
```typescript
@Component({
  selector: 'app-user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardComponent {
  // Inputs only
  readonly user = input.required<User>();
  readonly compact = input(false);

  // Outputs only
  readonly userClicked = output<User>();

  // No internal state or business logic
  protected handleClick() {
    this.userClicked.emit(this.user());
  }
}
```

### Form Control Component
```typescript
@Component({
  selector: 'app-rating-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingInputComponent {
  // Two-way binding with model()
  readonly rating = model.required<number>();
  readonly max = input(5);
  readonly disabled = input(false);

  protected setRating(value: number) {
    if (!this.disabled()) {
      this.rating.set(value);
    }
  }
}
```

### Stateful Component
```typescript
@Component({
  selector: 'app-expandable-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpandableSectionComponent {
  // External inputs
  readonly title = input.required<string>();
  readonly defaultExpanded = input(false);

  // Internal state
  protected readonly isExpanded = signal(false);

  constructor() {
    // Initialize from input
    effect(() => {
      this.isExpanded.set(this.defaultExpanded());
    });
  }

  protected toggle() {
    this.isExpanded.update(v => !v);
  }
}
```

## Validation

After generating the component:
1. Check that all imports are correct
2. Verify signal syntax (remember the `()` calls)
3. Ensure proper TypeScript types
4. Confirm Spartan UI components are used correctly
5. Validate template syntax uses modern control flow
6. Check that component is standalone
7. Verify change detection strategy is OnPush

## Summary Output

Provide to the user:
- Paths to all generated files
- Brief description of the component
- List of Spartan UI components used
- Usage example
- Any notes about customization or extension