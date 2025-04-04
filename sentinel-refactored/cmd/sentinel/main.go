package main

import (
	"encoding/json"
	"flag"
	"fmt" // Needed for Discard
	"log"
	"os"
	"path/filepath"
	"runtime"
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

// PerfMetrics tracks performance metrics for different stages of processing
type PerfMetrics struct {
	StartTime       time.Time
	EndTime         time.Time
	TotalDuration   time.Duration
	StageTimings    map[string]time.Duration
	FileCount       int
	FromCache       int
	MatchesFound    int
	MemoryUsageMB   float64
}

// NewPerfMetrics creates a new performance metrics tracker
func NewPerfMetrics() *PerfMetrics {
	return &PerfMetrics{
		StartTime:    time.Now(),
		StageTimings: make(map[string]time.Duration),
	}
}

// RecordStage records the duration of a processing stage
func (p *PerfMetrics) RecordStage(name string, duration time.Duration) {
	p.StageTimings[name] = duration
}

// StartStage begins timing a new stage and returns a function to end timing
func (p *PerfMetrics) StartStage(name string) func() {
	start := time.Now()
	return func() {
		p.StageTimings[name] = time.Since(start)
	}
}

// Finish completes the metrics collection
func (p *PerfMetrics) Finish() {
	p.EndTime = time.Now()
	p.TotalDuration = p.EndTime.Sub(p.StartTime)
	
	// Get memory stats
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	p.MemoryUsageMB = float64(memStats.Alloc) / 1024 / 1024
}

// SaveToFile saves detailed metrics to a CSV file
func (p *PerfMetrics) SaveToFile() error {
	timeStr := p.EndTime.Format("2006-01-02 15:04:05")
	
	// Get current working directory instead of executable directory
	workDir, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get working directory: %w", err)
	}
	
	// Create metrics directory with path relative to working directory
	metricsDir := filepath.Join(workDir, "metrics")
	customlog.Debugf("Creating metrics directory at: %s", metricsDir)
	if err := os.MkdirAll(metricsDir, 0755); err != nil {
		return fmt.Errorf("failed to create metrics directory: %w", err)
	}
	
	// Define the metrics files with paths relative to working directory
	summaryFile := filepath.Join(metricsDir, "performance_summary.csv")
	detailFile := filepath.Join(metricsDir, "performance_details.csv")
	
	customlog.Debugf("Will write metrics to: %s and %s", summaryFile, detailFile)
	
	// Check if files exist to determine if we need to write headers
	needsSummaryHeader := false
	if _, err := os.Stat(summaryFile); os.IsNotExist(err) {
		needsSummaryHeader = true
	}
	
	needsDetailHeader := false
	if _, err := os.Stat(detailFile); os.IsNotExist(err) {
		needsDetailHeader = true
	}
	
	// Open summary file in append mode
	sumFile, err := os.OpenFile(summaryFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open summary file: %w", err)
	}
	defer sumFile.Close()
	
	// Write headers if new summary file
	if needsSummaryHeader {
		headers := "Timestamp,TotalDuration(ms),FileCount,CachedFiles,MatchesFound,MemoryUsed(MB)\n"
		if _, err := sumFile.WriteString(headers); err != nil {
			return fmt.Errorf("failed to write headers to summary file: %w", err)
		}
	}
	
	// Format summary metrics line
	summaryLine := fmt.Sprintf("%s,%.2f,%d,%d,%d,%.2f\n", 
		timeStr, 
		float64(p.TotalDuration.Milliseconds()),
		p.FileCount,
		p.FromCache,
		p.MatchesFound,
		p.MemoryUsageMB)
	
	// Write to summary file
	if _, err := sumFile.WriteString(summaryLine); err != nil {
		return fmt.Errorf("failed to write metrics to summary file: %w", err)
	}
	
	// Open details file in append mode
	detFile, err := os.OpenFile(detailFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open details file: %w", err)
	}
	defer detFile.Close()
	
	// Write headers if new details file
	if needsDetailHeader {
		headers := "Timestamp,Stage,Duration(ms)\n"
		if _, err := detFile.WriteString(headers); err != nil {
			return fmt.Errorf("failed to write headers to details file: %w", err)
		}
	}
	
	// Write each stage timing to details file
	for stage, duration := range p.StageTimings {
		detailLine := fmt.Sprintf("%s,%s,%.2f\n",
			timeStr,
			stage,
			float64(duration.Milliseconds()))
		
		if _, err := detFile.WriteString(detailLine); err != nil {
			return fmt.Errorf("failed to write stage timing to details file: %w", err)
		}
	}
	
	customlog.Infof("Performance metrics saved to %s and %s", summaryFile, detailFile)
	return nil
}

