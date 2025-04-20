package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"time"

	"sentinel-refactored/go/parser"
)

// BatchRequest represents a batch of files to parse
type BatchRequest struct {
	Files []struct {
		Filename string `json:"filename"`
		Code     string `json:"code"`
	} `json:"files"`
}

// BatchResponse represents the response for a batch of files
type BatchResponse struct {
	Success  bool                     `json:"success"`
	Results  map[string]FileResult    `json:"results,omitempty"`
	Error    string                   `json:"error,omitempty"`
	Stats    map[string]interface{}   `json:"stats,omitempty"`
}

// FileResult represents the result for a single file
type FileResult struct {
	Success bool        `json:"success"`
	AST     interface{} `json:"ast,omitempty"`
	Errors  []string    `json:"errors,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// ProcessBatch handles batch processing of multiple files
func ProcessBatch() {
	startTime := time.Now()
	
	// Read all input from stdin
	inputData, err := io.ReadAll(os.Stdin)
	if err != nil {
		outputBatchError(fmt.Sprintf("Error reading stdin: %v", err), startTime)
		return
	}
	
	// Parse the input JSON
	var req BatchRequest
	if err := json.Unmarshal(inputData, &req); err != nil {
		// Try parsing as a single file request
		var singleReq Request
		if jsonErr := json.Unmarshal(inputData, &singleReq); jsonErr == nil {
			// Convert to batch request with one file
			req.Files = []struct{
				Filename string `json:"filename"`
				Code     string `json:"code"`
			}{
				{
					Filename: singleReq.Filename,
					Code:     singleReq.Code,
				},
			}
		} else {
			outputBatchError(fmt.Sprintf("Error parsing JSON input: %v", err), startTime)
			return
		}
	}
	
	// Create a batch parser for optimal performance
	bp := parser.NewBatchParser()
	defer bp.Close()
	
	// Create a map to store files for parsing
	files := make(map[string]string)
	for _, file := range req.Files {
		files[file.Filename] = file.Code
	}
	
	// Process all files
	results := bp.ParseBatch(files)
	
	// Convert results to the expected format
	fileResults := make(map[string]FileResult)
	for filename, result := range results {
		var ast map[string]interface{}
		if result.AstJSON != nil {
			if err := json.Unmarshal(result.AstJSON, &ast); err != nil {
				fileResults[filename] = FileResult{
					Success: false,
					Error:   fmt.Sprintf("Error extracting AST: %v", err),
				}
				continue
			}
		}
		
		fileResults[filename] = FileResult{
			Success: result.Success,
			AST: map[string]interface{}{
				"filePath": filename,
				"type":     "Program", 
				"body":     ast["node_types"],
			},
			Errors: result.Errors,
		}
	}
	
	// Send the complete batch response
	resp := BatchResponse{
		Success: true,
		Results: fileResults,
		Stats: map[string]interface{}{
			"filesProcessed": len(req.Files),
			"elapsedTimeMs":  time.Since(startTime).Milliseconds(),
		},
	}
	
	// Send the response
	respJSON, err := json.Marshal(resp)
	if err != nil {
		outputBatchError(fmt.Sprintf("Error serializing response: %v", err), startTime)
		return
	}
	
	fmt.Println(string(respJSON))
}

func outputBatchError(message string, startTime time.Time) {
	resp := BatchResponse{
		Success: false,
		Error:   message,
		Stats: map[string]interface{}{
			"filesProcessed": 0,
			"elapsedTimeMs":  time.Since(startTime).Milliseconds(),
		},
	}
	
	respJSON, _ := json.Marshal(resp)
	fmt.Println(string(respJSON))
} 