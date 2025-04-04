package parser

// Parser defines the interface for parsing source code into an Abstract Syntax Tree (AST).
// The AST is represented as a generic map[string]interface{} for flexibility.
type Parser interface {
	// Parse takes the file path and its content as input.
	// It returns the parsed AST as a map[string]interface{} or an error if parsing fails.
	Parse(filePath string, content string) (map[string]interface{}, error)
} 