func main() {
	// Initialize performance metrics
	metrics := NewPerfMetrics()
	
	// Add a defer to ensure we log program termination and save metrics
	defer func() {
		metrics.Finish()
		customlog.Infof("Program execution terminating after %v", metrics.TotalDuration)
		
		// Save execution timings to file
		if err := metrics.SaveToFile(); err != nil {
			customlog.Errorf("Failed to save performance metrics: %v", err)
		}
	}()

	// --- Configuration Loading --- 
	configEnd := metrics.StartStage("config_loading")
	// 1. Define flags
	configFilePath := flag.String("config", config.DefaultConfigFile, "Path to configuration file (e.g., sentinel.yaml)")
	// Define flags for overrides, using pointers to distinguish between unset and zero values
	targetDirFlag := flag.String("dir", "", "Target directory to analyze (overrides config file)")
	rulesDirFlag := flag.String("rules", "", "Directory containing rule plugins (overrides config file)")
	outputDirFlag := flag.String("out", "", "Directory to save analysis results (overrides config file)")
	logLevelFlag := flag.String("log-level", "", "Set log level (debug, info, warn, error) (overrides config file)")
	followSymlinksFlag := flag.Bool("follow-symlinks", config.DefaultFollowSymlinks, "Follow symbolic links (overrides config file if set)")
	debugFlag := flag.Bool("debug", false, "Enable debug logging (shortcut for --log-level=debug, overrides other levels)")
	// Add cache-related flags
	useCacheFlag := flag.Bool("use-cache", config.DefaultUseCache, "Enable caching to speed up repeated analyses (overrides config file if set)")
	cacheDirFlag := flag.String("cache-dir", "", "Directory to store cache files (overrides config file)")
	clearCacheFlag := flag.Bool("clear-cache", false, "Clear the cache before running")
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
	if *cacheDirFlag != "" {
		cfg.CacheDir = *cacheDirFlag
	}
	
	// Check if flags were explicitly set on the command line
	followSymlinksIsSet := false
	useCacheIsSet := false
	flag.Visit(func(f *flag.Flag) {
		if f.Name == "follow-symlinks" {
			followSymlinksIsSet = true
		}
		if f.Name == "use-cache" {
			useCacheIsSet = true
		}
	})
	
	if followSymlinksIsSet {
		cfg.FollowSymlinks = *followSymlinksFlag
	}
	
	if useCacheIsSet {
		cfg.UseCache = *useCacheFlag
	}
	
	if *logLevelFlag != "" {
		cfg.LogLevel = *logLevelFlag
	}
	if *debugFlag { // --debug flag overrides log level to debug
		cfg.LogLevel = "debug"
	}
	configEnd()  // End timing for config loading

	// --- Logging Setup ---
	loggingEnd := metrics.StartStage("logging_setup") 
	customlog.SetLevel(customlog.LevelFromString(cfg.LogLevel))
	customlog.Infof("Effective configuration: %+v", cfg)
	customlog.Debugf("Config file used: %s", *configFilePath)
	loggingEnd()  // End timing for logging setup

	// --- Initialization (using cfg values) --- 
	initEnd := metrics.StartStage("initialization")
	customlog.Infof("Initializing components...")

	// Initialize Parser (no config needed for adapter currently)
	psr, err := parser.NewOxcAdapter()
	if err != nil {
		customlog.Fatalf("Failed to initialize parser: %v", err)
	}

	// Initialize Rule Registry and Loader
	registry := rules.NewRuleRegistry()
	loader := rules.NewRuleLoader(registry)
	initEnd()  // End timing for initialization

	// Load Rules (using cfg.RulesDir)
	ruleLoadEnd := metrics.StartStage("rule_loading")
	customlog.Infof("Loading rules from: %s", cfg.RulesDir)
	if err := loader.LoadRulesFromDir(cfg.RulesDir); err != nil {
		customlog.Fatalf("Failed to load rules: %v", err)
	}
	if registry.Count() == 0 {
		customlog.Warnf("No rules were loaded. Analysis may not produce results.")
	}
	ruleLoadEnd()  // End timing for rule loading

	// Initialize Filesystem Crawler (using cfg values)
	crawlerInitEnd := metrics.StartStage("crawler_initialization")
	// Pass config exclude patterns/suffixes if they are populated
	crawler, err := filesystem.NewCrawler(cfg.TargetDir, cfg.FollowSymlinks, cfg.ExcludePatterns, cfg.ExcludeSuffixes)
	if err != nil {
		customlog.Fatalf("Failed to initialize crawler: %v", err)
	}
	
	// Initialize Analyzer with cache options from config
	analyzerOpts := analysis.AnalyzerOptions{
		UseCache:   cfg.UseCache,
		CacheDir:   cfg.CacheDir,
		CleanCache: *clearCacheFlag,
	}
	analyzer, err := analysis.NewAnalyzer(psr, registry, analyzerOpts)
	if err != nil {
		customlog.Fatalf("Failed to initialize analyzer: %v", err)
	}
	crawlerInitEnd()  // End timing for crawler and analyzer initialization

	// --- Execution (using cfg.TargetDir) --- 
	findFilesEnd := metrics.StartStage("file_discovery")
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
	// Store file count in metrics
	metrics.FileCount = len(filesToAnalyze)
	findFilesEnd()  // End timing for file discovery

	// Run Analysis
	analysisEnd := metrics.StartStage("file_analysis")
	customlog.Debugf("Starting AnalyzeFiles with %d files", len(filesToAnalyze))
	results, err := analyzer.AnalyzeFiles(filesToAnalyze)
	if err != nil {
		customlog.Fatalf("Analysis execution failed: %v", err)
	}
	customlog.Debugf("AnalyzeFiles completed with %d results", len(results))
	analysisEnd()  // End timing for file analysis
	
	// Debug the results
	for i, result := range results {
		cacheStatus := ""
		if result.FromCache {
			cacheStatus = " (from cache)"
		}
		customlog.Debugf("Result %d: File=%s, Matches=%d, Error=%v%s", 
			i, result.FilePath, len(result.Matches), result.Error, cacheStatus)
		for j, match := range result.Matches {
			customlog.Debugf("  Match %d: RuleID=%s, Message=%s", 
				j, match.RuleID, match.Message)
		}
	}

	// --- Output (using cfg.OutputDir) --- 
	resultsProcessingEnd := metrics.StartStage("results_processing")
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
		
	// Record cache and match metrics
	metrics.FromCache = aggregatedResults.FilesFromCache
	metrics.MatchesFound = aggregatedResults.TotalMatchesFound
	resultsProcessingEnd()  // End timing for results processing

	// Print Summary to Console
	summaryEnd := metrics.StartStage("summary_output")
	customlog.Debugf("Printing summary")
	printSummary(aggregatedResults)
	summaryEnd()  // End timing for summary output

	// Write detailed results to JSON file
	jsonOutputEnd := metrics.StartStage("json_output")
	outputPath := filepath.Join(cfg.OutputDir, "analysis_results.json")
	customlog.Debugf("Writing JSON results to: %s", outputPath)
	if err := writeResultsJSON(outputPath, aggregatedResults); err != nil {
		customlog.Errorf("Failed to write results to '%s': %v", outputPath, err)
	}
	customlog.Infof("Analysis results written to: %s", outputPath)
	jsonOutputEnd()  // End timing for JSON output writing
}

