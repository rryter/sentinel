package patterns

import (
	"os"
	"strings"
)

// CalculateLineAndColumn calculates the line and column number for a given position in a file
func CalculateLineAndColumn(content string, position int) (int, int) {
	lines := strings.Split(content[:position], "\n")
	line := len(lines)
	column := len(lines[len(lines)-1]) + 1
	return line, column
}

// ProcessASTNodes traverses AST nodes recursively with a visitor function
func ProcessASTNodes(node interface{}, filePath string, maxDepth int, visitor func(map[string]interface{}) []Match) []Match {
	var processNode func(n interface{}, depth int) []Match
	processNode = func(n interface{}, depth int) []Match {
		var nodeMatches []Match

		if depth > maxDepth {
			Debug("Maximum recursion depth reached 2")
			return nodeMatches
		}

		switch v := n.(type) {
		case map[string]interface{}:
			// Apply visitor to this node
			nodeMatches = append(nodeMatches, visitor(v)...)

			// Process all fields of the node
			for key, value := range v {
				if key != "parent" && key != "type" && key != "start" && key != "end" { // Skip metadata fields
					childMatches := processNode(value, depth+1)
					nodeMatches = append(nodeMatches, childMatches...)
				}
			}

		case []interface{}:
			// Process array elements
			for _, item := range v {
				childMatches := processNode(item, depth+1)
				nodeMatches = append(nodeMatches, childMatches...)
			}
		}

		return nodeMatches
	}

	return processNode(node, 0)
}

// GetProgramBody extracts the program body from an AST node
func GetProgramBody(node map[string]interface{}, filePath string) ([]interface{}, bool) {
	// Get the program node
	program, ok := node["program"].(map[string]interface{})
	if !ok {
		Debug("No program node found in AST")
		return nil, false
	}

	// Get the body of the program
	body, ok := program["body"].([]interface{})
	if !ok {
		Debug("No body found in program")
		return nil, false
	}

	return body, true
}

// CreateMatch creates a new Match object with location information
func CreateMatch(rule Rule, node map[string]interface{}, filePath string, description string, metadata map[string]interface{}) *Match {
	// Get location information
	start, ok1 := node["start"].(float64)
	end, ok2 := node["end"].(float64)
	if !ok1 || !ok2 {
		Debug("Invalid location information for node")
		return nil
	}

	// Read file content for line/column calculation
	content, err := os.ReadFile(filePath)
	if err != nil {
		Error("Error reading file: %v", err)
		return nil
	}

	// Calculate line and column
	line, column := CalculateLineAndColumn(string(content), int(start))

	return &Match{
		RuleID:      rule.ID(),
		RuleName:    rule.Name(),
		Description: description,
		FilePath:    filePath,
		Location: Location{
			Start:  int(start),
			End:    int(end),
			Line:   line,
			Column: column,
		},
		Metadata: metadata,
	}
} 