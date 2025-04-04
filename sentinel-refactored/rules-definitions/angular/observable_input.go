// rule definition file: sentinel-refactored/rules-definitions/angular/observable_input.go
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"reflect"
	"regexp"
	"strings"

	"sentinel-refactored/internal/astutil"
	"sentinel-refactored/pkg/rule_interface"
	// No access to internal/analysis from here due to plugin constraints
	// We also avoid depending on pkg/log from rule definitions for simplicity.
)

// Define the rule struct
type AngularObservableInputRule struct{}

// --- Rule Interface Implementation --- 

func (r *AngularObservableInputRule) ID() string {
	return "angular-observable-input"
}

func (r *AngularObservableInputRule) Name() string {
	return "Angular Observable Input"
}

func (r *AngularObservableInputRule) Description() string {
	return "Checks for @Input() properties typed as Observable, suggesting alternatives like signals or async pipe."
}

func (r *AngularObservableInputRule) Category() string {
	return "angular"
}

// Debug helper function
func debugLog(message string) {
	f, err := os.OpenFile("/tmp/rule-debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	f.WriteString(message + "\n")
}

// Debug helper to dump JSON
func debugJSON(prefix string, v interface{}) {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		debugLog(fmt.Sprintf("%s: ERROR marshaling: %v", prefix, err))
		return
	}
	debugLog(fmt.Sprintf("%s: %s", prefix, string(data)))
}

