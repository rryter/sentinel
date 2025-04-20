# Sentinel Rules

This directory contains the rules used by the Sentinel Analysis system to detect patterns in TypeScript/JavaScript code.

## Directory Structure

The rules are organized by category:

- `angular/` - Rules for Angular best practices
- `rxjs/` - Rules for RxJS best practices
- `typescript/` - Rules for TypeScript best practices
- `uncategorized/` - Rules that don't fit into a specific category
- `template/` - Template files for creating new rules

## Rule Naming Convention

Rule files should follow this naming convention:

- Use kebab-case for filenames: `rule-name.go`
- The rule ID in the Go code should match the filename (without the `.go` extension)
- Use CamelCase for the rule's constructor function: `CreateRule` or `CreateRuleRuleName`

## Creating a New Rule

1. Choose the appropriate category directory for your rule (or create a new one)
2. Copy the template from `template/rule-template.go` to your category directory
3. Rename the file to match your rule's purpose (e.g., `no-async-pipe-subscription.go`)
4. Update the rule ID, name, and description in the code
5. Implement the `Match` method with your pattern detection logic
6. Build the rule using `./build_rules.sh`

## Rule Implementation Guidelines

When implementing a rule, consider the following:

1. **Clarity**: Make sure your rule's purpose is clear from its name and description
2. **Specificity**: Target a specific pattern to avoid false positives
3. **Performance**: Rules should be as efficient as possible, avoid expensive operations
4. **Suggestions**: Provide helpful suggestions for fixing the issue in the match metadata
5. **Debugging**: Use `patterns.Debug` for debugging information during development

## Building Rules

Use the provided build script to compile your rules:

```bash
./build_rules.sh
```

This script will:

1. Scan all category directories for rule files
2. Compile each rule as a Go plugin
3. Place the compiled plugins in the `bin/rules` directory

## Troubleshooting

If you encounter build issues:

1. Check that your rule follows the naming conventions
2. Ensure your rule exports the correct constructor function:
   - Standard method: `func CreateRule() patterns.Rule`
   - Legacy method: `func CreateRuleYourRuleName() patterns.Rule`
3. Verify that your imports are correct
4. Run with verbose logging: `SENTINEL_LOG_LEVEL=debug ./build_rules.sh`

## Rule Interface

All rules must implement the `patterns.Rule` interface:

```go
type Rule interface {
    // ID returns the unique identifier of the rule
    ID() string

    // Name returns the human-readable name of the rule
    Name() string

    // Description returns a description of what the rule checks for
    Description() string

    // Match checks if the given AST node matches the rule's pattern
    Match(node map[string]interface{}, filePath string) []Match
}
```

For category support, use the `patterns.RuleWithCategory` struct as your rule's embedded type.
