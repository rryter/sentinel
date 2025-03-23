package main

import (
	"fmt"
	"strings"

	"sentinel/indexing/internal/patterns"
	"sentinel/indexing/internal/patterns/helpers"
)

// TypeAssertionRule checks for TypeScript type assertions
type TypeAssertionRule struct {
	patterns.BaseRule
}

// AssertionContext represents the context in which a type assertion is used
type AssertionContext struct {
	isDOM           bool // DOM element assertions
	isThirdParty    bool // Third-party library integration
	isTypeNarrowing bool // Type narrowing scenario
	hasTypeGuard    bool // Has existing type guard
}

func CreateRuleTsTypeAssertions() patterns.Rule {
	patterns.Debug("Creating TypeAssertionRule")
	return &TypeAssertionRule{
		BaseRule: patterns.NewBaseRule(
			"ts-type-assertion",
			"[TypeScript] Type Assertion",
			"Identifies potentially unsafe TypeScript type assertions and suggests safer alternatives",
		),
	}
}

// Match implements the Rule interface
func (r *TypeAssertionRule) Match(node map[string]interface{}, filePath string) []patterns.Match {
	body, ok := helpers.GetProgramBody(node, filePath)
	if !ok {
		return nil
	}

	matches := helpers.ProcessASTNodes(body, filePath, 1000, func(node map[string]interface{}) []patterns.Match {
		var nodeMatches []patterns.Match

		if nodeType, ok := node["type"].(string); ok {
			switch nodeType {
			case "TSAsExpression":
				if match := r.handleAsExpression(node, filePath); match != nil {
					nodeMatches = append(nodeMatches, *match)
				}
			case "TSTypeAssertion":
				if match := r.handleTypeAssertion(node, filePath); match != nil {
					nodeMatches = append(nodeMatches, *match)
				}
			}
		}

		return nodeMatches
	})

	patterns.Debug("Found %d matches in file %s", len(matches), filePath)
	return matches
}

// analyzeContext determines the context in which the type assertion is used
func (r *TypeAssertionRule) analyzeContext(node map[string]interface{}) AssertionContext {
	return AssertionContext{
		isDOM:           r.isDOMAssertion(node),
		isThirdParty:    r.isThirdPartyIntegration(node),
		isTypeNarrowing: r.isTypeNarrowing(node),
		hasTypeGuard:    r.hasTypeGuard(node),
	}
}

// isDOMAssertion checks if the assertion is related to DOM elements
func (r *TypeAssertionRule) isDOMAssertion(node map[string]interface{}) bool {
	assertedType := helpers.ExtractTypeString(node)
	return strings.HasPrefix(assertedType, "HTML") || strings.HasSuffix(assertedType, "Element")
}

// isThirdPartyIntegration checks if the assertion is related to third-party library integration
func (r *TypeAssertionRule) isThirdPartyIntegration(node map[string]interface{}) bool {
	// This is a simplified check. In a real implementation, you'd want to:
	// 1. Check import statements
	// 2. Check if the expression comes from a third-party module
	// 3. Check if it's in a file that integrates with external libraries
	return false
}

// isTypeNarrowing checks if the assertion is used for type narrowing
func (r *TypeAssertionRule) isTypeNarrowing(node map[string]interface{}) bool {
	expressionType := helpers.GetExpressionType(node)
	if expressionType == "any" || expressionType == "unknown" {
		return true
	}

	assertedType := helpers.ExtractTypeString(node)
	return helpers.IsMoreSpecificType(expressionType, assertedType)
}

// hasTypeGuard checks if there's an existing type guard that could be used instead
func (r *TypeAssertionRule) hasTypeGuard(node map[string]interface{}) bool {
	// This would need to analyze the surrounding code for type guards
	// For now, return false as a placeholder
	return false
}

// getSeverityLevel determines the severity of the type assertion
func (r *TypeAssertionRule) getSeverityLevel(context AssertionContext) string {
	if context.isDOM {
		return "low" // DOM assertions are common and often necessary
	}
	if context.isThirdParty {
		return "medium" // Third-party integrations might require assertions
	}
	if context.hasTypeGuard {
		return "high" // Type guard should be used instead
	}
	if context.isTypeNarrowing {
		return "medium" // Type narrowing from any/unknown is sometimes necessary
	}
	return "high" // Default to high severity for other cases
}

// getSuggestion provides alternative approaches based on the context
func (r *TypeAssertionRule) getSuggestion(context AssertionContext, assertedType string) string {
	if context.hasTypeGuard {
		return fmt.Sprintf("Use the existing type guard instead of type assertion")
	}
	if context.isTypeNarrowing {
		return fmt.Sprintf("Consider creating a type guard function: 'function is%s(value: unknown): value is %s'", assertedType, assertedType)
	}
	if context.isDOM {
		return fmt.Sprintf("Consider using querySelector with type guard: 'if (element instanceof %s)'", assertedType)
	}
	return "Consider using type guards or proper type definitions instead of assertions"
}

// handleAsExpression handles 'as' type assertions
func (r *TypeAssertionRule) handleAsExpression(node map[string]interface{}, filePath string) *patterns.Match {
	assertedType := helpers.ExtractTypeString(node["typeAnnotation"].(map[string]interface{}))
	context := r.analyzeContext(node)

	return helpers.CreateMatch(r, node, filePath,
		fmt.Sprintf("Type assertion using 'as' to type '%s'", assertedType),
		map[string]interface{}{
			"assertedType":  assertedType,
			"assertionType": "as",
			"severity":      r.getSeverityLevel(context),
			"suggestion":    r.getSuggestion(context, assertedType),
			"isDOM":         context.isDOM,
			"isThirdParty":  context.isThirdParty,
			"hasTypeGuard":  context.hasTypeGuard,
		})
}

// handleTypeAssertion handles angle-bracket type assertions
func (r *TypeAssertionRule) handleTypeAssertion(node map[string]interface{}, filePath string) *patterns.Match {
	assertedType := helpers.ExtractTypeString(node["typeAnnotation"].(map[string]interface{}))
	context := r.analyzeContext(node)

	patterns.Debug("Found angle-bracket assertion to type '%s' in file %s", assertedType, filePath)

	return helpers.CreateMatch(r, node, filePath,
		fmt.Sprintf("Type assertion using angle-bracket syntax to type '%s' (consider using 'as' syntax instead)", assertedType),
		map[string]interface{}{
			"assertedType":  assertedType,
			"assertionType": "angle-bracket",
			"severity":      r.getSeverityLevel(context),
			"suggestion":    r.getSuggestion(context, assertedType),
			"isDOM":         context.isDOM,
			"isThirdParty":  context.isThirdParty,
			"hasTypeGuard":  context.hasTypeGuard,
		})
}
