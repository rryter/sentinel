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

// oxcInput defines the structure for sending data to the Node.js parser service.
type oxcInput struct {
	Filename string `json:"filename"`
	Code     string `json:"code"`
}

// oxcOutput defines the structure for receiving data from the Node.js parser service.
// Note: The 'AST' field itself in the original js/parser-service.js contains
// the program, errors, module, and the added filePath. We need to handle this nesting.
type oxcOutput struct {
	Success bool                   `json:"success"`
	AST     map[string]interface{} `json:"ast,omitempty"`    // This holds the actual program, etc.
	Errors  []interface{}          `json:"errors,omitempty"` // These might be within the AST map from the service
	Error   string                 `json:"error,omitempty"` // Top-level error message if parsing failed
	// Stats might be present but are not directly used by the parser interface
}

// OxcAdapter implements the Parser interface using an external Node.js Oxc process.
type OxcAdapter struct {
	nodePath    string
	servicePath string
	mu          sync.Mutex // Protect concurrent calls to the node process if necessary
}

// NewOxcAdapter creates a new OxcAdapter.
// It automatically tries to find the Node.js executable and the parser service script.
func NewOxcAdapter() (*OxcAdapter, error) {
	customlog.Debugf("Creating new OxcAdapter")
	
	nodePath, err := exec.LookPath("node")
	if err != nil {
		return nil, fmt.Errorf("failed to find 'node' executable in PATH: %w", err)
	}
	customlog.Debugf("Found Node.js at: %s", nodePath)

	// Assume the service script is in a 'js' directory relative to the executable
	// or a standard location. Adjust if necessary.
	// TODO: Make service path configurable?
	servicePath, err := filepath.Abs("js/parser-service.js")
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute path for parser service: %w", err)
	}
	customlog.Debugf("Parser service path: %s", servicePath)
	
	// Check if the service file exists
	if _, err := os.Stat(servicePath); os.IsNotExist(err) {
		customlog.Errorf("Parser service file not found at: %s", servicePath)
		return nil, fmt.Errorf("parser service file not found: %w", err)
	}

	return &OxcAdapter{
		nodePath:    nodePath,
		servicePath: servicePath,
	}, nil
}

// Parse executes the Oxc Node.js service to parse the given code.
func (p *OxcAdapter) Parse(filePath string, content string) (map[string]interface{}, error) {
	customlog.Debugf("Parsing file: %s (content length: %d)", filePath, len(content))
	
	p.mu.Lock() // Ensure only one parse call runs at a time if the node service isn't concurrent-safe
	defer p.mu.Unlock()

	input := oxcInput{
		Filename: filePath,
		Code:     content,
	}

	inputJSON, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("oxc: failed to marshal input: %w", err)
	}
	customlog.Debugf("Input JSON created, length: %d bytes", len(inputJSON))

	customlog.Debugf("Creating node process: %s %s", p.nodePath, p.servicePath)
	cmd := exec.Command(p.nodePath, p.servicePath)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	customlog.Debugf("Opening stdin pipe")
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("oxc: failed to create stdin pipe: %w", err)
	}

	customlog.Debugf("Starting parser process")
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("oxc: failed to start parser service: %w", err)
	}

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
	go func() {
		done <- cmd.Wait()
	}()
	
	select {
	case <-time.After(10 * time.Second):
		customlog.Errorf("Parser execution timed out after 10 seconds")
		_ = cmd.Process.Kill()
		return nil, fmt.Errorf("oxc: parser service execution timed out after 10 seconds")
	case err := <-done:
		if err != nil {
			customlog.Errorf("Parser service execution failed: %v", err)
			customlog.Errorf("Stderr: %s", stderr.String())
			return nil, fmt.Errorf("oxc: parser service execution failed: %w\nstderr: %s", err, stderr.String())
		}
	}

	customlog.Debugf("Parsing complete, stdout length: %d bytes", stdout.Len())
	
	// If we got no output but no error either, that's suspicious
	if stdout.Len() == 0 {
		customlog.Errorf("Parser returned empty output with no error")
		return nil, fmt.Errorf("oxc: parser returned empty output")
	}

	// Decode the output
	var output oxcOutput
	if err := json.Unmarshal(stdout.Bytes(), &output); err != nil {
		customlog.Errorf("Failed to unmarshal parser output: %v", err)
		customlog.Errorf("Raw stdout: %s", stdout.String())
		return nil, fmt.Errorf("oxc: failed to unmarshal parser output: %w\nstdout: %s", err, stdout.String())
	}
	customlog.Debugf("Successfully unmarshaled parser output")

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