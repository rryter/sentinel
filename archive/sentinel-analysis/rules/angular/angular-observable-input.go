package main

import (
	"fmt"
	"os"
	"strings"

	"sentinel/indexing/internal/patterns"
	"sentinel/indexing/internal/patterns/helpers"
)

// AngularObservableInputRule checks for Observable inputs in Angular components
type AngularObservableInputRule struct {
	*patterns.EnhancedBaseRule
}

// CreateRuleAngularObservableInput creates a new AngularObservableInputRule
func CreateRuleAngularObservableInput() patterns.Rule {
	return &AngularObservableInputRule{
		EnhancedBaseRule: patterns.NewEnhancedBaseRule(
			"angular-observable-input",
			"Angular Observable Input",
			"Checks for Observable inputs in Angular components",
		),
	}
}

// Match implements the Rule interface
func (r *AngularObservableInputRule) Match(node map[string]interface{}, filePath string) []patterns.Match {
	return r.ProcessASTNodes(node, filePath, 10, func(n map[string]interface{}) []patterns.Match {
		return r.handlePropertyDefinition(n, filePath)
	})
}

func (r *AngularObservableInputRule) handlePropertyDefinition(node map[string]interface{}, filePath string) []patterns.Match {
	// Check if this is a property definition
	if node["type"] != "PropertyDefinition" {
		return nil
	}

	// Check if this is an input property
	if !r.isInputProperty(node) {
		return nil
	}

	// Check if the type is Observable
	if !r.isObservableType(node) {
		return nil
	}

	// Create a match
	return []patterns.Match{
		*r.CreateMatch(node, filePath, "Avoid using Observable inputs in Angular components", map[string]interface{}{
			"propertyName": node["key"].(map[string]interface{})["name"].(string),
		}),
	}
}

func (r *AngularObservableInputRule) isInputProperty(node map[string]interface{}) bool {
	// Check for @Input() decorator
	decorators, ok := node["decorators"].([]interface{})
	if !ok {
		return false
	}

	for _, decorator := range decorators {
		decoratorNode, ok := decorator.(map[string]interface{})
		if !ok {
			continue
		}

		expression, ok := decoratorNode["expression"].(map[string]interface{})
		if !ok {
			continue
		}

		if expression["type"] == "CallExpression" {
			callee, ok := expression["callee"].(map[string]interface{})
			if !ok {
				continue
			}

			if callee["name"] == "Input" {
				return true
			}
		}
	}

	return false
}

func (r *AngularObservableInputRule) isObservableType(node map[string]interface{}) bool {
	// Check if the type is Observable
	typeAnnotation, ok := node["typeAnnotation"].(map[string]interface{})
	if !ok {
		return false
	}

	typeAnnotationType, ok := typeAnnotation["typeAnnotation"].(map[string]interface{})
	if !ok {
		return false
	}

	if typeAnnotationType["type"] == "TSTypeReference" {
		typeName, ok := typeAnnotationType["typeName"].(map[string]interface{})
		if !ok {
			return false
		}

		return typeName["name"] == "Observable"
	}

	return false
}

// handleInputBinding checks if an input binding is passing an Observable directly
func (r *AngularObservableInputRule) handleInputBinding(node map[string]interface{}, filePath string) *patterns.Match {
	// Get the property name (input binding name)
	var propertyName string
	if name, ok := node["name"].(map[string]interface{}); ok {
		if nameStr, ok := name["name"].(string); ok {
			propertyName = nameStr
		}
	}

	// Check if the value is an Observable (ends with $)
	var value string
	if init, ok := node["value"].(map[string]interface{}); ok {
		if raw, ok := init["raw"].(string); ok {
			value = raw
		} else if name, ok := init["name"].(string); ok {
			value = name
		}
	}

	// If the value ends with $ and doesn't use async pipe, it's likely an Observable
	if strings.HasSuffix(value, "$") && !strings.Contains(value, "async") {
		return helpers.CreateMatch(r, node, filePath,
			fmt.Sprintf("Observable '%s' passed directly as input to component", value),
			map[string]interface{}{
				"inputName":      propertyName,
				"observableName": value,
				"severity":       "high",
				"suggestion":     r.getSuggestion(value),
				"usesAsyncPipe":  false,
				"isSubscribedTo": false,
			})
	}

	return nil
}

// getSuggestion provides suggestions for fixing the Observable input
func (r *AngularObservableInputRule) getSuggestion(observableName string) string {
	return fmt.Sprintf(`⚠️ Observable Input Issue Detected

Problem:
Passing Observables directly as inputs can lead to:
- Memory leaks from unmanaged subscriptions
- Complex change detection cycles
- Harder to test components
- Potential race conditions

Recommended Solutions:
1. Use async pipe in template (preferred):
   [%s]="data$ | async"
   This automatically handles subscription lifecycle and change detection.

2. Subscribe in parent component:
   [%s]="data"
   This moves subscription management to the parent where it's more appropriate.

3. For complex data transformations:
   - Handle them in the parent component
   - Use signals for derived state
   - Consider using a state management solution

Best Practices:
- Keep components as pure as possible
- Handle subscriptions at the appropriate level
- Use signals for derived state
- Consider using async pipe for simple cases`,
		strings.TrimSuffix(observableName, "$"),
		strings.TrimSuffix(observableName, "$"))
}

// calculateLineAndColumn calculates line and column numbers from character offset
func (r *AngularObservableInputRule) calculateLineAndColumn(content string, offset int) (int, int) {
	// Count newlines up to the offset to get the line number
	beforeOffset := content[:offset]
	line := strings.Count(beforeOffset, "\n") + 1

	// Find the last newline before offset to calculate column
	lastNewline := strings.LastIndex(beforeOffset, "\n")
	column := 0
	if lastNewline == -1 {
		column = offset + 1 // If no newline, column is just the offset + 1
	} else {
		column = offset - lastNewline // Column is the number of characters after the last newline
	}

	return line, column
}

// readFile reads the content of a file
func (r *AngularObservableInputRule) readFile(filePath string) (string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(content), nil
}
