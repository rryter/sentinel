package astutil

import (
	"sentinel-refactored/pkg/rule_interface"
)

// --- Type Checking and Extraction ---

// GetNodeType safely retrieves the 'type' property from an AST node map.
// Returns an empty string if the node is nil, not a map, or lacks the 'type' property.
func GetNodeType(node map[string]interface{}) string {
	if node == nil {
		return ""
	}
	typeStr, _ := node["type"].(string)
	return typeStr
}

// --- Property Accessors (Safe) --- 

// GetStringProperty safely retrieves a string property by key.
// Returns the string value and true if found and is a string, otherwise "" and false.
func GetStringProperty(node map[string]interface{}, key string) (string, bool) {
	if node == nil {
		return "", false
	}
	val, ok := node[key].(string)
	return val, ok
}

// GetMapProperty safely retrieves a map[string]interface{} property by key.
// Returns the map value and true if found and is a map, otherwise nil and false.
func GetMapProperty(node map[string]interface{}, key string) (map[string]interface{}, bool) {
	if node == nil {
		return nil, false
	}
	val, ok := node[key].(map[string]interface{})
	return val, ok
}

// GetArrayProperty safely retrieves a []interface{} property by key.
// Returns the slice value and true if found and is a slice, otherwise nil and false.
func GetArrayProperty(node map[string]interface{}, key string) ([]interface{}, bool) {
	if node == nil {
		return nil, false
	}
	val, ok := node[key].([]interface{})
	return val, ok
}

// GetFloatProperty safely retrieves a float64 property by key.
// Returns the float value and true if found and is a float64, otherwise 0 and false.
func GetFloatProperty(node map[string]interface{}, key string) (float64, bool) {
	if node == nil {
		return 0, false
	}
	val, ok := node[key].(float64)
	return val, ok
}

// GetBoolProperty safely retrieves a boolean property by key.
// Returns the bool value and true if found and is a bool, otherwise false and false.
func GetBoolProperty(node map[string]interface{}, key string) (bool, bool) {
	if node == nil {
		return false, false
	}
	val, ok := node[key].(bool)
	return val, ok
}

// --- Common Node Information Extraction --- 

// GetNodeName attempts to extract a common 'name' identifier from a node.
// It checks typical locations like node.id.name or node.key.name.
// Returns the name or an empty string if not found.
func GetNodeName(node map[string]interface{}) string {
	if node == nil {
		return ""
	}
	// Try node.id.name (common for declarations)
	if idMap, ok := GetMapProperty(node, "id"); ok {
		if name, ok := GetStringProperty(idMap, "name"); ok {
			return name
		}
	}
	// Try node.key.name (common for properties/methods)
	if keyMap, ok := GetMapProperty(node, "key"); ok {
		if name, ok := GetStringProperty(keyMap, "name"); ok {
			return name
		}
	}
	// Try node.name directly (less common but possible)
	if name, ok := GetStringProperty(node, "name"); ok {
		return name
	}
	return ""
}

// GetNodeLocation extracts start/end offsets from a node.
// Returns 0 for both if properties are missing or not numbers.
func GetNodeLocationOffsets(node map[string]interface{}) (startOffset, endOffset int) {
	if start, ok := GetFloatProperty(node, "start"); ok {
		startOffset = int(start)
	}
	if end, ok := GetFloatProperty(node, "end"); ok {
		endOffset = int(end)
	}
	return startOffset, endOffset
}

// CalculateLineAndColumn calculates the 1-based line and column number for a given 0-based byte offset.
func CalculateLineAndColumn(content string, offset int) (line, column int) {
	if offset < 0 {
		return 1, 1
	}
	if offset > len(content) {
		offset = len(content)
	}
	line = 1
	lastNewline := -1
	// Use IndexByte for efficiency if available, fallback to strings.Index
	for i, r := range content[:offset] {
		if r == '\n' {
			line++
			lastNewline = i
		}
	}
	column = offset - lastNewline
	return line, column
}

// CreateMatch is a helper to create a rule_interface.Match object, including location calculation.
func CreateMatch(rule rule_interface.Rule, node map[string]interface{}, fileContent string, filePath string, message string, severity rule_interface.MatchSeverity) rule_interface.Match {
	startOffset, _ := GetNodeLocationOffsets(node)
	line, col := CalculateLineAndColumn(fileContent, startOffset)

	return rule_interface.Match{
		RuleID:   rule.ID(),
		FilePath: filePath,
		Message:  message,
		Line:     line,
		Column:   col,
		Severity: severity,
	}
}

// --- AST Traversal --- 

// Traverse visits nodes in the AST using a depth-first approach.
// The visitor function is called for each map[string]interface{} node.
// If the visitor returns false, traversal of that node's children is skipped.
func Traverse(node interface{}, visit func(node map[string]interface{}) bool) {
	switch n := node.(type) {
	case map[string]interface{}:
		if !visit(n) { // Visit the node itself
			return // Stop traversal for this branch if visitor returns false
		}
		// Iterate over all map values (more robust than fixed keys)
		for _, value := range n {
			Traverse(value, visit)
		}
	case []interface{}:
		// If it's an array, traverse each element
		for _, item := range n {
			Traverse(item, visit)
		}
	// Ignore other types (bool, string, float64, nil etc.)
	}
} 