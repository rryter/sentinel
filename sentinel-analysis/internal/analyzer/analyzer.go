package analyzer

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"plugin"
	"strings"
	"sync"
	"sync/atomic"

	"sentinel/indexing/internal/patterns"
)

// AnalysisResult represents the result of pattern analysis
type AnalysisResult struct {
	FilePath string           `json:"filePath"`
	Matches  []patterns.Match `json:"matches"`
}

// ParserStats represents the statistics from the parser
type ParserStats struct {
	FilesProcessed int   `json:"filesProcessed"`
	ElapsedTimeMs  int64 `json:"elapsedTimeMs"`
}

// Analyzer handles pattern matching analysis of AST files
type Analyzer struct {
	registry *patterns.Registry
}

// NewAnalyzer creates a new analyzer and loads rules from the rules directory
func NewAnalyzer(rulesDir string) (*Analyzer, error) {
	// Initialize logger with environment level
	patterns.SetLogLevel(patterns.GetLogLevelFromEnv())

	registry := patterns.NewRegistry()
	analyzer := &Analyzer{
		registry: registry,
	}

	// Load rules from the rules directory
	if err := analyzer.loadRules(rulesDir); err != nil {
		return nil, fmt.Errorf("failed to load rules: %w", err)
	}

	return analyzer, nil
}

