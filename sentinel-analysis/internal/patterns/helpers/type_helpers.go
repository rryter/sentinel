package helpers

import (
	"sentinel/indexing/internal/patterns"
)

// TypeInfo represents information about a TypeScript type
type TypeInfo struct {
	Name       string
	IsGeneric  bool
	IsBuiltIn  bool
	IsNullable bool
}

// ExtractTypeString extracts a string representation of a type from an AST node
func ExtractTypeString(typeNode map[string]interface{}) string {
	if typeNode == nil {
		return "unknown"
	}

	typeStr, ok := typeNode["type"].(string)
	if !ok {
		return "unknown"
	}

	switch typeStr {
	case "TSTypeReference":
		if typeName, ok := typeNode["typeName"].(map[string]interface{}); ok {
			if name, ok := typeName["name"].(string); ok {
				return name
			}
			// Handle qualified names (e.g., Meta<T>)
			if left, ok := typeName["left"].(map[string]interface{}); ok {
				if name, ok := left["name"].(string); ok {
					return name
				}
			}
		}
	case "TSQualifiedName":
		if left, ok := typeNode["left"].(map[string]interface{}); ok {
			if name, ok := left["name"].(string); ok {
				patterns.Debug("Found qualified name: %s", name)
				return name
			}
		}
	case "TSStringKeyword":
		return "string"
	case "TSNumberKeyword":
		return "number"
	case "TSBooleanKeyword":
		return "boolean"
	case "TSObjectKeyword":
		return "object"
	case "TSAnyKeyword":
		return "any"
	case "TSUnknownKeyword":
		return "unknown"
	case "TSNeverKeyword":
		return "never"
	case "TSVoidKeyword":
		return "void"
	case "TSNullKeyword":
		return "null"
	case "TSUndefinedKeyword":
		return "undefined"
	case "TSTypeParameterInstantiation":
		// Handle generic type parameters
		if params, ok := typeNode["params"].([]interface{}); ok && len(params) > 0 {
			if param, ok := params[0].(map[string]interface{}); ok {
				return ExtractTypeString(param)
			}
		}
	}

	patterns.Debug("Unknown type structure: %v", typeNode)
	return "unknown"
}

// GetExpressionType gets the type of an expression from an AST node
func GetExpressionType(node map[string]interface{}) string {
	if expression, ok := node["expression"].(map[string]interface{}); ok {
		if exprType, ok := expression["type"].(string); ok {
			return exprType
		}
	}
	return "unknown"
}

// IsMoreSpecificType checks if targetType is more specific than sourceType
func IsMoreSpecificType(sourceType, targetType string) bool {
	// Common type narrowing patterns
	if sourceType == "object" || sourceType == "any" || sourceType == "unknown" {
		return true // Any more specific type is narrowing from these types
	}

	// Check for array/promise narrowing
	if sourceType == "Array" || sourceType == "Promise" {
		return true
	}

	return false
}