// Check is the core logic for the rule.
func (r *AngularObservableInputRule) Check(filePath string, fileContent string, ast map[string]interface{}) ([]rule_interface.Match, error) {
	var matches []rule_interface.Match

	debugLog(fmt.Sprintf("Checking file: %s", filePath))
	
	// Debugging the AST structure
	astType := reflect.TypeOf(ast).String()
	debugLog(fmt.Sprintf("AST type: %s", astType))
	
	for key, value := range ast {
		debugLog(fmt.Sprintf("Top-level key: %s (type: %T)", key, value))
	}
	
	// Check for imports - either through program.body or direct body
	var bodyArray []interface{}
	
	if program, hasProgramNode := ast["program"].(map[string]interface{}); hasProgramNode {
		// Original ESTree AST structure
		debugLog("AST has program node (ESTree structure)")
		if body, ok := program["body"].([]interface{}); ok {
			bodyArray = body
		}
	} else if body, hasBodyArray := ast["body"].([]interface{}); hasBodyArray {
		// Oxc native AST structure
		debugLog("AST has direct body array (Oxc native structure)")
		bodyArray = body
	} else {
		debugLog("AST does not have expected structure (no program.body or body)")
		// Dump AST for debugging
		if data, err := json.MarshalIndent(ast, "", "  "); err == nil {
			debugLog(fmt.Sprintf("AST dump: %s", string(data[:500]))) // First 500 chars to avoid huge logs
		}
		return matches, nil
	}
	
	debugLog(fmt.Sprintf("Body array has %d elements", len(bodyArray)))
	
	// Look for Observable imports
	hasObservableImport := false
	hasOfImport := false
	
	for _, node := range bodyArray {
		nodeMap, ok := node.(map[string]interface{})
		if !ok {
			// Oxc might have serialized differently
			nodeStr, isStr := node.(string)
			if !isStr {
				continue
			}
			if strings.Contains(nodeStr, "ImportDeclaration") && 
			   (strings.Contains(nodeStr, "Observable") || strings.Contains(nodeStr, "rxjs")) {
				hasObservableImport = true
				debugLog("Found Observable import via string matching")
			}
			if strings.Contains(nodeStr, "ImportDeclaration") && 
			   (strings.Contains(nodeStr, "of") || strings.Contains(nodeStr, "rxjs")) {
				hasOfImport = true
				debugLog("Found 'of' import via string matching")
			}
			continue
		}
		
		nodeType := astutil.GetNodeType(nodeMap)
		if nodeType == "ImportDeclaration" {
			source, hasSource := astutil.GetMapProperty(nodeMap, "source")
			if !hasSource {
				continue
			}
			
			if value, ok := astutil.GetStringProperty(source, "value"); ok && value == "rxjs" {
				specifiers, ok := astutil.GetArrayProperty(nodeMap, "specifiers")
				if !ok {
					continue
				}
				
				for _, spec := range specifiers {
					specMap, ok := spec.(map[string]interface{})
					if !ok {
						continue
					}
					
					imported, ok := astutil.GetMapProperty(specMap, "imported")
					if !ok {
						continue
					}
					
					if name, ok := astutil.GetStringProperty(imported, "name"); ok {
						if name == "Observable" {
							hasObservableImport = true
							debugLog("Found Observable import")
						}
						if name == "of" {
							hasOfImport = true
							debugLog("Found 'of' import")
						}
					}
				}
			}
		}
	}
	
	debugLog(fmt.Sprintf("Import check: Observable=%v, of=%v", hasObservableImport, hasOfImport))
	
	// If no Observable import, skip further analysis
	if !hasObservableImport && !hasOfImport {
		debugLog("No Observable imports found, skipping further analysis")
		return matches, nil
	}
	
	// DEBUG dump - only for target file
	if strings.Contains(filePath, "test-observable-input.ts") {
		astJson, _ := json.MarshalIndent(ast, "", "  ")
		os.WriteFile("/tmp/ast-target.json", astJson, 0644)
		debugLog("Saved full AST to /tmp/ast-target.json for debugging")
	}
	
	// Process AST to find components
	// Now traverse the rest of the AST to find @Input properties
	processStringNode := func(node string) {
		if strings.Contains(node, "PropertyDefinition") && 
		   strings.Contains(node, "Input") && 
		   strings.Contains(node, "Observable") {
			
			debugLog(fmt.Sprintf("Found potential Observable @Input via string matching: %s", 
				node[:min(100, len(node))]))
			
			// Try to extract property name using regex
			re := regexp.MustCompile(`name: "([^"]+)"`)
			nameMatches := re.FindStringSubmatch(node)
			propertyName := "<unknown>"
			if len(nameMatches) > 1 {
				propertyName = nameMatches[1]
			}
			
			message := fmt.Sprintf("Avoid using Observable for @Input property '%s'. Use signals or async pipe instead.", propertyName)
			
			// Create a simple match without precise location
			match := rule_interface.Match{
				RuleID:   r.ID(),
				Message:  message,
				Severity: rule_interface.SeverityWarning,
			}
			
			matches = append(matches, match)
			debugLog(fmt.Sprintf("MATCH FOUND: %s", message))
		}
	}
	
	processNode := func(node map[string]interface{}) bool {
		nodeType := astutil.GetNodeType(node)
		
		// Process only property definitions
		if nodeType == "PropertyDefinition" {
			propertyName := astutil.GetNodeName(node)
			
			debugLog(fmt.Sprintf("Found PropertyDefinition: %s", propertyName))
			
			// Check decorator
			hasInput := r.hasInputDecorator(node)
			debugLog(fmt.Sprintf("  Has @Input decorator: %v", hasInput))
			
			// Check type
			isObservable := r.isObservableType(node)
			debugLog(fmt.Sprintf("  Is Observable type: %v", isObservable))
			
			// Check initializer (may be initialized to Observable value)
			hasObservableInit := r.hasObservableInitializer(node)
			debugLog(fmt.Sprintf("  Has Observable initializer: %v", hasObservableInit))
			
			// Full property debug
			if propertyName == "observableInput" || propertyName == "observableWithInit" || 
			   propertyName == "test" {
				debugJSON("  Property node", node)
			}
			
			// Check for property with both initializer and type
			if hasInput && (isObservable || hasObservableInit) {
				if propertyName == "" {
					propertyName = "<unknown>"
				}
				message := fmt.Sprintf("Avoid using Observable for @Input property '%s'. Use signals or async pipe instead.", propertyName)
				
				match := astutil.CreateMatch(r, node, fileContent, filePath, message, rule_interface.SeverityWarning)
				matches = append(matches, match)
				debugLog(fmt.Sprintf("  MATCH FOUND: %s", message))
			}
		}
		return true // Continue traversal
	}
	
	// Process all nodes in the AST
	for _, node := range bodyArray {
		if nodeMap, ok := node.(map[string]interface{}); ok {
			astutil.Traverse(nodeMap, processNode)
		} else if nodeStr, ok := node.(string); ok {
			processStringNode(nodeStr)
		}
	}
	
	debugLog(fmt.Sprintf("Checking complete. Found %d matches", len(matches)))
	return matches, nil
}

// min is a helper to get the minimum of two ints
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// --- Rule Specific Logic --- 

// isObservableInputProperty checks if a node is a PropertyDefinition
// decorated with @Input() and typed as Observable<...>
func (r *AngularObservableInputRule) isObservableInputProperty(node map[string]interface{}) bool {
	hasInput := r.hasInputDecorator(node)
	isObservable := r.isObservableType(node)
	
	debugLog(fmt.Sprintf("isObservableInputProperty: hasInput=%v, isObservable=%v", hasInput, isObservable))
	
	return hasInput && isObservable
}

