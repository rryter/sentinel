package rule_interface

// Rule defines the interface for all analysis rules.
// Each rule is responsible for checking a specific pattern or practice in the code.
type Rule interface {
	// ID returns the unique identifier of the rule (e.g., "angular-observable-input").
	ID() string

	// Name returns the human-readable name of the rule (e.g., "Angular Observable Input").
	Name() string

	// Description provides a brief explanation of what the rule checks for.
	Description() string

	// Category returns the category the rule belongs to (e.g., "angular", "rxjs", "typescript").
	// This helps in organizing and filtering rules.
	Category() string

	// Check performs the analysis on the given AST node (represented as a map).
	// It returns a slice of Match findings if the rule is violated.
	// filePath is the absolute path to the file being analyzed.
	// fileContent is the raw content of the file (needed for line/column calculation).
	// ast is the root AST node for the file.
	Check(filePath string, fileContent string, ast map[string]interface{}) ([]Match, error)
} 