package main

import (
	"encoding/json"
	"flag"
	"fmt" // Needed for Discard
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"sentinel-refactored/internal/analysis"
	"sentinel-refactored/internal/config"
	"sentinel-refactored/internal/filesystem"
	"sentinel-refactored/internal/parser"
	"sentinel-refactored/internal/rules"
	"sentinel-refactored/pkg/rule_interface"

	// "sentinel-refactored/internal/config" // Placeholder for future config loading
	customlog "sentinel-refactored/pkg/log" // Use alias for our log package
)

// Config struct is now defined in internal/config
// Remove the local definition if it exists

func main() {
	startTime := time.Now()

	// Add a defer to ensure we log program termination
	defer func() {
		customlog.Infof("Program execution terminating after %v", time.Since(startTime))
	}()

	// --- Configuration Loading --- 
	// 1. Define flags
	configFilePath := flag.String("config", config.DefaultConfigFile, "Path to configuration file (e.g., sentinel.yaml)")
	// Define flags for overrides, using pointers to distinguish between unset and zero values
	targetDirFlag := flag.String("dir", "", "Target directory to analyze (overrides config file)")
	rulesDirFlag := flag.String("rules", "", "Directory containing rule plugins (overrides config file)")
	outputDirFlag := flag.String("out", "", "Directory to save analysis results (overrides config file)")
	logLevelFlag := flag.String("log-level", "", "Set log level (debug, info, warn, error) (overrides config file)")
	followSymlinksFlag := flag.Bool("follow-symlinks", config.DefaultFollowSymlinks, "Follow symbolic links (overrides config file if set)")
	debugFlag := flag.Bool("debug", false, "Enable debug logging (shortcut for --log-level=debug, overrides other levels)")
	flag.Parse()

	// 2. Load config from file
	cfg, err := config.Load(*configFilePath)
	if err != nil {
		// Use standard log here as custom logger level isn't set yet
		log.Fatalf("[FATAL] Error loading configuration file '%s': %v", *configFilePath, err)
	}

	// 3. Apply flag overrides
	if *targetDirFlag != "" {
		cfg.TargetDir = *targetDirFlag
	}
	if *rulesDirFlag != "" {
		cfg.RulesDir = *rulesDirFlag
	}
	if *outputDirFlag != "" {
		cfg.OutputDir = *outputDirFlag
	}
	// Check if follow-symlinks was explicitly set on the command line
	// This requires checking if the flag value differs from its default
	followSymlinksIsSet := false
	flag.Visit(func(f *flag.Flag) {
		if f.Name == "follow-symlinks" {
			followSymlinksIsSet = true
		}
	})
	if followSymlinksIsSet {
		cfg.FollowSymlinks = *followSymlinksFlag
	}
	
	if *logLevelFlag != "" {
		cfg.LogLevel = *logLevelFlag
	}
	if *debugFlag { // --debug flag overrides log level to debug
		cfg.LogLevel = "debug"
	}

	// --- Logging Setup ---
	customlog.SetLevel(customlog.LevelFromString(cfg.LogLevel))
	customlog.Infof("Effective configuration: %+v", cfg)
	customlog.Debugf("Config file used: %s", *configFilePath)

	// --- Initialization (using cfg values) --- 
	customlog.Infof("Initializing components...")

	// Initialize Parser (no config needed for adapter currently)
	psr, err := parser.NewOxcAdapter()
	if err != nil {
		customlog.Fatalf("Failed to initialize parser: %v", err)
	}

	// Initialize Rule Registry and Loader
	registry := rules.NewRuleRegistry()
	loader := rules.NewRuleLoader(registry)

	// Load Rules (using cfg.RulesDir)
	customlog.Infof("Loading rules from: %s", cfg.RulesDir)
	if err := loader.LoadRulesFromDir(cfg.RulesDir); err != nil {
		customlog.Fatalf("Failed to load rules: %v", err)
	}
	if registry.Count() == 0 {
		customlog.Warnf("No rules were loaded. Analysis may not produce results.")
	}

	// Initialize Filesystem Crawler (using cfg values)
	// Pass config exclude patterns/suffixes if they are populated
	crawler, err := filesystem.NewCrawler(cfg.TargetDir, cfg.FollowSymlinks, cfg.ExcludePatterns, cfg.ExcludeSuffixes)
	if err != nil {
		customlog.Fatalf("Failed to initialize crawler: %v", err)
	}

	// Initialize Analyzer
	analyzer, err := analysis.NewAnalyzer(psr, registry)
	if err != nil {
		customlog.Fatalf("Failed to initialize analyzer: %v", err)
	}

	// --- Execution (using cfg.TargetDir) --- 
	customlog.Infof("Finding TypeScript files in: %s", cfg.TargetDir)
	filesToAnalyze, err := crawler.FindTypeScriptFiles()
	if err != nil {
		customlog.Fatalf("Failed to find files: %v", err)
	}
	if len(filesToAnalyze) == 0 {
		customlog.Infof("No TypeScript files found to analyze.")
		os.Exit(0)
	}
	customlog.Infof("Found %d files to analyze.", len(filesToAnalyze))

	// Run Analysis
	customlog.Debugf("Starting AnalyzeFiles with %d files", len(filesToAnalyze))
	results, err := analyzer.AnalyzeFiles(filesToAnalyze)
	if err != nil {
		customlog.Fatalf("Analysis execution failed: %v", err)
	}
	customlog.Debugf("AnalyzeFiles completed with %d results", len(results))
	
	// Debug the results
	for i, result := range results {
		customlog.Debugf("Result %d: File=%s, Matches=%d, Error=%v", 
			i, result.FilePath, len(result.Matches), result.Error)
		for j, match := range result.Matches {
			customlog.Debugf("  Match %d: RuleID=%s, Message=%s", 
				j, match.RuleID, match.Message)
		}
	}

	// --- Output (using cfg.OutputDir) --- 
	customlog.Infof("Analysis complete. Processing results...")

	// Ensure output directory exists
	customlog.Debugf("Creating output directory: %s", cfg.OutputDir)
	if err := os.MkdirAll(cfg.OutputDir, 0755); err != nil {
		customlog.Fatalf("Failed to create output directory '%s': %v", cfg.OutputDir, err)
	}
	customlog.Debugf("Output directory ready")

	// Aggregate matches for summary and output
	customlog.Debugf("Aggregating analysis results")
	aggregatedResults := aggregateResults(results)
	customlog.Debugf("Results aggregated: %d files, %d matches, %d rule categories", 
		aggregatedResults.TotalFilesAnalyzed, 
		aggregatedResults.TotalMatchesFound,
		len(aggregatedResults.MatchesByRuleID))

	// Print Summary to Console
	customlog.Debugf("Printing summary")
	printSummary(aggregatedResults)

	// Write detailed results to JSON file
	outputPath := filepath.Join(cfg.OutputDir, "analysis_results.json")
	customlog.Debugf("Writing JSON results to: %s", outputPath)
	if err := writeResultsJSON(outputPath, aggregatedResults); err != nil {
		customlog.Errorf("Failed to write results to '%s': %v", outputPath, err)
	}

	customlog.Infof("Analysis results written to: %s", outputPath)
}

