package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"sentinel-refactored/go/parser"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run main.go <javascript_file>")
		os.Exit(1)
	}

	// Read the file
	filename := os.Args[1]
	code, err := os.ReadFile(filename)
	if err != nil {
		fmt.Printf("Error reading file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Parsing file: %s\n", filename)

	// Time the parsing
	start := time.Now()
	result, err := parser.Parse(filename, string(code))
	elapsed := time.Since(start)

	if err != nil {
		fmt.Printf("Error parsing: %v\n", err)
		os.Exit(1)
	}

	// Print results
	fmt.Printf("Parsing successful: %v\n", result.Success)
	fmt.Printf("Time taken: %v\n", elapsed)

	if result.Success {
		if result.AstJSON != nil {
			var ast map[string]interface{}
			if err := json.Unmarshal(result.AstJSON, &ast); err != nil {
				fmt.Printf("Error decoding AST: %v\n", err)
			} else {
				// Print some AST information
				fmt.Println("\nProgram structure:")
				if bodyCount, ok := ast["body_count"].(float64); ok {
					fmt.Printf("  - Statement count: %.0f\n", bodyCount)
				}
				if nodeTypes, ok := ast["node_types"].([]interface{}); ok {
					fmt.Println("  - Node types:")
					for i, nt := range nodeTypes {
						if i >= 10 {
							fmt.Printf("    ... and %d more\n", len(nodeTypes)-10)
							break
						}
						fmt.Printf("    %s\n", nt)
					}
				}
			}
		}
	} else {
		// Print errors
		if result.Error != "" {
			fmt.Printf("Error: %s\n", result.Error)
		}
		if result.Panicked {
			fmt.Println("Parser panicked!")
		}
		for _, err := range result.Errors {
			fmt.Printf("Parser error: %s\n", err)
		}
	}
}
