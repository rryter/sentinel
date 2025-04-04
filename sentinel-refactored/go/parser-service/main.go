package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"time"

	"sentinel-refactored/go/parser"
)

// Request represents the incoming JSON request
type Request struct {
	Filename string `json:"filename"`
	Code     string `json:"code"`
}

// Response represents the outgoing JSON response
type Response struct {
	Success bool                   `json:"success"`
	AST     interface{}            `json:"ast,omitempty"`
	Errors  []string               `json:"errors,omitempty"`
	Error   string                 `json:"error,omitempty"`
	Stats   map[string]interface{} `json:"stats,omitempty"`
}

func main() {
	// Parse command line flags
	batchMode := flag.Bool("batch", false, "Process multiple files in batch mode")
	flag.Parse()

	if *batchMode {
		ProcessBatch()
	} else {
		ProcessSingleFile()
	}
}

// ProcessSingleFile handles parsing a single file
func ProcessSingleFile() {
	startTime := time.Now()
	fileCount := 0

	// Read all input from stdin
	inputData, err := io.ReadAll(os.Stdin)
	if err != nil {
		outputError(fmt.Sprintf("Error reading stdin: %v", err), fileCount, startTime)
		return
	}

	// Parse the input JSON
	var req Request
	if err := json.Unmarshal(inputData, &req); err != nil {
		outputError(fmt.Sprintf("Error parsing JSON input: %v", err), fileCount, startTime)
		return
	}

	// Process the file
	fileCount++
	result, err := parser.Parse(req.Filename, req.Code)
	if err != nil {
		outputError(fmt.Sprintf("Error parsing code: %v", err), fileCount, startTime)
		return
	}

	// Extract the AST from the result
	var ast map[string]interface{}
	if result.AstJSON != nil {
		if err := json.Unmarshal(result.AstJSON, &ast); err != nil {
			outputError(fmt.Sprintf("Error extracting AST: %v", err), fileCount, startTime)
			return
		}
	}

	// Build the response
	resp := Response{
		Success: result.Success,
		AST: map[string]interface{}{
			"filePath": req.Filename,
			"type":     "Program",
			"body":     ast["node_types"],
			// Add additional fields based on what the front-end expects
		},
		Errors: result.Errors,
		Stats: map[string]interface{}{
			"filesProcessed": fileCount,
			"elapsedTimeMs":  time.Since(startTime).Milliseconds(),
		},
	}

	// Send the response
	respJSON, err := json.Marshal(resp)
	if err != nil {
		outputError(fmt.Sprintf("Error serializing response: %v", err), fileCount, startTime)
		return
	}

	fmt.Println(string(respJSON))
}

func outputError(message string, fileCount int, startTime time.Time) {
	resp := Response{
		Success: false,
		Error:   message,
		Stats: map[string]interface{}{
			"filesProcessed": fileCount,
			"elapsedTimeMs":  time.Since(startTime).Milliseconds(),
		},
	}

	respJSON, _ := json.Marshal(resp)
	fmt.Println(string(respJSON))
} 