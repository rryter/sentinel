package main

import (
	"sentinel/indexing/internal/patterns"
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
	body, ok := patterns.GetProgramBody(node, filePath)
	if !ok {
		return nil
	}

	matches := patterns.ProcessASTNodes(body, filePath, 1000, func(node map[string]interface{}) []patterns.Match {
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
	// Check if this is a property definition
	if node["type"] != "PropertyDefinition" && node["type"] != "ClassProperty" {
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
	return patterns.CreateMatch(r, node, filePath, "Avoid using Observable inputs in Angular components", map[string]interface{}{
		"propertyName": node["key"].(map[string]interface{})["name"].(string),
	})
}

// handleMethodDefinition checks if a method has a legacy decorator
func (r *LegacyDecoratorRule) handleMethodDefinition(node map[string]interface{}, filePath string) *patterns.Match {
	// Check if this is a method definition
	if node["type"] != "MethodDefinition" {
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
	return patterns.CreateMatch(r, node, filePath, "Avoid using Observable inputs in Angular components", map[string]interface{}{
		"propertyName": node["key"].(map[string]interface{})["name"].(string),
	})
}

// isInputProperty checks if a node is an input property
func (r *LegacyDecoratorRule) isInputProperty(node map[string]interface{}) bool {
	if decorators, ok := node["decorators"].([]interface{}); ok {
		for _, decorator := range decorators {
			if d, ok := decorator.(map[string]interface{}); ok {
				if expr, ok := d["expression"].(map[string]interface{}); ok {
					if callee, ok := expr["callee"].(map[string]interface{}); ok {
						if name, ok := callee["name"].(string); ok && name == "Input" {
							return true
						}
					}
				}
			}
		}
	}
	return false
}

// isObservableType checks if a node has an Observable type
func (r *LegacyDecoratorRule) isObservableType(node map[string]interface{}) bool {
	if typeAnnotation, ok := node["typeAnnotation"].(map[string]interface{}); ok {
		if typeAnnotation["type"] == "TSTypeReference" {
			if typeName, ok := typeAnnotation["typeName"].(string); ok && typeName == "Observable" {
				return true
			}
		}
	}
	return false
} 