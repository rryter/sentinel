package main

import (
	"fmt"
	"os"
	"strings"

	"sentinel/indexing/internal/patterns"
	"sentinel/indexing/internal/patterns/helpers"
)

// ObservableInputRule checks for Observables being passed directly as inputs
type ObservableInputRule struct {
	patterns.BaseRule
}

// NewRule is the exported symbol that will be looked up by the plugin loader
func CreateRuleAngularObservableInput() patterns.Rule {
	patterns.Debug("Creating ObservableInputRule")
	return &ObservableInputRule{
		BaseRule: patterns.NewBaseRule(
			"angular-observable-input",
			"[Angular] Observable Input",
			"Identifies cases where Observables are passed directly as inputs to components",
		),
	}
}

// Match implements the Rule interface
func (r *ObservableInputRule) Match(node map[string]interface{}, filePath string) []patterns.Match {
	patterns.Debug("=== Starting ObservableInputRule.Match for file: %s ===", filePath)

	body, ok := helpers.GetProgramBody(node, filePath)
	if !ok {
		return nil
	}

	matches := helpers.ProcessASTNodes(body, filePath, 1000, func(node map[string]interface{}) []patterns.Match {
		var nodeMatches []patterns.Match

		if nodeType, ok := node["type"].(string); ok {
			switch nodeType {
			case "PropertyDefinition", "ClassProperty":
				if match := r.handlePropertyDefinition(node, filePath); match != nil {
					nodeMatches = append(nodeMatches, *match)
				}
			case "JSXAttribute", "Property":
				if match := r.handleInputBinding(node, filePath); match != nil {
					nodeMatches = append(nodeMatches, *match)
				}
			}
		}

		return nodeMatches
	})

	patterns.Debug("=== Completed ObservableInputRule.Match for file: %s ===", filePath)
	patterns.Debug("📊 Found %d total matches", len(matches))
	return matches
}

// handlePropertyDefinition checks if a class property is an @Input decorated Observable or an input signal containing an Observable
func (r *ObservableInputRule) handlePropertyDefinition(node map[string]interface{}, filePath string) *patterns.Match {
	var propertyName string
	if key, ok := node["key"].(map[string]interface{}); ok {
		if name, ok := key["name"].(string); ok {
			propertyName = name
		}
	}

	patterns.Debug("Analyzing property %s", propertyName)

	isObservable := false
	observableType := ""
	isInputSignal := false
	hasInputDecorator := r.hasInputDecorator(node)
	hasAsyncPipe := false

	patterns.Debug("Property initial state - Name: %s, isInputSignal: %v, isObservable: %v, hasInputDecorator: %v",
		propertyName, isInputSignal, isObservable, hasInputDecorator)

	// First check if it's an input signal
	if value, ok := node["value"].(map[string]interface{}); ok {
		patterns.Debug("Found value node for %s: %v", propertyName, value)
		if callExpr, ok := value["type"].(string); ok && callExpr == "CallExpression" {
			if callee, ok := value["callee"].(map[string]interface{}); ok {
				if name, ok := callee["name"].(string); ok {
					patterns.Debug("Found function name for %s: %s", propertyName, name)
					if name == "input" {
						patterns.Debug("Found input signal declaration for %s", propertyName)
						isInputSignal = true
						isObservable = true
						observableType = "Observable"
					}
				}
			}
		}
	}

	// If it's not an input signal, check if it's a decorated input with Observable type
	if !isInputSignal && hasInputDecorator {
		// Check type annotation for Observable<T>
		if typeAnnotation, ok := node["typeAnnotation"].(map[string]interface{}); ok {
			if typeRef, ok := typeAnnotation["typeAnnotation"].(map[string]interface{}); ok {
				if typeName, ok := typeRef["typeName"].(map[string]interface{}); ok {
					if name, ok := typeName["name"].(string); ok {
						patterns.Debug("Found type annotation for @Input: %s", name)
						if name == "Observable" {
							isObservable = true
							observableType = name
						}
					}
				}
			}
		}

		// Check value for Observable creation functions
		if value, ok := node["value"].(map[string]interface{}); ok {
			if callExpr, ok := value["expression"].(map[string]interface{}); ok {
				if callee, ok := callExpr["callee"].(map[string]interface{}); ok {
					if name, ok := callee["name"].(string); ok {
						patterns.Debug("Found value function for @Input: %s", name)
						if name == "of" || name == "from" || name == "interval" || name == "timer" {
							isObservable = true
							observableType = "Observable"
						}
					}
				}
			}
		}
	}

	patterns.Debug("Property analysis results - Name: %s, isInputSignal: %v, isObservable: %v, hasInputDecorator: %v",
		propertyName, isInputSignal, isObservable, hasInputDecorator)

	// Only return a match if we have either:
	// 1. An input signal (which we've confirmed contains an Observable)
	// 2. A decorated input that we've confirmed is an Observable
	if !isObservable {
		return nil
	}

	description := ""
	if isInputSignal {
		description = fmt.Sprintf("Input signal '%s' contains an Observable", propertyName)
	} else if hasInputDecorator {
		description = fmt.Sprintf("@Input decorated property '%s' is an Observable", propertyName)
	}

	// Determine severity based on context
	severity := "high"
	if hasAsyncPipe {
		severity = "medium"
	}

	return helpers.CreateMatch(r, node, filePath, description, map[string]interface{}{
		"propertyName":      propertyName,
		"observableType":    observableType,
		"isInputSignal":     isInputSignal,
		"hasInputDecorator": hasInputDecorator,
		"hasAsyncPipe":      hasAsyncPipe,
		"severity":          severity,
		"suggestion":        r.getSuggestion(propertyName),
		"architecturalImpact": map[string]interface{}{
			"affectsChangeDetection": true,
			"potentialMemoryLeak":    true,
			"testingComplexity":      "high",
			"maintainability":        "low",
		},
	})
}

// hasInputDecorator checks if a node has an @Input decorator
func (r *ObservableInputRule) hasInputDecorator(node map[string]interface{}) bool {
	if decorators, ok := node["decorators"].([]interface{}); ok {
		for _, dec := range decorators {
			if decorator, ok := dec.(map[string]interface{}); ok {
				if expr, ok := decorator["expression"].(map[string]interface{}); ok {
					// Check for both @Input and @Input()
					if callee, ok := expr["callee"].(map[string]interface{}); ok {
						if name, ok := callee["name"].(string); ok && name == "Input" {
							return true
						}
					} else if name, ok := expr["name"].(string); ok && name == "Input" {
						return true
					}
				}
			}
		}
	}
	return false
}

// handleInputBinding checks if an input binding is passing an Observable directly
func (r *ObservableInputRule) handleInputBinding(node map[string]interface{}, filePath string) *patterns.Match {
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
func (r *ObservableInputRule) getSuggestion(observableName string) string {
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
func (r *ObservableInputRule) calculateLineAndColumn(content string, offset int) (int, int) {
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
func (r *ObservableInputRule) readFile(filePath string) (string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(content), nil
}
