package oxc

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os/exec"
	"path/filepath"
)

// ParserInput represents the input for the parser
type ParserInput struct {
	Filename string `json:"filename"`
	Code     string `json:"code"`
}

// ParserOutput represents the output from the parser
type ParserOutput struct {
	Success bool          `json:"success"`
	AST     interface{}   `json:"ast,omitempty"`
	Errors  []interface{} `json:"errors,omitempty"`
	Module  interface{}   `json:"module,omitempty"`
	Error   string        `json:"error,omitempty"`
}

// Parser represents the OXC parser
type Parser struct {
	nodePath    string
	servicePath string
}

// NewParser creates a new OXC parser
func NewParser(nodePath, servicePath string) *Parser {
	return &Parser{
		nodePath:    nodePath,
		servicePath: servicePath,
	}
}

// Parse parses TypeScript/JavaScript code and returns the AST
func (p *Parser) Parse(filename, code string) (*ParserOutput, error) {
	// Prepare input data
	input := ParserInput{
		Filename: filename,
		Code:     code,
	}

	// Convert input to JSON
	inputJSON, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal input: %w", err)
	}

	// Create command to run Node.js service
	cmd := exec.Command(p.nodePath, p.servicePath)

	// Set up input/output buffers
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// Create stdin pipe
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdin pipe: %w", err)
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start parser service: %w", err)
	}

	// Write input to stdin
	if _, err := stdin.Write(inputJSON); err != nil {
		return nil, fmt.Errorf("failed to write to stdin: %w", err)
	}
	stdin.Close()

	// Wait for command to complete
	if err := cmd.Wait(); err != nil {
		return nil, fmt.Errorf("parser service failed: %s: %w", stderr.String(), err)
	}

	// Parse output
	var output ParserOutput
	if err := json.Unmarshal(stdout.Bytes(), &output); err != nil {
		return nil, fmt.Errorf("failed to parse output: %w", err)
	}

	// Check for parser errors
	if !output.Success {
		return &output, fmt.Errorf("parsing failed: %s", output.Error)
	}

	return &output, nil
}

// GetNodePath returns the absolute path to the node executable
func GetNodePath() (string, error) {
	return exec.LookPath("node")
}

// GetServicePath returns the absolute path to the parser service script
func GetServicePath() (string, error) {
	// Assuming the script is in the js directory relative to the workspace root
	return filepath.Abs("js/parser-service.js")
}
