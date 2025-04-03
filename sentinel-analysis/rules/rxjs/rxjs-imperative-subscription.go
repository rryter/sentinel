package main

import (
	"fmt"
	"sentinel/indexing/internal/patterns"
	"sentinel/indexing/internal/patterns/helpers"
	"strings"
)

// DirectSubscriptionRule checks for direct RxJS subscriptions in components
type DirectSubscriptionRule struct {
	*patterns.EnhancedBaseRule
}

// AssignmentInfo represents information about a variable assignment in a subscribe callback
type AssignmentInfo struct {
	Type       string `json:"type"`       // AssignmentExpression, MemberExpression
	Name       string `json:"name"`       // Variable or property name
	Line       int    `json:"line"`       // Line number
	Column     int    `json:"column"`     // Column number
	ValueType  string `json:"valueType"`  // Type of the value being assigned
	IsTypeSafe bool   `json:"isTypeSafe"` // Whether the assignment is type-safe
}

// NewRule is the exported symbol that will be looked up by the plugin loader
func CreateRuleRxjsImperativeSubscription() patterns.Rule {
	patterns.Debug("Creating DirectSubscriptionRule")
	return &DirectSubscriptionRule{
		EnhancedBaseRule: patterns.NewEnhancedBaseRule(
			"rxjs-imperative-subscription",
			"[RxJS] Imperative Subscription Usage",
			"Identifies potentially unsafe RxJS subscriptions with assignments that should use async pipe",
		),
	}
}

// Match implements the Rule interface
func (r *DirectSubscriptionRule) Match(node map[string]interface{}, filePath string) []patterns.Match {
	body, ok := r.GetProgramBody(node, filePath)
	if !ok {
		return nil
	}

	return helpers.ProcessASTNodes(body, filePath, 1000, func(node map[string]interface{}) []patterns.Match {
		if !r.isSubscribeCall(node) {
			return nil
		}

		assignments := r.findAssignmentsInCallback(node)
		if len(assignments) == 0 {
			return nil
		}

		if match := r.createMatch(node, assignments, filePath); match != nil {
			return []patterns.Match{*match}
		}
		return nil
	})
}

// isSubscribeCall checks if a node is a subscribe call
func (r *DirectSubscriptionRule) isSubscribeCall(node map[string]interface{}) bool {
	if r.GetNodeType(node) != "CallExpression" {
		return false
	}

	callee := r.GetNodePropertyMap(node, "callee")
	if callee == nil || r.GetNodeType(callee) != "MemberExpression" {
		return false
	}

	property := r.GetNodePropertyMap(callee, "property")
	return property != nil && r.GetNodeName(property) == "subscribe"
}

// findAssignmentsInCallback finds assignments in a subscribe callback function
func (r *DirectSubscriptionRule) findAssignmentsInCallback(node map[string]interface{}) []AssignmentInfo {
	args := r.GetNodePropertyArray(node, "arguments")
	if len(args) == 0 {
		return nil
	}

	callback, ok := args[0].(map[string]interface{})
	if !ok {
		return nil
	}

	body := r.getFunctionBody(callback)
	if body == nil {
		return nil
	}

	var assignments []AssignmentInfo
	patterns.TraverseAST(body, func(n map[string]interface{}) bool {
		if r.GetNodeType(n) != "AssignmentExpression" {
			return true
		}

		assignment := r.processAssignment(n)
		if assignment != nil {
			assignments = append(assignments, *assignment)
		}
		return true
	})

	return assignments
}

// getFunctionBody extracts the body from a function node
func (r *DirectSubscriptionRule) getFunctionBody(node map[string]interface{}) map[string]interface{} {
	nodeType, ok := node["type"].(string)
	if !ok {
		return nil
	}

	if nodeType != "ArrowFunctionExpression" && nodeType != "FunctionExpression" {
		return nil
	}

	body, ok := node["body"].(map[string]interface{})
	if !ok {
		return nil
	}

	return body
}

// processAssignment processes an assignment expression and returns AssignmentInfo
func (r *DirectSubscriptionRule) processAssignment(node map[string]interface{}) *AssignmentInfo {
	left := r.GetNodePropertyMap(node, "left")
	if left == nil {
		return nil
	}

	leftType := r.GetNodeType(left)
	var name string
	var assignmentType string

	switch leftType {
	case "Identifier":
		name = r.GetNodeName(left)
		assignmentType = "AssignmentExpression"
	case "MemberExpression":
		name = r.getMemberExpressionName(left)
		assignmentType = "MemberExpression"
	default:
		return nil
	}

	if name == "" {
		return nil
	}

	loc := helpers.GetNodeLocation(left)
	assignment := &AssignmentInfo{
		Type:   assignmentType,
		Name:   name,
		Line:   loc.Line,
		Column: loc.Column,
	}

	// Analyze the right side of the assignment
	if right := r.GetNodePropertyMap(node, "right"); right != nil {
		valueType := helpers.GetExpressionType(right)
		assignment.ValueType = valueType
		assignment.IsTypeSafe = leftType == "MemberExpression" || helpers.IsMoreSpecificType("any", valueType)
	}

	return assignment
}

// getMemberExpressionName gets the full name of a member expression (e.g., "this.data")
func (r *DirectSubscriptionRule) getMemberExpressionName(node map[string]interface{}) string {
	object := r.GetNodePropertyMap(node, "object")
	property := r.GetNodePropertyMap(node, "property")
	if object == nil || property == nil {
		return ""
	}

	var objName string
	if r.GetNodeType(object) == "ThisExpression" {
		objName = "this"
	} else {
		objName = r.GetNodeName(object)
	}

	propName := r.GetNodeName(property)
	if objName == "" || propName == "" {
		return ""
	}

	return fmt.Sprintf("%s.%s", objName, propName)
}

// createMatch creates a Match object for a subscribe call with assignments
func (r *DirectSubscriptionRule) createMatch(node map[string]interface{}, assignments []AssignmentInfo, filePath string) *patterns.Match {
	var assignmentDescs []string
	for _, a := range assignments {
		typeInfo := ""
		if a.ValueType != "" {
			typeInfo = fmt.Sprintf(" (type: %s)", a.ValueType)
		}
		assignmentDescs = append(assignmentDescs, fmt.Sprintf("%s%s (line %d)", a.Name, typeInfo, a.Line))
	}

	description := fmt.Sprintf(
		"Found direct subscription with assignments: %s. Consider using async pipe in template instead: '*ngIf=\"data$ | async as data\"'",
		strings.Join(assignmentDescs, ", "),
	)

	return helpers.CreateMatch(r, node, filePath, description, map[string]interface{}{
		"assignments": assignments,
	})
}
