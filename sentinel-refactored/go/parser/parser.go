package parser

// #cgo LDFLAGS: -L${SRCDIR}/../../rust-oxc-bridge/target/release -loxc_parser_bridge
// #cgo linux LDFLAGS: -Wl,-rpath=${SRCDIR}/../../rust-oxc-bridge/target/release
// #include <stdlib.h>
// char* parse_js(const char* filename, const char* code);
// void free_result(char* ptr);
import "C"
import (
	"encoding/json"
	"fmt"
	"unsafe"
)

// ParseResult holds the result of parsing a JavaScript/TypeScript file
type ParseResult struct {
	Success  bool            `json:"success"`
	AstJSON  json.RawMessage `json:"ast_json,omitempty"`
	Errors   []string        `json:"errors,omitempty"`
	Error    string          `json:"error,omitempty"`
	Panicked bool            `json:"panicked,omitempty"`
}

// Parse parses a JavaScript/TypeScript file and returns its AST
func Parse(filename, code string) (*ParseResult, error) {
	// Convert Go strings to C strings
	cFilename := C.CString(filename)
	cCode := C.CString(code)
	defer C.free(unsafe.Pointer(cFilename))
	defer C.free(unsafe.Pointer(cCode))

	// Call the Rust function
	resultPtr := C.parse_js(cFilename, cCode)
	defer C.free_result(resultPtr)

	// Convert C string to Go string
	resultJSON := C.GoString(resultPtr)

	// Parse the JSON
	var result ParseResult
	if err := json.Unmarshal([]byte(resultJSON), &result); err != nil {
		return nil, fmt.Errorf("failed to parse JSON result: %w", err)
	}

	return &result, nil
}

// ParseAST is a convenience function that returns the parsed AST as a map
func ParseAST(filename, code string) (map[string]interface{}, error) {
	result, err := Parse(filename, code)
	if err != nil {
		return nil, err
	}

	if !result.Success {
		var msg string
		if result.Error != "" {
			msg = result.Error
		} else if len(result.Errors) > 0 {
			msg = result.Errors[0]
		} else {
			msg = "unknown error"
		}
		return nil, fmt.Errorf("parsing failed: %s", msg)
	}

	if result.AstJSON == nil {
		return nil, fmt.Errorf("no AST returned")
	}

	var ast map[string]interface{}
	if err := json.Unmarshal(result.AstJSON, &ast); err != nil {
		return nil, fmt.Errorf("failed to parse AST JSON: %w", err)
	}

	return ast, nil
} 