// parseFlags is removed as flags are handled directly in main

// AggregateResult mirrors the structure used in the original Analyzer.WriteResults
// for JSON output, grouping matches by rule.
type AggregateResult struct {
	TotalFilesAnalyzed int                                 `json:"totalFilesAnalyzed"`
	TotalMatchesFound  int                                 `json:"totalMatchesFound"`
	MatchesByRuleID    map[string][]rule_interface.Match `json:"matchesByRuleId"`
	FilesWithErrors    []string                            `json:"filesWithErrors"`
}

// aggregateResults processes the raw analysis results into a structured summary.
func aggregateResults(results []analysis.FileAnalysisResult) AggregateResult {
	agg := AggregateResult{
		TotalFilesAnalyzed: len(results),
		MatchesByRuleID:    make(map[string][]rule_interface.Match),
		FilesWithErrors:    make([]string, 0),
	}
	for _, res := range results {
		if res.Error != nil {
			agg.FilesWithErrors = append(agg.FilesWithErrors, res.FilePath)
		}
		agg.TotalMatchesFound += len(res.Matches)
		for _, match := range res.Matches {
			agg.MatchesByRuleID[match.RuleID] = append(agg.MatchesByRuleID[match.RuleID], match)
		}
	}
	return agg
}

// printSummary prints a simple summary of the analysis results to the console.
func printSummary(agg AggregateResult) {
	// Use standard log.Println for simple separators without file/line info
	log.Println(strings.Repeat("=", 40))
	log.Println("    Analysis Summary")
	log.Println(strings.Repeat("=", 40))
	customlog.Infof("Files Analyzed: %d", agg.TotalFilesAnalyzed)
	customlog.Infof("Total Matches Found: %d", agg.TotalMatchesFound)

	if len(agg.MatchesByRuleID) > 0 {
		log.Println("\nMatches by Rule:")
		for ruleID, matches := range agg.MatchesByRuleID {
			// Ideally, get Rule Name from registry here
			customlog.Infof("  - %s: %d matches", ruleID, len(matches))
		}
	}

	if len(agg.FilesWithErrors) > 0 {
		log.Println("\nFiles with Errors:")
		for _, file := range agg.FilesWithErrors {
			customlog.Warnf("  - %s", file)
		}
	}
	log.Println(strings.Repeat("=", 40))
}

// writeResultsJSON marshals the aggregated results and writes them to a file.
func writeResultsJSON(outputPath string, data AggregateResult) error {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal results to JSON: %w", err)
	}

	if err := os.WriteFile(outputPath, jsonData, 0644); err != nil {
		return fmt.Errorf("failed to write JSON results to file '%s': %w", outputPath, err)
	}
	return nil
} 