// loadRules loads all rules from the specified directory
func (a *Analyzer) loadRules(rulesDir string) error {
	// Get absolute path of rules directory
	absRulesDir, err := filepath.Abs(rulesDir)
	if err != nil {
		return fmt.Errorf("failed to get absolute path of rules directory: %w", err)
	}

	patterns.Debug("Loading rules from directory: %s", absRulesDir)

	// Walk through the rules directory
	err = filepath.Walk(absRulesDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Only process .so files (compiled Go plugins)
		if !info.IsDir() && strings.HasSuffix(path, ".so") {
			patterns.Debug("Found plugin: %s", path)

			// Extract category from directory structure
			relPath, err := filepath.Rel(absRulesDir, path)
			if err != nil {
				patterns.Error("Error getting relative path for %s: %v", path, err)
				return nil // Continue with other plugins
			}
			category := filepath.Dir(relPath)
			if category == "." {
				category = "default"
			}

			// Get the rule name from the file name (without .so extension)
			baseName := filepath.Base(path)
			ruleName := strings.TrimSuffix(baseName, filepath.Ext(baseName))

			// Load the plugin
			p, err := plugin.Open(path)
			if err != nil {
				patterns.Error("Error loading plugin %s: %v", path, err)
				return nil // Continue with other plugins
			}
			patterns.Debug("Successfully loaded plugin: %s", path)

			// Try multiple naming conventions for the rule constructor
			var newRuleSym interface{}
			var loadErr error

			// Generate possible constructor name variants
			constructorNames := []string{
				// Standard naming convention: CreateRule + CamelCase name
				"CreateRule" + toCamelCase(ruleName),
				// For backward compatibility: just the name CreateRule
				"CreateRule",
				// Legacy or package-prefixed versions
				"main.CreateRule" + toCamelCase(ruleName),
				"main.CreateRule",
			}

			// Try each constructor name
			for _, constructorName := range constructorNames {
				patterns.Debug("Trying to find constructor %s in plugin %s", constructorName, path)
				newRuleSym, loadErr = p.Lookup(constructorName)
				if loadErr == nil {
					patterns.Debug("Found constructor %s in plugin %s", constructorName, path)
					break
				}
			}

			// If all direct lookups failed, try to find any symbol that looks like a CreateRule function
			if loadErr != nil {
				patterns.Debug("Failed to find constructor with standard names in %s, trying to list symbols", path)

				symbols, err := listPluginSymbols(p)
				if err != nil {
					patterns.Error("Error listing symbols in plugin %s: %v", path, err)
					return nil // Continue with other plugins
				}

				// Look for any symbol that matches our naming pattern
				for _, symbol := range symbols {
					if strings.Contains(symbol, "CreateRule") {
						patterns.Info("Found potential constructor symbol %s in plugin %s", symbol, path)
						newRuleSym, loadErr = p.Lookup(symbol)
						if loadErr == nil {
							patterns.Debug("Successfully looked up symbol %s", symbol)
							break
						}
					}
				}
			}

			if loadErr != nil || newRuleSym == nil {
				patterns.Error("Could not find a valid rule constructor in plugin %s", path)
				return nil // Continue with other plugins
			}

			// Convert symbol to a function
			newRule, ok := newRuleSym.(func() patterns.Rule)
			if !ok {
				patterns.Error("Error: plugin %s has wrong type signature for rule constructor", path)
				return nil // Continue with other plugins
			}

			// Create and register the rule
			rule := newRule()

			// Set the category in the rule if it implements CategorySetter
			patterns.TrySetCategory(rule, category)

			if err := a.registry.RegisterRule(rule); err != nil {
				patterns.Error("Error registering rule from plugin %s: %v", path, err)
				return nil // Continue with other plugins
			}
			patterns.Debug("Successfully loaded rule %s from %s in category %s", rule.ID(), path, category)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to load rules: %w", err)
	}

	// Log loaded rules by category
	a.logLoadedRules()

	return nil
}

// listPluginSymbols attempts to list all symbols in a plugin
func listPluginSymbols(p *plugin.Plugin) ([]string, error) {
	// First try to use the empty string symbol lookup which some plugins support
	symbols, err := p.Lookup("")
	if err == nil {
		if symbolMap, ok := symbols.(map[string]interface{}); ok {
			var result []string
			for symName := range symbolMap {
				result = append(result, symName)
			}
			return result, nil
		}
	}

	// If that doesn't work, try our best to list symbols by attempting common ones
	var result []string
	commonSymbols := []string{"CreateRule", "Init", "main.CreateRule", "main.Init"}

	for _, sym := range commonSymbols {
		if _, err := p.Lookup(sym); err == nil {
			result = append(result, sym)
		}
	}

	return result, nil
}

// toCamelCase converts a string to CamelCase
func toCamelCase(s string) string {
	// Split the string by underscores and hyphens
	parts := strings.FieldsFunc(s, func(r rune) bool {
		return r == '_' || r == '-'
	})

	// Convert each part to title case and join
	for i, part := range parts {
		parts[i] = strings.Title(strings.ToLower(part))
	}

	return strings.Join(parts, "")
}

// logLoadedRules logs a summary of all loaded rules grouped by category
func (a *Analyzer) logLoadedRules() {
	// Group rules by category
	rulesByCategory := make(map[string][]patterns.Rule)
	for _, rule := range a.registry.GetAllRules() {
		category := patterns.GetCategory(rule)
		rulesByCategory[category] = append(rulesByCategory[category], rule)
	}

	// Log summary
	patterns.Debug("=== Rules loaded by category ===")
	for category, rules := range rulesByCategory {
		patterns.Debug("Category %s: %d rules", category, len(rules))
		for _, rule := range rules {
			patterns.Debug("  - %s: %s", rule.ID(), rule.Name())
		}
	}
	patterns.Debug("Total rules loaded: %d", len(a.registry.GetAllRules()))
}

// AnalyzeASTFiles analyzes all AST files in the given directory
func (a *Analyzer) AnalyzeASTFiles(astDir string) ([]AnalysisResult, error) {
	var results []AnalysisResult
	var stats ParserStats
	var fileCount int32
	var analyzedFiles int32

	// Get absolute path of AST directory
	absAstDir, err := filepath.Abs(astDir)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute path of AST directory: %w", err)
	}

	patterns.Debug("Analyzing AST files in directory: %s", absAstDir)

	// Create channels for results and errors
	resultsChan := make(chan AnalysisResult, 100) // Buffered channel
	errorsChan := make(chan error, 100)           // Buffered channel
	numWorkers := 8
	semaphore := make(chan struct{}, numWorkers)

	// Create a WaitGroup to track all goroutines
	var wg sync.WaitGroup

	// Start a goroutine to collect results
	done := make(chan struct{})
	go func() {
		for result := range resultsChan {
			results = append(results, result)
		}
		close(done)
	}()

	// Start error collector
	errorDone := make(chan struct{})
	var firstError error
	go func() {
		for err := range errorsChan {
			if firstError == nil {
				firstError = err
			}
		}
		close(errorDone)
	}()

	// Walk through the AST directory
	err = filepath.Walk(absAstDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Only process .ts.ast.json files
		if !info.IsDir() && strings.HasSuffix(path, ".ts.ast.json") {
			// Skip node_modules files
			if strings.Contains(filepath.ToSlash(path), "node_modules") {
				patterns.Debug("Skipping node_modules file: %s", path)
				return nil
			}

			// Acquire semaphore before starting goroutine
			semaphore <- struct{}{} 
			wg.Add(1)
			go func(filePath string) {
				defer wg.Done()
				defer func() { <-semaphore }() // Release semaphore

				// Read and parse AST file
				astData, err := os.ReadFile(filePath)
				if err != nil {
					errorsChan <- fmt.Errorf("failed to read AST file %s: %w", filePath, err)
					return
				}

				var astNode map[string]interface{}
				if err := json.Unmarshal(astData, &astNode); err != nil {
					errorsChan <- fmt.Errorf("failed to parse AST file %s: %w", filePath, err)
					return
				}

				// Get file path from AST
				sourceFilePath, ok := astNode["filePath"].(string)
				if !ok {
					errorsChan <- fmt.Errorf("AST file %s does not contain filePath", filePath)
					return
				}

				// Skip node_modules files
				if strings.Contains(filepath.ToSlash(sourceFilePath), "node_modules") {
					patterns.Debug("Skipping node_modules file from AST: %s", sourceFilePath)
					return
				}

				atomic.AddInt32(&fileCount, 1)
				atomic.AddInt32(&analyzedFiles, 1)

				patterns.Debug("Applying rules to file: %s", sourceFilePath)

				// Apply all rules to the AST in a single pass
				var matches []patterns.Match
				for _, rule := range a.registry.GetAllRules() {
					patterns.Debug("Applying rule %s (%s) to file %s", rule.Name(), rule.ID(), sourceFilePath)
					ruleMatches := rule.Match(astNode, sourceFilePath)
					if len(ruleMatches) == 0 {
						patterns.Debug("✅ Rule %s found no issues in file %s", rule.Name(), sourceFilePath)
					} else {
						patterns.Debug("📊 Rule %s found %d matches in file %s", rule.Name(), len(ruleMatches), sourceFilePath)
					}
					matches = append(matches, ruleMatches...)
				}

				// Send results through channel
				resultsChan <- AnalysisResult{
					FilePath: sourceFilePath,
					Matches:  matches,
				}

				// Extract parser stats if available
				if statsMap, ok := astNode["stats"].(map[string]interface{}); ok {
					if elapsedTimeMs, ok := statsMap["elapsedTimeMs"].(float64); ok {
						atomic.StoreInt64(&stats.ElapsedTimeMs, int64(elapsedTimeMs))
					}
				}
			}(path)
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to walk AST directory: %w", err)
	}

	// Wait for all goroutines to complete
	wg.Wait()

	// Close channels after all goroutines are done
	close(resultsChan)
	close(errorsChan)

	// Wait for collectors to finish
	<-done
	<-errorDone

	// Return first error if any occurred
	if firstError != nil {
		return nil, firstError
	}

	// Update final stats
	stats.FilesProcessed = int(fileCount)

	// Print parser stats
	patterns.Debug("Parser stats: %d files processed", stats.FilesProcessed)
	patterns.Debug("Analyzer stats: %d files analyzed", analyzedFiles)

	// Check for rules with no matches
	ruleMatches := make(map[string]int)
	for _, result := range results {
		for _, match := range result.Matches {
			ruleMatches[match.RuleID]++
		}
	}

	// Log rules that found no matches
	for _, rule := range a.registry.GetAllRules() {
		if count, exists := ruleMatches[rule.ID()]; !exists || count == 0 {
			patterns.Info("✅ Rule %s (%s) found no issues across %d analyzed files", rule.Name(), rule.ID(), analyzedFiles)
		}
	}

	return results, nil
}

// WriteResults writes the analysis results to a JSON file
func (a *Analyzer) WriteResults(results []AnalysisResult, outputPath string) error {
	// Create output directory if it doesn't exist
	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Group results by rule
	groupedResults := make(map[string][]patterns.Match)
	for _, result := range results {
		for _, match := range result.Matches {
			groupedResults[match.RuleID] = append(groupedResults[match.RuleID], match)
		}
	}

	// Create summary
	summary := struct {
		TotalFiles     int                         `json:"totalFiles"`
		TotalMatches   int                         `json:"totalMatches"`
		MatchesByRule  map[string]int              `json:"matchesByRule"`
		GroupedMatches map[string][]patterns.Match `json:"groupedMatches"`
	}{
		TotalFiles:     len(results),
		MatchesByRule:  make(map[string]int),
		GroupedMatches: groupedResults,
	}

	// Calculate totals
	for _, result := range results {
		summary.TotalMatches += len(result.Matches)
		for _, match := range result.Matches {
			summary.MatchesByRule[match.RuleID]++
		}
	}

	// Write results to file
	data, err := json.MarshalIndent(summary, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal results: %w", err)
	}

	if err := os.WriteFile(outputPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write results: %w", err)
	}

	return nil
}

// PrintSummary prints a summary of the analysis results
func (a *Analyzer) PrintSummary(results []AnalysisResult) {
	totalMatches := 0
	matchesByRule := make(map[string]int)

	for _, result := range results {
		for _, match := range result.Matches {
			totalMatches++
			matchesByRule[match.RuleID]++
		}
	}

	patterns.Info("Files analyzed: %d", len(results))
	for ruleID, count := range matchesByRule {
		if rule, exists := a.registry.GetRule(ruleID); exists {
			fmt.Printf("%s: %d\n", rule.Name(), count)
		}
	}
}
