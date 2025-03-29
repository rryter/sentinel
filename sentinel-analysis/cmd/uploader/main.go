package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

// RouteInfo represents information about a route
type RouteInfo struct {
	Path    string
	Methods []string
}

func main() {
	// Use relative paths for directories
	uploadDir := "uploads"
	rulesDir := "bin/rules"
	resultsDir := "results"

	// Ensure directories exist
	for _, dir := range []string{uploadDir, rulesDir, resultsDir} {
		if err := os.MkdirAll(dir, os.ModePerm); err != nil {
			log.Fatalf("Error creating directory: %v", err)
		}
	}

	// Get the current working directory
	cwd, err := os.Getwd()
	if err != nil {
		log.Fatalf("Error getting current working directory: %v", err)
	}
	log.Printf("Current working directory: %s", cwd)

	// Try to find the indexer binary in several locations
	possibleLocations := []string{
		"bin/indexer",         // relative path in bin
	}

	var indexerPath string
	for _, location := range possibleLocations {
		// Check if the file exists and is executable
		info, err := os.Stat(location)
		if err == nil && !info.IsDir() {
			indexerPath = location
			log.Printf("Found indexer at: %s", indexerPath)

			// Set executable permissions
			if err := os.Chmod(indexerPath, 0755); err != nil {
				log.Printf("Warning: Could not set executable permissions on indexer: %s", err)
			}
			break
		}
	}

	if indexerPath == "" {
		log.Printf("Warning: Indexer binary not found in any of the expected locations. Analysis functionality may not work.")
		// Use a default path anyway
		indexerPath = "bin/indexer"
	}

	// Initialize the server
	server := NewServer(uploadDir, rulesDir, resultsDir, indexerPath)

	// Define route information
	routes := []RouteInfo{
		{Path: "/api/upload", Methods: []string{"POST", "OPTIONS"}},
		{Path: "/api/rules", Methods: []string{"GET", "OPTIONS"}},
		{Path: "/api/analyze", Methods: []string{"POST", "OPTIONS"}},
		{Path: "/api/analyze/status/{jobID}", Methods: []string{"GET", "OPTIONS"}},
		{Path: "/api/analyze/results/{jobID}", Methods: []string{"GET", "OPTIONS"}},
	}

	// Print all available routes
	fmt.Println("Available Routes:")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("%-30s | %-25s\n", "PATH", "HTTP METHODS")
	fmt.Println(strings.Repeat("-", 60))
	for _, route := range routes {
		fmt.Printf("%-30s | %-25s\n", route.Path, strings.Join(route.Methods, ", "))
	}
	fmt.Println(strings.Repeat("=", 60))

	// Start the server
	port := ":8080"
	fmt.Printf("\nFile upload and analysis API started at http://0.0.0.0%s\n", port)
	log.Fatal(http.ListenAndServe("0.0.0.0"+port, server.router))
}
