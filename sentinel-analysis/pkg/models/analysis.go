package models

import (
	"encoding/json"
	"io"
)

// WriteAnalysisResults writes analysis results to a file
func WriteAnalysisResults(w io.Writer, results []AnalysisResult) error {
	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "  ")
	return encoder.Encode(results)
}
