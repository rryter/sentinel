package main

import (
	"fmt"

	"sentinel/indexing/internal/patterns"
	"sentinel/indexing/internal/patterns/helpers"
)

// LegacyDecoratorRule checks for usage of legacy Angular decorators that have signal-based alternatives
type LegacyDecoratorRule struct {
	patterns.BaseRule
}

// CreateRuleAngularLegacyDecorators is the exported symbol that will be looked up by the plugin loader
func CreateRuleAngularLegacyDecorators() patterns.Rule {
	return &LegacyDecoratorRule{
		BaseRule: patterns.NewBaseRule(
			"angular-legacy-decorators",
			"[Angular] Legacy Decorators",
			"Identifies usage of legacy Angular decorators that have signal-based alternatives",
		),
	}
}

// Match implements the Rule interface
func (r *LegacyDecoratorRule) Match(node map[string]interface{}, filePath string) []patterns.Match {
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
			case "MethodDefinition":
				if match := r.handleMethodDefinition(node, filePath); match != nil {
					nodeMatches = append(nodeMatches, *match)
				}
			}
		}

		return nodeMatches
	})

	return matches
}

// handlePropertyDefinition checks if a class property has a legacy decorator
func (r *LegacyDecoratorRule) handlePropertyDefinition(node map[string]interface{}, filePath string) *patterns.Match {
	var propertyName string
	if key, ok := node["key"].(map[string]interface{}); ok {
		if name, ok := key["name"].(string); ok {
			propertyName = name
		}
	}

	// Check for legacy decorators
	legacyDecorators := map[string]string{
		"Input":    "input",
		"Output":   "output",
		"ViewChild": "viewChild",
		"ViewChildren": "viewChildren",
		"ContentChild": "contentChild",
		"ContentChildren": "contentChildren",
	}

	var foundDecorator string
	var signalAlternative string

	if decorators, ok := node["decorators"].([]interface{}); ok {
		for _, dec := range decorators {
			if decorator, ok := dec.(map[string]interface{}); ok {
				if expr, ok := decorator["expression"].(map[string]interface{}); ok {
					// Check for both @Decorator and @Decorator()
					if callee, ok := expr["callee"].(map[string]interface{}); ok {
						if name, ok := callee["name"].(string); ok {
							if alternative, exists := legacyDecorators[name]; exists {
								foundDecorator = name
								signalAlternative = alternative
								break
							}
						}
					} else if name, ok := expr["name"].(string); ok {
						if alternative, exists := legacyDecorators[name]; exists {
							foundDecorator = name
							signalAlternative = alternative
							break
						}
					}
				}
			}
		}
	}

	if foundDecorator == "" {
		return nil
	}

	description := fmt.Sprintf("Property '%s' uses legacy @%s decorator", propertyName, foundDecorator)

	return helpers.CreateMatch(r, node, filePath, description, map[string]interface{}{
		"propertyName": propertyName,
		"decorator": foundDecorator,
		"signalAlternative": signalAlternative,
		"severity": "medium",
		"suggestion": r.getSuggestion(propertyName, foundDecorator, signalAlternative),
	})
}

// handleMethodDefinition checks if a class method has a legacy decorator
func (r *LegacyDecoratorRule) handleMethodDefinition(node map[string]interface{}, filePath string) *patterns.Match {
	var methodName string
	if key, ok := node["key"].(map[string]interface{}); ok {
		if name, ok := key["name"].(string); ok {
			methodName = name
		}
	}

	// Check for legacy decorators
	legacyDecorators := map[string]string{
		"HostListener": "hostListener",
		"HostBinding": "hostBinding",
	}

	var foundDecorator string
	var signalAlternative string

	if decorators, ok := node["decorators"].([]interface{}); ok {
		for _, dec := range decorators {
			if decorator, ok := dec.(map[string]interface{}); ok {
				if expr, ok := decorator["expression"].(map[string]interface{}); ok {
					// Check for both @Decorator and @Decorator()
					if callee, ok := expr["callee"].(map[string]interface{}); ok {
						if name, ok := callee["name"].(string); ok {
							if alternative, exists := legacyDecorators[name]; exists {
								foundDecorator = name
								signalAlternative = alternative
								break
							}
						}
					} else if name, ok := expr["name"].(string); ok {
						if alternative, exists := legacyDecorators[name]; exists {
							foundDecorator = name
							signalAlternative = alternative
							break
						}
					}
				}
			}
		}
	}

	if foundDecorator == "" {
		return nil
	}

	description := fmt.Sprintf("Method '%s' uses legacy @%s decorator", methodName, foundDecorator)

	return helpers.CreateMatch(r, node, filePath, description, map[string]interface{}{
		"methodName": methodName,
		"decorator": foundDecorator,
		"signalAlternative": signalAlternative,
		"severity": "medium",
		"suggestion": r.getSuggestion(methodName, foundDecorator, signalAlternative),
	})
}

// getSuggestion provides suggestions for migrating to signal-based alternatives
func (r *LegacyDecoratorRule) getSuggestion(name, decorator, signalAlternative string) string {
	return fmt.Sprintf(`⚠️ Legacy Angular Decorator Detected

Problem:
The @%s decorator is considered legacy and has been replaced by a signal-based alternative.

Recommended Solution:
Replace the decorator with its signal-based equivalent:

Before:
@%s()
%s: Type;

After:
%s = %s<Type>();

Benefits:
- Better type safety
- Improved change detection
- More predictable reactivity
- Better integration with Angular's new reactivity system

Migration Steps:
1. Import the signal function from '@angular/core'
2. Replace the decorator with the signal function
3. Update any template bindings to use the new signal syntax
4. Update any component logic to use the signal's value() method

Note: Some decorators may require additional changes to the component's logic to work with signals.`,
		decorator,
		decorator,
		name,
		name,
		signalAlternative)
} 