// hasInputDecorator checks for the @Input() decorator using astutil helpers.
func (r *AngularObservableInputRule) hasInputDecorator(node map[string]interface{}) bool {
	decorators, ok := astutil.GetArrayProperty(node, "decorators")
	if !ok {
		debugLog("No decorators found on property")
		return false
	}

	debugLog(fmt.Sprintf("Found %d decorators", len(decorators)))

	for i, decoratorInterface := range decorators {
		decorator, ok := decoratorInterface.(map[string]interface{})
		if !ok {
			debugLog(fmt.Sprintf("  Decorator %d is not a map", i))
			continue
		}
		
		debugJSON(fmt.Sprintf("  Decorator %d", i), decorator)
		
		expr, ok := astutil.GetMapProperty(decorator, "expression")
		if !ok {
			debugLog(fmt.Sprintf("  Decorator %d has no expression", i))
			continue
		}

		exprType := astutil.GetNodeType(expr)
		debugLog(fmt.Sprintf("  Decorator %d expression type: %s", i, exprType))
		
		if exprType == "CallExpression" {
			callee, ok := astutil.GetMapProperty(expr, "callee")
			if !ok {
				debugLog(fmt.Sprintf("  Decorator %d has no callee", i))
				continue
			}
			if name, _ := astutil.GetStringProperty(callee, "name"); name == "Input" {
				debugLog("  Found Input decorator!")
				return true
			} else {
				debugLog(fmt.Sprintf("  Decorator callee name: %s (not Input)", name))
			}
		} else if exprType == "Identifier" {
			if name, _ := astutil.GetStringProperty(expr, "name"); name == "Input" {
				debugLog("  Found Input decorator as Identifier!")
				return true
			} else {
				debugLog(fmt.Sprintf("  Decorator identifier name: %s (not Input)", name))
			}
		}
	}
	return false
}

// isObservableType checks if the property's type annotation is Observable using astutil helpers.
func (r *AngularObservableInputRule) isObservableType(node map[string]interface{}) bool {
	typeAnnotation, ok := astutil.GetMapProperty(node, "typeAnnotation")
	if !ok {
		debugLog("No typeAnnotation found on property")
		return false
	}
	
	debugJSON("TypeAnnotation", typeAnnotation)
	
	typeAnn, ok := astutil.GetMapProperty(typeAnnotation, "typeAnnotation")
	if !ok {
		debugLog("No nested typeAnnotation found")
		return false
	}
	
	debugJSON("Nested TypeAnnotation", typeAnn)

	nodeType := astutil.GetNodeType(typeAnn)
	debugLog(fmt.Sprintf("Type annotation node type: %s", nodeType))
	
	if nodeType == "TSTypeReference" {
		typeNameMap, ok := astutil.GetMapProperty(typeAnn, "typeName")
		if !ok {
			debugLog("No typeName in TSTypeReference")
			return false
		}
		
		debugJSON("TypeName", typeNameMap)
		
		if name, _ := astutil.GetStringProperty(typeNameMap, "name"); name == "Observable" {
			debugLog("Found Observable type!")
			return true
		} else {
			debugLog(fmt.Sprintf("Type name: %s (not Observable)", name))
		}
	}
	return false
}

// createMatch is removed as astutil.CreateMatch is now used directly in Check.

// --- AST Traversal Helper (Simplified) is removed as astutil.Traverse is used. ---

// --- Exported Factory Function --- 

// CreateRule is the required exported function for the plugin loader.
// The name convention is important (CreateRule + PascalCase Rule Name without .go).
func CreateRule() rule_interface.Rule {
	return &AngularObservableInputRule{}
}

// hasObservableInitializer checks if the property is initialized with an observable value
func (r *AngularObservableInputRule) hasObservableInitializer(node map[string]interface{}) bool {
	initializer, ok := astutil.GetMapProperty(node, "value")
	if !ok {
		return false
	}
	
	// Check for of(...) calls which return Observable
	if astutil.GetNodeType(initializer) == "CallExpression" {
		callee, ok := astutil.GetMapProperty(initializer, "callee")
		if !ok {
			return false
		}
		
		if calleeName, ok := astutil.GetStringProperty(callee, "name"); ok && calleeName == "of" {
			return true
		}
	}
	
	// Check for new Observable(...) construction
	if astutil.GetNodeType(initializer) == "NewExpression" {
		callee, ok := astutil.GetMapProperty(initializer, "callee")
		if !ok {
			return false
		}
		
		if calleeName, ok := astutil.GetStringProperty(callee, "name"); ok && calleeName == "Observable" {
			return true
		}
	}
	
	return false
} 