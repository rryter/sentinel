package parser

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	customlog "sentinel-refactored/pkg/log"
)

// oxcInput defines the structure for sending data to the parser service.
type oxcInput struct {
	Filename string `json:"filename"`
	Code     string `json:"code"`
}

// batchInput defines the structure for sending multiple files to the parser service
type batchInput struct {
	Files []oxcInput `json:"files"`
}

// batchOutputResult represents a single file result in the batch response
type batchOutputResult struct {
	Success bool                   `json:"success"`
	AST     map[string]interface{} `json:"ast,omitempty"`
	Errors  []interface{}          `json:"errors,omitempty"`
}

// batchOutput defines the structure for receiving batch processing results
type batchOutput struct {
	Success bool                              `json:"success"`
	Results map[string]batchOutputResult      `json:"results,omitempty"`
	Error   string                            `json:"error,omitempty"`
	Stats   map[string]interface{}            `json:"stats,omitempty"`
}

// oxcOutput defines the structure for receiving data from the parser service.
type oxcOutput struct {
	Success bool                   `json:"success"`
	AST     map[string]interface{} `json:"ast,omitempty"`    // This holds the actual program, etc.
	Errors  []interface{}          `json:"errors,omitempty"` // These might be within the AST map from the service
	Error   string                 `json:"error,omitempty"`  // Top-level error message if parsing failed
	// Stats might be present but are not directly used by the parser interface
}

// OxcAdapter implements the Parser interface using the Go-Rust parser service.
type OxcAdapter struct {
	servicePath string
	mu          sync.Mutex // Protect concurrent calls if necessary
	
	// Performance metrics
	totalCalls       int
	totalDuration    time.Duration
	processDuration  time.Duration
	marshalDuration  time.Duration
	unmarshalDuration time.Duration
	startupDuration  time.Duration
}

// NewOxcAdapter creates a new OxcAdapter.
// It automatically tries to find the parser service binary.
func NewOxcAdapter() (*OxcAdapter, error) {
	customlog.Debugf("Creating new OxcAdapter")
	
	// Look for the parser-service in the base directory
	servicePath, err := filepath.Abs("parser-service")
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute path for parser service: %w", err)
	}
	customlog.Debugf("Parser service path: %s", servicePath)
	
	// Check if the service binary exists
	if _, err := os.Stat(servicePath); os.IsNotExist(err) {
		customlog.Errorf("Parser service binary not found at: %s", servicePath)
		return nil, fmt.Errorf("parser service binary not found: %w", err)
	}

	// Ensure it's executable
	if err := os.Chmod(servicePath, 0755); err != nil {
		customlog.Warnf("Failed to set executable permissions on parser service: %v", err)
	}

	return &OxcAdapter{
		servicePath: servicePath,
	}, nil
}

