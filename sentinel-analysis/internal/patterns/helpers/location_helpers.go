package helpers

import (
	"sentinel/indexing/internal/patterns"
	"strings"
)

// Location represents a position in a file
type Location struct {
	Line   int
	Column int
}

// GetNodeLocation gets the line and column information from a node
func GetNodeLocation(node map[string]interface{}) Location {
	if loc, ok := node["loc"].(map[string]interface{}); ok {
		if start, ok := loc["start"].(map[string]interface{}); ok {
			line, _ := start["line"].(float64)
			column, _ := start["column"].(float64)
			return Location{
				Line:   int(line),
				Column: int(column),
			}
		}
	}
	patterns.Debug("Could not get location information from node")
	return Location{}
}

// CalculateLineAndColumn calculates line and column numbers from character offset
func CalculateLineAndColumn(content string, offset int) (int, int) {
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