// parseFlags is removed as flags are handled directly in main

// AggregateResult mirrors the structure used in the original Analyzer.WriteResults
// for JSON output, grouping matches by rule.
type AggregateResult struct {
	TotalFilesAnalyzed int                                 `json:"totalFilesAnalyzed"`
	TotalMatchesFound  int                                 `json:"totalMatchesFound"`
	MatchesByRuleID    map[string][]rule_interface.Match   `json:"matchesByRuleId"`
	FilesWithErrors    []string                            `json:"filesWithErrors"`
	// Cache information
	CacheEnabled       bool                                `json:"cacheEnabled"`
	FilesFromCache     int                                 `json:"filesFromCache,omitempty"`
	CacheHitRate       float64                             `json:"cacheHitRate,omitempty"`
}

// aggregateResults processes the raw analysis results into a structured summary.
func aggregateResults(results []analysis.FileAnalysisResult) AggregateResult {
	agg := AggregateResult{
		TotalFilesAnalyzed: len(results),
		MatchesByRuleID:    make(map[string][]rule_interface.Match),
		FilesWithErrors:    make([]string, 0),
		CacheEnabled:       false,
		FilesFromCache:     0,
	}
	
	cacheHits := 0
	for _, res := range results {
		if res.Error != nil {
			agg.FilesWithErrors = append(agg.FilesWithErrors, res.FilePath)
		}
		if res.FromCache {
			cacheHits++
			agg.CacheEnabled = true
		}
		agg.TotalMatchesFound += len(res.Matches)
		for _, match := range res.Matches {
			agg.MatchesByRuleID[match.RuleID] = append(agg.MatchesByRuleID[match.RuleID], match)
		}
	}
	
	// Set cache information
	agg.FilesFromCache = cacheHits
	if agg.TotalFilesAnalyzed > 0 {
		agg.CacheHitRate = float64(cacheHits) / float64(agg.TotalFilesAnalyzed) * 100.0
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
	
	// Print cache information if enabled
	if agg.CacheEnabled {
		customlog.Infof("Cache Utilization: %.1f%% (%d/%d files from cache)", 
			agg.CacheHitRate, agg.FilesFromCache, agg.TotalFilesAnalyzed)
	}

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