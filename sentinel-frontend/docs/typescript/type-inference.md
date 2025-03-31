# TypeScript Type Inference Guidelines

## Overview

From my experience, enforcing return types with an ESLint rule is not advisable.

### Pro Explicit Typing

- When writing custom functions, returning objects with multiple properties
- When writing functions with multiple branches
- When writing a library (on everything that is public aka exported)

### Pro Type Inference

- When working with frameworks and libs (like Angular Forms)
- When writing internal functions (of a library)
- **Reduced Boilerplate**: Explicit return types add additional lines of code, which might not always contribute to clarity. Reducing boilerplate can make the codebase cleaner and easier to maintain.
- **Easier Refactoring**: When return types are enforced, changing the return type of a function requires updating the return type annotation as well. Not enforcing return types can make refactoring simpler, as developers only need to update the implementation.

## Do's and Don'ts

### Framework-Specific Code

#### Do's

```typescript
// ✅ Do: Use modern Angular form syntax with type inference
const form = new FormGroup({
  name: [''],
  email: ['']
});

// ✅ Do: Use framework-provided type inference in components
@Component({...})
class UserComponent {
  users$ = this.userService.getUsers();
}

// ✅ Do: Let Angular handle type inference in templates
@Component({
  template: `
    <div *ngFor="let user of users$ | async">
      {{ user.name }}
    </div>
  `
})
class UserListComponent {
  users$ = this.userService.getUsers();
}

// ✅ Do: Use type inference with Angular's HttpClient
class UserService {
  constructor(private http: HttpClient) {}

  getUsers() {
    return this.http.get<User[]>('/api/users');
  }
}
```

#### Don'ts

```typescript
// ❌ Don't: Use verbose FormControl syntax
const form = new FormGroup({
  name: new FormControl(''),
  age: new FormControl(0)
});

// ❌ Don't: Add unnecessary type annotations to framework code
const form: FormGroup = new FormGroup({...});  // Redundant

// ❌ Don't: Override Angular's type inference in templates
@Component({
  template: `
    <div *ngFor="let user of (users$ | async) as typedUsers: User[]">
      {{ user.name }}
    </div>
  `
})
class UserListComponent {
  users$: Observable<User[]> = this.userService.getUsers();
}

// ❌ Don't: Add redundant type annotations to HttpClient responses
class UserService {
  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }
}
```

### Custom Code

#### Do's

```typescript
// ✅ Do: Define explicit interfaces for complex objects
interface UserProfile {
  personalInfo: {
    name: string;
    age: number;
    address: {
      street: string;
      city: string;
      country: string;
    };
  };
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

// ✅ Do: Use explicit return types for complex functions
function createUserProfile(data: UserInput): UserProfile {
  return {
    personalInfo: {
      name: data.name,
      age: data.age,
      address: {
        street: data.street,
        city: data.city,
        country: data.country,
      },
    },
    preferences: {
      theme: data.theme,
      notifications: data.notifications,
    },
  };
}

// ✅ Do: Specify return types for functions with multiple paths
function calculateDiscount(price: number, userType: 'regular' | 'vip'): number {
  if (userType === 'vip') {
    return price * 0.8;
  }
  if (price > 100) {
    return price * 0.9;
  }
  return price;
}

// ✅ Do: Always use explicit types in public APIs
export interface Config {
  apiUrl: string;
  timeout: number;
  retries: number;
}

export function parseConfig(config: string): Config {
  // Implementation
}
```

#### Don'ts

```typescript
// ❌ Don't: Skip type definitions for complex objects
function createUserProfile(data) {
  // Missing type information
  return {
    personalInfo: {
      name: data.name,
      // ... more properties
    },
  };
}

// ❌ Don't: Omit return types for functions with multiple paths
function calculateDiscount(price, userType) {
  // Ambiguous return type
  if (userType === 'vip') return price * 0.8;
  if (price > 100) return price * 0.9;
  return price;
}

// ❌ Don't: Export functions without explicit types
export function parseConfig(config) {
  // Missing return type
  // Implementation
}
```

## Best Practices Summary

1. **Framework Code:**

   - ✅ Do rely on framework type inference
   - ✅ Do use framework-provided type definitions
   - ❌ Don't add redundant type annotations
   - ❌ Don't override framework type inference

2. **Custom Code:**

   - ✅ Do define explicit interfaces for complex objects
   - ✅ Do specify return types for complex functions
   - ✅ Do use explicit types in public APIs
   - ❌ Don't skip type definitions for complex structures
   - ❌ Don't omit return types for multi-path functions

3. **General Guidelines:**
   - Consider team preferences and coding standards
   - Evaluate project requirements and maintainability
   - Review code feedback and team discussions
   - Follow framework-specific best practices
