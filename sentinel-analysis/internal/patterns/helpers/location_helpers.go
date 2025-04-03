package helpers

import (
	"sentinel/indexing/internal/patterns"
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
	return Location{}
}

// GetLocation extracts location information from a node
func GetLocation(node map[string]interface{}) patterns.Location {
	loc := patterns.Location{}
	if start, ok := node["start"].(float64); ok {
		loc.Start = int(start)
	}
	if end, ok := node["end"].(float64); ok {
		loc.End = int(end)
	}
	if line, ok := node["line"].(float64); ok {
		loc.Line = int(line)
	}
	if col, ok := node["column"].(float64); ok {
		loc.Column = int(col)
	}
	return loc
}
