package main

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"regexp"
	"strings"
)

// identifyRuleCategory scans the file content to extract the rule prefix/category
func identifyRuleCategory(r io.Reader) (string, error) {
	scanner := bufio.NewScanner(r)
	// Increase buffer size to 8MB to handle larger files and lines
	const maxScanTokenSize = 8 * 1024 * 1024
	scanBuf := make([]byte, 64*1024)
	scanner.Buffer(scanBuf, maxScanTokenSize)

	// Default category if no match is found
	defaultCategory := "uncategorized"

	// Store all lines around the BaseRule pattern to analyze the full pattern
	var baseRuleLines []string
	lineCount := 0
	baseRuleFound := false

	// First pass: collect all relevant lines containing rule definition
	for scanner.Scan() {
		line := scanner.Text()
		lineCount++

		if strings.Contains(line, "patterns.NewBaseRule") {
			baseRuleFound = true
			// Start collecting lines
			baseRuleLines = append(baseRuleLines, line)
		} else if baseRuleFound && (strings.Contains(line, ")") || len(baseRuleLines) < 5) {
			// Continue collecting lines until we see closing parenthesis or have collected enough context
			baseRuleLines = append(baseRuleLines, line)
			if strings.Contains(line, "),") {
				// We've reached the end of the rule definition
				break
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return defaultCategory, fmt.Errorf("error scanning file: %v", err)
	}

	// If we haven't found any relevant lines, return the default category
	if len(baseRuleLines) == 0 {
		log.Printf("No rule definition found in file, using default category: %s", defaultCategory)
		return defaultCategory, nil
	}

	// Join collected lines to handle multi-line rule definitions
	fullRuleText := strings.Join(baseRuleLines, " ")
	log.Printf("Analyzing rule text: %s", fullRuleText)

	// Pattern for rule ID
	ruleIDPattern := regexp.MustCompile(`patterns\.NewBaseRule\(\s*"([^"]+)"`)
	ruleIDMatches := ruleIDPattern.FindStringSubmatch(fullRuleText)

	if len(ruleIDMatches) < 2 {
		log.Printf("No rule ID found in rule text, using default category: %s", defaultCategory)
		return defaultCategory, nil
	}

	ruleID := strings.TrimSpace(ruleIDMatches[1])
	log.Printf("Found rule ID: %s", ruleID)

	// Pattern for description containing category in brackets
	// Look for the second string parameter which is the description
	descPattern := regexp.MustCompile(`patterns\.NewBaseRule\(\s*"[^"]+"\s*,\s*"[^"]*\[([^\]]+)\]`)
	descMatches := descPattern.FindStringSubmatch(fullRuleText)

	// Try to get category from description first
	if len(descMatches) > 1 {
		category := strings.ToLower(strings.TrimSpace(descMatches[1]))
		log.Printf("Extracted category from description: %s", category)
		return category, nil
	}

	// If no bracketed category in description, use the part after "uploaded-"
	parts := strings.SplitN(ruleID, "-", 2)
	if len(parts) > 1 && parts[1] != "" {
		prefixParts := strings.SplitN(parts[1], "-", 2)
		if len(prefixParts) > 0 && prefixParts[0] != "" {
			log.Printf("Using prefix after 'uploaded-': %s", prefixParts[0])
			return prefixParts[0], nil
		}
	}

	log.Printf("Could not extract category from uploaded rule, using default: %s", defaultCategory)
	return defaultCategory, nil
}