// ParseBatch processes multiple files in a single parser service call
func (p *OxcAdapter) ParseBatch(files map[string]string) (map[string]map[string]interface{}, error) {
	if len(files) == 0 {
		return nil, nil
	}
	
	parseStart := time.Now()
	defer func() {
		totalTime := time.Since(parseStart)
		p.totalDuration += totalTime
		p.totalCalls++
		
		// Log performance stats every 20 calls
		if p.totalCalls > 0 && p.totalCalls%20 == 0 {
			avgTotal := p.totalDuration / time.Duration(p.totalCalls)
			avgProcess := p.processDuration / time.Duration(p.totalCalls)
			avgMarshal := p.marshalDuration / time.Duration(p.totalCalls)
			avgUnmarshal := p.unmarshalDuration / time.Duration(p.totalCalls)
			avgStartup := p.startupDuration / time.Duration(p.totalCalls)
			
			customlog.Infof("PARSER PERFORMANCE (after %d calls):", p.totalCalls)
			customlog.Infof("  Avg total time:    %v", avgTotal)
			customlog.Infof("  Avg process time:  %v (%d%%)", avgProcess, int(float64(avgProcess)/float64(avgTotal)*100))
			customlog.Infof("  Avg marshal time:  %v (%d%%)", avgMarshal, int(float64(avgMarshal)/float64(avgTotal)*100))
			customlog.Infof("  Avg unmarshal time:%v (%d%%)", avgUnmarshal, int(float64(avgUnmarshal)/float64(avgTotal)*100))
			customlog.Infof("  Avg startup time:  %v (%d%%)", avgStartup, int(float64(avgStartup)/float64(avgTotal)*100))
			customlog.Infof("  Other time:        %v (%d%%)", 
				avgTotal - (avgProcess + avgMarshal + avgUnmarshal + avgStartup),
				int(float64(avgTotal - (avgProcess + avgMarshal + avgUnmarshal + avgStartup))/float64(avgTotal)*100))
		}
	}()
	
	customlog.Debugf("Batch parsing %d files", len(files))
	
	p.mu.Lock() // Ensure only one parse call runs at a time
	defer p.mu.Unlock()

	// Prepare batch input
	var input batchInput
	input.Files = make([]oxcInput, 0, len(files))
	
	for filename, code := range files {
		input.Files = append(input.Files, oxcInput{
			Filename: filename,
			Code:     code,
		})
	}

	marshalStart := time.Now()
	inputJSON, err := json.Marshal(input)
	marshalTime := time.Since(marshalStart)
	p.marshalDuration += marshalTime
	
	if err != nil {
		return nil, fmt.Errorf("oxc: failed to marshal batch input: %w", err)
	}
	customlog.Debugf("Batch input JSON created, length: %d bytes (marshal took: %v)", len(inputJSON), marshalTime)

	customlog.Debugf("Creating parser process for batch: %s", p.servicePath)
	cmd := exec.Command(p.servicePath, "--batch")

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	customlog.Debugf("Opening stdin pipe for batch")
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("oxc: failed to create stdin pipe for batch: %w", err)
	}

	startupStart := time.Now()
	customlog.Debugf("Starting parser process for batch")
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("oxc: failed to start parser service for batch: %w", err)
	}
	startupTime := time.Since(startupStart)
	p.startupDuration += startupTime
	customlog.Debugf("Batch process started (startup took: %v)", startupTime)

	customlog.Debugf("Writing batch input to parser service")
	// Write input and close stdin
	_, err = stdin.Write(inputJSON)
	closeErr := stdin.Close() // Close stdin to signal end of input
	if err != nil {
		// Best effort kill if write failed
		customlog.Errorf("Failed to write to stdin for batch: %v", err)
		_ = cmd.Process.Kill()
		return nil, fmt.Errorf("oxc: failed to write to stdin for batch: %w", err)
	}
	if closeErr != nil {
		// Best effort kill if close failed
		customlog.Errorf("Failed to close stdin for batch: %v", closeErr)
		_ = cmd.Process.Kill()
		return nil, fmt.Errorf("oxc: failed to close stdin for batch: %w", closeErr)
	}
	customlog.Debugf("Batch input written and stdin closed")

	// Add a timeout for the command - longer for batch
	done := make(chan error, 1)
	processStart := time.Now()
	go func() {
		done <- cmd.Wait()
	}()
	
	var processErr error
	select {
	case <-time.After(30 * time.Second): // Longer timeout for batch processing
		customlog.Errorf("Batch parser execution timed out after 30 seconds")
		_ = cmd.Process.Kill()
		return nil, fmt.Errorf("oxc: batch parser service execution timed out after 30 seconds")
	case err := <-done:
		processErr = err
	}
	processTime := time.Since(processStart)
	p.processDuration += processTime
	customlog.Debugf("Batch process completed (execution took: %v)", processTime)
	
	if processErr != nil {
		customlog.Errorf("Batch parser service execution failed: %v", processErr)
		customlog.Errorf("Stderr: %s", stderr.String())
		return nil, fmt.Errorf("oxc: batch parser service execution failed: %w\nstderr: %s", processErr, stderr.String())
	}

	customlog.Debugf("Batch parsing complete, stdout length: %d bytes", stdout.Len())
	
	// If we got no output but no error either, that's suspicious
	if stdout.Len() == 0 {
		customlog.Errorf("Batch parser returned empty output with no error")
		return nil, fmt.Errorf("oxc: batch parser returned empty output")
	}

	// Decode the output
	unmarshalStart := time.Now()
	var output batchOutput
	if err := json.Unmarshal(stdout.Bytes(), &output); err != nil {
		customlog.Errorf("Failed to unmarshal batch parser output: %v", err)
		customlog.Errorf("Raw stdout: %s", stdout.String())
		return nil, fmt.Errorf("oxc: failed to unmarshal batch parser output: %w\nstdout: %s", err, stdout.String())
	}
	unmarshalTime := time.Since(unmarshalStart)
	p.unmarshalDuration += unmarshalTime
	customlog.Debugf("Batch output unmarshaled (took: %v)", unmarshalTime)

	// Check for application-level errors reported by the service
	if !output.Success {
		customlog.Errorf("Batch parsing failed: %s", output.Error)
		return nil, fmt.Errorf("oxc: batch parsing failed: %s", output.Error)
	}

	// Process results
	results := make(map[string]map[string]interface{})
	for filename, result := range output.Results {
		if result.Success {
			results[filename] = result.AST
		}
	}
	
	customlog.Debugf("Successfully batch parsed %d files", len(results))
	return results, nil
}

