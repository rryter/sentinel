package parser

// #cgo LDFLAGS: -L${SRCDIR}/../../rust-oxc-bridge/target/release -loxc_parser_bridge
// #cgo linux LDFLAGS: -Wl,-rpath=${SRCDIR}/../../rust-oxc-bridge/target/release
// #include <stdlib.h>
// char* parse_js(const char* filename, const char* code);
// void free_result(char* ptr);
import "C"
import (
	"runtime"
	"sync"
)

// BatchParser provides a way to parse multiple files efficiently
type BatchParser struct {
	mu sync.Mutex
}

// NewBatchParser creates a new batch parser
func NewBatchParser() *BatchParser {
	return &BatchParser{}
}

// Close cleans up any resources used by the batch parser
func (bp *BatchParser) Close() {
	// No resources to clean up in this implementation
}

// Parse parses a single file using the batch parser
func (bp *BatchParser) Parse(filename, code string) (*ParseResult, error) {
	bp.mu.Lock()
	defer bp.mu.Unlock()
	
	return Parse(filename, code)
}

// ParseBatch parses multiple files concurrently
func (bp *BatchParser) ParseBatch(files map[string]string) map[string]*ParseResult {
	results := make(map[string]*ParseResult)
	resultChan := make(chan struct {
		filename string
		result   *ParseResult
		err      error
	}, len(files))

	var wg sync.WaitGroup
	// Limit concurrent operations to number of CPUs
	sem := make(chan struct{}, runtime.NumCPU())

	// Parse each file in a separate goroutine
	for filename, code := range files {
		wg.Add(1)
		go func(filename, code string) {
			defer wg.Done()
			
			// Acquire token from semaphore
			sem <- struct{}{}
			defer func() { <-sem }() // Release token
			
			// Parse the file
			result, err := Parse(filename, code)
			
			// Send result through channel
			resultChan <- struct {
				filename string
				result   *ParseResult
				err      error
			}{filename, result, err}
		}(filename, code)
	}
	
	// Close channel when all goroutines are done
	go func() {
		wg.Wait()
		close(resultChan)
	}()
	
	// Collect results
	var mu sync.Mutex
	for res := range resultChan {
		if res.err == nil && res.result != nil {
			mu.Lock()
			results[res.filename] = res.result
			mu.Unlock()
		}
	}
	
	return results
} 