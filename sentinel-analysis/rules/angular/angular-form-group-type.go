package main

import (
	"sentinel/indexing/internal/patterns"
)

// FormGroupTypeRule checks for FormGroup type declarations
type FormGroupTypeRule struct {
	patterns.BaseRule
}

// CreateRuleAngularFormGroupType creates a new FormGroupTypeRule
func CreateRuleAngularFormGroupType() patterns.Rule {
	return &FormGroupTypeRule{
		BaseRule: patterns.NewBaseRule(
			"angular-form-group-type",
			"[Angular] FormGroup Type",
			"Identifies FormGroup type declarations to ensure proper typing of form controls",
		),
	}
}

// Match implements the Rule interface
func (r *FormGroupTypeRule) Match(node map[string]interface{}, filePath string) []patterns.Match {
	body, ok := patterns.GetProgramBody(node, filePath)
	if !ok {
		return nil
	}

	matches := patterns.ProcessASTNodes(body, filePath, 1000, func(node map[string]interface{}) []patterns.Match {
		var nodeMatches []patterns.Match

		if nodeType, ok := node["type"].(string); ok {
			switch nodeType {
			case "TSTypeReference":
				if match := r.handleTypeReference(node, filePath); match != nil {
					nodeMatches = append(nodeMatches, *match)
				}
			}
		}

		return nodeMatches
	})

	return matches
}

// handleTypeReference checks if a type reference is a FormGroup type
func (r *FormGroupTypeRule) handleTypeReference(node map[string]interface{}, filePath string) *patterns.Match {
	// Check if this is a FormGroup type reference
	typeName, ok := node["typeName"].(string)
	if !ok || typeName != "FormGroup" {
		return nil
	}

	// Check if it has type parameters
	typeParams, ok := node["typeParameters"].([]interface{})
	if !ok || len(typeParams) == 0 {
		return nil
	}

	// Create a match
	return patterns.CreateMatch(r, node, filePath, "FormGroup type declaration found", map[string]interface{}{
		"typeName": typeName,
		"severity": "info",
		"suggestion": "Consider using a specific interface or type for your form controls to improve type safety",
	})
} 