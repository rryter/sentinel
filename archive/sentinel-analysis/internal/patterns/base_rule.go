package patterns

import (
	"fmt"
	"os"
	"strings"
)

// EnhancedBaseRule provides common functionality for all rules
type EnhancedBaseRule struct {
	BaseRule
}

// NewEnhancedBaseRule creates a new enhanced base rule
func NewEnhancedBaseRule(id, name, description string) *EnhancedBaseRule {
	return &EnhancedBaseRule{
		BaseRule: NewBaseRule(id, name, description),
	}
}

// Match implements the Rule interface
func (r *EnhancedBaseRule) Match(node map[string]interface{}, filePath string) []Match {
	// This is a base implementation that should be overridden by specific rules
	return nil
}

// ProcessASTNodes is a helper method for processing AST nodes
func (r *EnhancedBaseRule) ProcessASTNodes(body interface{}, filePath string, maxDepth int, processor func(node map[string]interface{}) []Match) []Match {
	return ProcessASTNodes(body, filePath, maxDepth, processor)
}

// GetProgramBody extracts the program body from a node
func (r *EnhancedBaseRule) GetProgramBody(node map[string]interface{}, filePath string) ([]interface{}, bool) {
	return GetProgramBody(node, filePath)
}

// ReadFile reads a file and returns its contents
func (r *EnhancedBaseRule) ReadFile(filePath string) (string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to read file %s: %w", filePath, err)
	}
	return string(content), nil
}

// CalculateLineAndColumn calculates line and column numbers from a file offset
func (r *EnhancedBaseRule) CalculateLineAndColumn(content string, offset int) (int, int) {
	lines := strings.Split(content[:offset], "\n")
	line := len(lines)
	column := len(lines[len(lines)-1]) + 1
	return line, column
}

// CreateMatch creates a new match with common fields
func (r *EnhancedBaseRule) CreateMatch(node map[string]interface{}, filePath string, description string, metadata map[string]interface{}) *Match {
	return CreateMatch(r, node, filePath, description, metadata)
}

// HasDecorator checks if a node has a specific decorator
func (r *EnhancedBaseRule) HasDecorator(node map[string]interface{}, decoratorName string) bool {
	if decorators, ok := node["decorators"].([]interface{}); ok {
		for _, decorator := range decorators {
			if d, ok := decorator.(map[string]interface{}); ok {
				if expr, ok := d["expression"].(map[string]interface{}); ok {
					if callee, ok := expr["callee"].(map[string]interface{}); ok {
						if name, ok := callee["name"].(string); ok && name == decoratorName {
							return true
						}
					}
				}
			}
		}
	}
	return false
}

// GetNodeType safely extracts the node type
func (r *EnhancedBaseRule) GetNodeType(node map[string]interface{}) string {
	if nodeType, ok := node["type"].(string); ok {
		return nodeType
	}
	return ""
}

// GetNodeName safely extracts the node name
func (r *EnhancedBaseRule) GetNodeName(node map[string]interface{}) string {
	if name, ok := node["name"].(string); ok {
		return name
	}
	return ""
}

// GetNodeProperty safely extracts a property from a node
func (r *EnhancedBaseRule) GetNodeProperty(node map[string]interface{}, property string) string {
	if prop, ok := node[property].(string); ok {
		return prop
	}
	return ""
}

// GetNodePropertyMap safely extracts a map property from a node
func (r *EnhancedBaseRule) GetNodePropertyMap(node map[string]interface{}, property string) map[string]interface{} {
	if prop, ok := node[property].(map[string]interface{}); ok {
		return prop
	}
	return nil
}

// GetNodePropertyArray safely extracts an array property from a node
func (r *EnhancedBaseRule) GetNodePropertyArray(node map[string]interface{}, property string) []interface{} {
	if prop, ok := node[property].([]interface{}); ok {
		return prop
	}
	return nil
} 