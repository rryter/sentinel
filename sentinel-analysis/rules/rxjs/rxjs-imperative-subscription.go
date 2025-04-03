package main

import (
	"fmt"
	"sentinel/indexing/internal/patterns"
	"sentinel/indexing/internal/patterns/helpers"
	"strings"
)

// DirectSubscriptionRule checks for direct RxJS subscriptions in components
type DirectSubscriptionRule struct {
	patterns.BaseRule
}

// AssignmentInfo represents information about a variable assignment in a subscribe callback
type AssignmentInfo struct {
	Type   string `json:"type"`   // AssignmentExpression, MemberExpression
	Name   string `json:"name"`   // Variable or property name
	Line   int    `json:"line"`   // Line number
	Column int    `json:"column"` // Column number
}

// NewRule is the exported symbol that will be looked up by the plugin loader
func CreateRuleRxjsImperativeSubscription() patterns.Rule {
	patterns.Debug("Creating DirectSubscriptionRule")
	return &DirectSubscriptionRule{
		BaseRule: patterns.NewBaseRule(
			"rxjs-imperative-subscription",
			"[RxJS] Imperative Subscription Usage",
			"Identifies potentially unsafe RxJS subscriptions with assignments that should use async pipe",
		),
	}
}

// Match implements the Rule interface
func (r *DirectSubscriptionRule) Match(node map[string]interface{}, filePath string) []patterns.Match {

	body, ok := helpers.GetProgramBody(node, filePath)
	if !ok {
		return nil
	}

	matches := helpers.ProcessASTNodes(body, filePath, 1000, func(node map[string]interface{}) []patterns.Match {
		var nodeMatches []patterns.Match

		if nodeType, ok := node["type"].(string); ok && nodeType == "CallExpression" {
			if callee, ok := node["callee"].(map[string]interface{}); ok {
				if calleeType, ok := callee["type"].(string); ok && calleeType == "MemberExpression" {
					if property, ok := callee["property"].(map[string]interface{}); ok {
						if name, ok := property["name"].(string); ok && name == "subscribe" {
							// Check for assignments in the callback function
							if args, ok := node["arguments"].([]interface{}); ok && len(args) > 0 {
								// Get the first argument (callback function)
								if callback, ok := args[0].(map[string]interface{}); ok {
									if assignments := r.findAssignmentsInCallback(callback); len(assignments) > 0 {
										if match := r.createMatch(node, assignments, filePath); match != nil {
											nodeMatches = append(nodeMatches, *match)
										}
									}
								}
							}
						}
					}
				}
			}
		}

		return nodeMatches
	})

	return matches
}

// findAssignmentsInCallback finds assignments in a subscribe callback function
func (r *DirectSubscriptionRule) findAssignmentsInCallback(node map[string]interface{}) []AssignmentInfo {
	var assignments []AssignmentInfo

	// Handle arrow functions and regular functions
	var body interface{}
	if nodeType, ok := node["type"].(string); ok {
		switch nodeType {
		case "ArrowFunctionExpression", "FunctionExpression":
			if b, ok := node["body"].(map[string]interface{}); ok {
				body = b
			}
		}
	}

	if body == nil {
		return assignments
	}

	// Process the function body for assignments
	patterns.TraverseAST(body.(map[string]interface{}), func(n map[string]interface{}) bool {
		if nodeType, ok := n["type"].(string); ok && nodeType == "AssignmentExpression" {
			if left, ok := n["left"].(map[string]interface{}); ok {
				if leftType, ok := left["type"].(string); ok {
					switch leftType {
					case "Identifier":
						if name, ok := left["name"].(string); ok {
							loc := helpers.GetNodeLocation(left)
							assignments = append(assignments, AssignmentInfo{
								Type:   "AssignmentExpression",
								Name:   name,
								Line:   loc.Line,
								Column: loc.Column,
							})
						}
					case "MemberExpression":
						if name := r.getMemberExpressionName(left); name != "" {
							loc := helpers.GetNodeLocation(left)
							assignments = append(assignments, AssignmentInfo{
								Type:   "MemberExpression",
								Name:   name,
								Line:   loc.Line,
								Column: loc.Column,
							})
						}
					}
				}
			}
		}
		return true
	})

	return assignments
}

// getMemberExpressionName gets the full name of a member expression (e.g., "this.data")
func (r *DirectSubscriptionRule) getMemberExpressionName(node map[string]interface{}) string {
	if object, ok := node["object"].(map[string]interface{}); ok {
		if property, ok := node["property"].(map[string]interface{}); ok {
			var objName, propName string

			// Get object name
			if objType, ok := object["type"].(string); ok && objType == "ThisExpression" {
				objName = "this"
			} else if name, ok := object["name"].(string); ok {
				objName = name
			}

			// Get property name
			if name, ok := property["name"].(string); ok {
				propName = name
			}

			if objName != "" && propName != "" {
				return fmt.Sprintf("%s.%s", objName, propName)
			}
		}
	}
	return ""
}

// createMatch creates a Match object for a subscribe call with assignments
func (r *DirectSubscriptionRule) createMatch(node map[string]interface{}, assignments []AssignmentInfo, filePath string) *patterns.Match {
	// Create a description that includes the assignments found
	var assignmentDescs []string
	for _, a := range assignments {
		assignmentDescs = append(assignmentDescs, fmt.Sprintf("%s (line %d)", a.Name, a.Line))
	}

	description := fmt.Sprintf(
		"Found direct subscription with assignments: %s. Consider using async pipe in template instead: '*ngIf=\"data$ | async as data\"'",
		strings.Join(assignmentDescs, ", "),
	)

	return helpers.CreateMatch(r, node, filePath, description, map[string]interface{}{
		"assignments": assignments,
	})
}