// Parse executes the Go-Rust parser service to parse the given code.
func (p *OxcAdapter) Parse(filePath string, content string) (map[string]interface{}, error) {
	parseStart := time.Now()
	defer func() {
		totalTime := time.Since(parseStart)
		p.totalDuration += totalTime
		p.totalCalls++
		
		// Log performance stats every 20 calls
		if p.totalCalls > 0 && p.totalCalls%20 == 0 {
			avgTotal := p.totalDuration / time.Duration(p.totalCalls)
			avgProcess := p.processDuration / time.Duration(p.totalCalls)
			avgMarshal := p.marshalDuration / time.Duration(p.totalCalls)
			avgUnmarshal := p.unmarshalDuration / time.Duration(p.totalCalls)
			avgStartup := p.startupDuration / time.Duration(p.totalCalls)
			
			customlog.Infof("PARSER PERFORMANCE (after %d calls):", p.totalCalls)
			customlog.Infof("  Avg total time:    %v", avgTotal)
			customlog.Infof("  Avg process time:  %v (%d%%)", avgProcess, int(float64(avgProcess)/float64(avgTotal)*100))
			customlog.Infof("  Avg marshal time:  %v (%d%%)", avgMarshal, int(float64(avgMarshal)/float64(avgTotal)*100))
			customlog.Infof("  Avg unmarshal time:%v (%d%%)", avgUnmarshal, int(float64(avgUnmarshal)/float64(avgTotal)*100))
			customlog.Infof("  Avg startup time:  %v (%d%%)", avgStartup, int(float64(avgStartup)/float64(avgTotal)*100))
			customlog.Infof("  Other time:        %v (%d%%)", 
				avgTotal - (avgProcess + avgMarshal + avgUnmarshal + avgStartup),
				int(float64(avgTotal - (avgProcess + avgMarshal + avgUnmarshal + avgStartup))/float64(avgTotal)*100))
		}
	}()
	
	customlog.Debugf("Parsing file: %s (content length: %d)", filePath, len(content))
	
	p.mu.Lock() // Ensure only one parse call runs at a time if needed
	defer p.mu.Unlock()

	input := oxcInput{
		Filename: filePath,
		Code:     content,
	}

	marshalStart := time.Now()
	inputJSON, err := json.Marshal(input)
	marshalTime := time.Since(marshalStart)
	p.marshalDuration += marshalTime
	
	if err != nil {
		return nil, fmt.Errorf("oxc: failed to marshal input: %w", err)
	}
	customlog.Debugf("Input JSON created, length: %d bytes (marshal took: %v)", len(inputJSON), marshalTime)

	customlog.Debugf("Creating parser process: %s", p.servicePath)
	cmd := exec.Command(p.servicePath)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	customlog.Debugf("Opening stdin pipe")
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("oxc: failed to create stdin pipe: %w", err)
	}

	startupStart := time.Now()
	customlog.Debugf("Starting parser process")
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("oxc: failed to start parser service: %w", err)
	}
	startupTime := time.Since(startupStart)
	p.startupDuration += startupTime
	customlog.Debugf("Process started (startup took: %v)", startupTime)

	customlog.Debugf("Writing input to parser service")
	// Write input and close stdin
	_, err = stdin.Write(inputJSON)
	closeErr := stdin.Close() // Close stdin to signal end of input
	if err != nil {
		// Best effort kill if write failed
		customlog.Errorf("Failed to write to stdin: %v", err)
		_ = cmd.Process.Kill()
		return nil, fmt.Errorf("oxc: failed to write to stdin: %w", err)
	}
	if closeErr != nil {
		// Best effort kill if close failed
		customlog.Errorf("Failed to close stdin: %v", closeErr)
		_ = cmd.Process.Kill()
		return nil, fmt.Errorf("oxc: failed to close stdin: %w", closeErr)
	}
	customlog.Debugf("Input written and stdin closed")

	// Add a timeout for the command
	done := make(chan error, 1)
	processStart := time.Now()
	go func() {
		done <- cmd.Wait()
	}()
	
	var processErr error
	select {
	case <-time.After(10 * time.Second):
		customlog.Errorf("Parser execution timed out after 10 seconds")
		_ = cmd.Process.Kill()
		return nil, fmt.Errorf("oxc: parser service execution timed out after 10 seconds")
	case err := <-done:
		processErr = err
	}
	processTime := time.Since(processStart)
	p.processDuration += processTime
	customlog.Debugf("Process completed (execution took: %v)", processTime)
	
	if processErr != nil {
		customlog.Errorf("Parser service execution failed: %v", processErr)
		customlog.Errorf("Stderr: %s", stderr.String())
		return nil, fmt.Errorf("oxc: parser service execution failed: %w\nstderr: %s", processErr, stderr.String())
	}

	customlog.Debugf("Parsing complete, stdout length: %d bytes", stdout.Len())
	
	// If we got no output but no error either, that's suspicious
	if stdout.Len() == 0 {
		customlog.Errorf("Parser returned empty output with no error")
		return nil, fmt.Errorf("oxc: parser returned empty output")
	}

	// Decode the output
	unmarshalStart := time.Now()
	var output oxcOutput
	if err := json.Unmarshal(stdout.Bytes(), &output); err != nil {
		customlog.Errorf("Failed to unmarshal parser output: %v", err)
		customlog.Errorf("Raw stdout: %s", stdout.String())
		return nil, fmt.Errorf("oxc: failed to unmarshal parser output: %w\nstdout: %s", err, stdout.String())
	}
	unmarshalTime := time.Since(unmarshalStart)
	p.unmarshalDuration += unmarshalTime
	customlog.Debugf("Output unmarshaled (took: %v)", unmarshalTime)

	// Check for application-level errors reported by the service
	if !output.Success {
		// Attempt to extract more detailed errors if available within the AST structure
		parseErrors, _ := output.AST["errors"].([]interface{})
		if len(parseErrors) > 0 {
			// You might want to format these errors more nicely
			customlog.Errorf("Parsing failed with errors: %v", parseErrors)
			return nil, fmt.Errorf("oxc: parsing failed: %s, errors: %v", output.Error, parseErrors)
		} else {
			customlog.Errorf("Parsing failed: %s", output.Error)
			return nil, fmt.Errorf("oxc: parsing failed: %s", output.Error)
		}
	}

	// The actual AST (program node, etc.) is nested within the 'ast' field from the service
	if output.AST == nil {
		customlog.Errorf("Parsing succeeded but no AST was returned")
		return nil, fmt.Errorf("oxc: parsing succeeded but no AST was returned")
	}
	
	customlog.Debugf("Successfully parsed file, AST size: %d keys", len(output.AST))
	return output.AST, nil
} 