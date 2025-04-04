package analysis

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"sentinel-refactored/internal/cache"
	"sentinel-refactored/internal/parser"
	"sentinel-refactored/internal/rules"
	"sentinel-refactored/internal/worker"
	customlog "sentinel-refactored/pkg/log"
	"sentinel-refactored/pkg/rule_interface"
)

// BatchParser is an interface for parsers that support batch processing
type BatchParser interface {
	ParseBatch(files map[string]string) (map[string]map[string]interface{}, error)
}

// Analyzer orchestrates the code analysis process.
type Analyzer struct {
	parser    parser.Parser
	registry  *rules.RuleRegistry
	cache     *cache.ResultCache
	cacheDir  string
	useCache  bool
	cacheHits int
}

// AnalyzerOptions provides configuration options for the Analyzer
type AnalyzerOptions struct {
	UseCache  bool
	CacheDir  string
	CleanCache bool
}

// DefaultAnalyzerOptions returns the default options
func DefaultAnalyzerOptions() AnalyzerOptions {
	return AnalyzerOptions{
		UseCache:   true,
		CacheDir:   ".sentinel-cache",
		CleanCache: false,
	}
}

// NewAnalyzer creates a new Analyzer.
func NewAnalyzer(p parser.Parser, r *rules.RuleRegistry, opts ...AnalyzerOptions) (*Analyzer, error) {
	if p == nil {
		return nil, fmt.Errorf("analyzer: parser cannot be nil")
	}
	if r == nil {
		return nil, fmt.Errorf("analyzer: rule registry cannot be nil")
	}

	// Apply options
	options := DefaultAnalyzerOptions()
	if len(opts) > 0 {
		options = opts[0]
	}

	analyzer := &Analyzer{
		parser:   p,
		registry: r,
		useCache: options.UseCache,
		cacheDir: options.CacheDir,
	}

	// Initialize cache if enabled
	if options.UseCache {
		absPath, err := filepath.Abs(options.CacheDir)
		if err != nil {
			return nil, fmt.Errorf("failed to get absolute path for cache directory: %w", err)
		}
		
		customlog.Debugf("Initializing result cache in: %s", absPath)
		c, err := cache.NewResultCache(absPath)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize cache: %w", err)
		}
		analyzer.cache = c
		
		// Clean cache if requested
		if options.CleanCache {
			removed := c.CleanupOldEntries()
			customlog.Infof("Cleaned up %d stale cache entries", removed)
		}
	}

	return analyzer, nil
}

// AnalysisTaskData holds the data for a single file analysis task.
type AnalysisTaskData struct {
	FilePath string
	AST      map[string]interface{} // Optional pre-parsed AST for batch processing
	Content  string                 // File content for batch processing
}

// FileAnalysisResult represents the findings for a single file.
type FileAnalysisResult struct {
	FilePath string
	Matches  []rule_interface.Match
	Error    error // Error encountered during analysis of this specific file
	FromCache bool // Whether this result was retrieved from cache
}

// AnalyzeFiles takes a list of file paths, parses them, and applies all registered rules.
// It uses a worker pool to process files in parallel and batch parsing when available.
func (a *Analyzer) AnalyzeFiles(filePaths []string) ([]FileAnalysisResult, error) {
	startTime := time.Now()
	a.cacheHits = 0
	ruleResultCacheHits := 0 // Re-add counter

	numFiles := len(filePaths)
	if numFiles == 0 {
		return []FileAnalysisResult{}, nil
	}

	// Filter files based on cache if enabled
	filesToProcess := filePaths
	var cachedResults []FileAnalysisResult

	cacheCheckStartTime := time.Now()
	if a.useCache && a.cache != nil {
		filesToProcess = make([]string, 0, numFiles)

		// Check which files need processing
		for _, path := range filePaths {
			pathCheckStart := time.Now()
			changed, err := a.cache.IsFileChanged(path)
			if err != nil {
				customlog.Warnf("Error checking cache for %s: %v", path, err)
				filesToProcess = append(filesToProcess, path)
				continue
			}

			if !changed {
				// TRUE FAST PATH: File hasn't changed, try to get cached rule results first
				ruleResultStart := time.Now()
				cacheMatches, ruleResultsFound, err := a.cache.GetRuleResults(path) // Use GetRuleResults
				ruleResultDuration := time.Since(ruleResultStart)

				if err != nil {
					// Log error from GetRuleResults but treat as cache miss
					customlog.Warnf("Error getting cached rule results for %s: %v. Will re-analyze.", path, err)
					filesToProcess = append(filesToProcess, path) 
					continue
				}
				
				if ruleResultsFound {
					// Convert cache.RuleMatch to rule_interface.Match
					matches := make([]rule_interface.Match, len(cacheMatches))
					for i, cm := range cacheMatches {
						matches[i] = rule_interface.Match{
							RuleID:   cm.RuleID,
							FilePath: cm.FilePath, // Use path from cache match
							Message:  cm.Message,
							Line:     cm.Line,
							Column:   cm.Column,
							Severity: rule_interface.MatchSeverity(cm.Severity), // Convert int back to enum
						}
					}

					result := FileAnalysisResult{
						FilePath:  path,
						Matches:   matches,
						Error:     nil,
						FromCache: true,
					}
					cachedResults = append(cachedResults, result)
					a.cacheHits++
					ruleResultCacheHits++ // Increment rule result cache hits
					if ruleResultDuration > 1*time.Millisecond { // Log if lookup took time
						customlog.Debugf("FAST PATH: Using cached rule results for %s (took %v)",
							path, ruleResultDuration)
					}
					continue // Successfully used rule cache, move to next file
				}

				// Fallback: Rule results not found, try getting cached AST
				customlog.Debugf("No cached rule results for %s, checking for cached AST...", path)
				astStart := time.Now()
				ast, astFound, err := a.cache.GetASTResult(path)
				astDuration := time.Since(astStart)

				if err != nil {
					customlog.Warnf("Error retrieving cached AST for %s: %v", path, err)
					filesToProcess = append(filesToProcess, path)
				} else if astFound {
					// Read content for rule checking
					readStart := time.Now()
					content, err := os.ReadFile(path)
					readDuration := time.Since(readStart)

					if err != nil {
						customlog.Warnf("Error reading file for cached analysis %s: %v", path, err)
						filesToProcess = append(filesToProcess, path)
					} else {
						// Apply rules to cached AST
						ruleApplyStart := time.Now()
						result := a.analyzeWithPreParsedAST(path, string(content), ast)
						ruleApplyDuration := time.Since(ruleApplyStart)

						result.FromCache = true // Mark as from cache (AST cache hit)
						cachedResults = append(cachedResults, result)
						a.cacheHits++ // Increment general cache hits

						// *** Store newly generated rule results in cache for next time ***
						cacheStoreStart := time.Now()
						if err := a.storeRuleResultsToCache(path, result.Matches); err != nil { // Call helper
							customlog.Warnf("Failed to cache rule results for %s after AST analysis: %v", path, err)
						}
						cacheStoreDuration := time.Since(cacheStoreStart)

						pathTotalDuration := time.Since(pathCheckStart)
						if pathTotalDuration > 5*time.Millisecond { // Log if fallback took time
							customlog.Debugf("Cached AST processing for %s - total: %v (AST get: %v, read: %v, rules: %v, cache store: %v)",
								path, pathTotalDuration, astDuration, readDuration, ruleApplyDuration, cacheStoreDuration)
						}
					}
				} else {
					// File unchanged, but no AST found in cache - indicates potential cache issue
					customlog.Warnf("File %s unchanged but no AST found in cache. Adding to processing list.", path)
					filesToProcess = append(filesToProcess, path)
				}
			} else {
				// File has changed, need to reprocess
				filesToProcess = append(filesToProcess, path)
			}
		} // End of file processing loop

		cacheCheckDuration := time.Since(cacheCheckStartTime)
		customlog.Debugf("Cache check phase completed in %v", cacheCheckDuration)

		if len(filesToProcess) == 0 {
			totalDuration := time.Since(startTime)
			customlog.Infof("Fast path successful: All %d files loaded from cache in %v (%d rule cache hits), skipping main analysis.",
				len(cachedResults), totalDuration, ruleResultCacheHits)
			if err := a.cache.Save(); err != nil { // Save cache index changes
				 customlog.Warnf("Failed to save cache after fast path: %v", err)
			}
			return cachedResults, nil
		}

		customlog.Infof("Using %d cached results (%d rule cache hits), need to process %d files",
			a.cacheHits, ruleResultCacheHits, len(filesToProcess))
	}

	if len(filesToProcess) == 0 {
		customlog.Infof("All %d files loaded from cache, no parsing needed.", len(cachedResults))
		if a.useCache && a.cache != nil { // Save cache index changes
			if err := a.cache.Save(); err != nil {
				 customlog.Warnf("Failed to save cache after empty process list: %v", err)
			}
		}
		return cachedResults, nil
	}

	// Check if parser supports batch processing
	batchParser, supportsBatch := a.parser.(BatchParser)

	// Determine number of workers
	numWorkers := runtime.NumCPU()
	if numWorkers > 8 {
		numWorkers = 8
	}

	var newResults []FileAnalysisResult
	var err error

	analysisPhaseStartTime := time.Now()

	if supportsBatch {
		customlog.Infof("Starting analysis of %d files with batch parsing...", len(filesToProcess))
		newResults, err = a.analyzeWithBatchParser(filesToProcess, batchParser, numWorkers)
	} else {
		customlog.Infof("Starting analysis of %d files with %d workers...", len(filesToProcess), numWorkers)
		newResults, err = a.analyzeWithWorkerPool(filesToProcess, numWorkers)
	}

	analysisPhaseDuration := time.Since(analysisPhaseStartTime)
	customlog.Debugf("Main analysis phase completed in %v", analysisPhaseDuration)

	if err != nil {
		return nil, err
	}

	// --- Cache Saving Phase ---
	cacheSaveStartTime := time.Now()
	if a.useCache && a.cache != nil {
		// Store rule results for newly analyzed files (that weren't from cache)
		storeNewResultsStart := time.Now()
		successfulStores := 0
		for _, result := range newResults {
			if result.Error == nil { // Only cache successful analyses
				if err := a.storeRuleResultsToCache(result.FilePath, result.Matches); err != nil { // Call helper
					customlog.Warnf("Failed to cache rule results for newly analyzed file %s: %v", result.FilePath, err)
				} else {
					successfulStores++
				}
			}
		}
		storeNewResultsDuration := time.Since(storeNewResultsStart)
		if successfulStores > 0 {
			customlog.Debugf("Stored rule results for %d newly analyzed files in %v", successfulStores, storeNewResultsDuration)
		}


		// Save cache index and dirty directories to disk
		cacheWriteStart := time.Now()
		if err := a.cache.Save(); err != nil {
			customlog.Warnf("Failed to save cache: %v", err)
		} else {
			cacheWriteDuration := time.Since(cacheWriteStart)
			if cacheWriteDuration > 50*time.Millisecond { // Log only if saving took time
				customlog.Debugf("Cache saved successfully in %v", cacheWriteDuration)
			}
		}
	}
	cacheSaveDuration := time.Since(cacheSaveStartTime)
	customlog.Debugf("Cache saving phase completed in %v", cacheSaveDuration)

	// Combine cached and new results
	allResults := append(cachedResults, newResults...)

	elapsedTime := time.Since(startTime)
	customlog.Infof("Analysis completed in %v (%d files, %d from cache, %d rule cache hits)",
		elapsedTime, len(allResults), a.cacheHits, ruleResultCacheHits)

	return allResults, nil
}

// analyzeWithBatchParser uses the batch parsing capability for better performance
func (a *Analyzer) analyzeWithBatchParser(filePaths []string, batchParser BatchParser, numWorkers int) ([]FileAnalysisResult, error) {
	// 1. Read all files into memory
	fileContents := make(map[string]string, len(filePaths))
	readErrors := make(map[string]error)

	// Use a mutex to protect concurrent map access during file reading
	var mutex sync.Mutex
	var wg sync.WaitGroup
	
	// Limit concurrent file reads
	semaphore := make(chan struct{}, numWorkers)
	
	for _, filePath := range filePaths {
		wg.Add(1)
		go func(filePath string) {
			defer wg.Done()
			
			// Acquire semaphore slot
			semaphore <- struct{}{}
			defer func() { <-semaphore }()
			
			contentBytes, err := os.ReadFile(filePath)
			mutex.Lock()
			defer mutex.Unlock()
			
			if err != nil {
				customlog.Warnf("Failed to read file %s: %v", filePath, err)
				readErrors[filePath] = fmt.Errorf("failed to read file: %w", err)
				return
			}
			fileContents[filePath] = string(contentBytes)
		}(filePath)
	}
	
	wg.Wait()
	customlog.Debugf("Read %d files (%d had errors)", len(fileContents), len(readErrors))

	// 2. Parse all files in batch
	astMap, err := batchParser.ParseBatch(fileContents)
	if err != nil {
		customlog.Errorf("Batch parsing failed: %v", err)
		// Fall back to regular parsing if batch parsing failed
		return a.analyzeWithWorkerPool(filePaths, numWorkers)
	}

	customlog.Debugf("Batch parsed %d files", len(astMap))
	
	// Store ASTs in cache if enabled
	if a.useCache && a.cache != nil {
		for path, ast := range astMap {
			if err := a.cache.StoreASTResult(path, ast); err != nil {
				customlog.Warnf("Failed to cache AST for %s: %v", path, err)
			}
		}
	}

	// 3. Analyze files using the worker pool with pre-parsed ASTs
	pool := worker.NewPool(numWorkers)
	
	// Set buffer size based on number of files (but cap it to avoid excessive memory usage)
	bufferSize := len(fileContents)
	if bufferSize > 10000 {
		bufferSize = 10000
	}
	pool.SetBufferSize(bufferSize)
	
	// Start the worker pool
	pool.Run()

	// Submit all tasks with pre-parsed ASTs
	customlog.Debugf("Submitting %d analysis tasks with pre-parsed ASTs", len(fileContents))
	for filePath, content := range fileContents {
		ast, ok := astMap[filePath]
		if !ok {
			// Skip files that failed to parse
			customlog.Warnf("No AST found for file %s", filePath)
			continue
		}
		
		taskData := AnalysisTaskData{
			FilePath: filePath,
			AST:      ast,
			Content:  content,
		}
		
		task := worker.Task{
			ID:   filePath,
			Data: taskData,
			Func: func(data interface{}) (interface{}, error) {
				taskData := data.(AnalysisTaskData)
				return a.analyzeWithPreParsedAST(taskData.FilePath, taskData.Content, taskData.AST), nil
			},
		}
		
		if err := pool.SubmitTask(task); err != nil {
			customlog.Errorf("Failed to submit task for file %s: %v", filePath, err)
		}
	}

	// Add tasks for files that failed to read
	for filePath, readErr := range readErrors {
		filePath := filePath // Capture for closure
		readErr := readErr   // Capture for closure
		
		task := worker.Task{
			ID: filePath,
			Data: AnalysisTaskData{FilePath: filePath},
			Func: func(data interface{}) (interface{}, error) {
				return FileAnalysisResult{
					FilePath: filePath,
					Error:    readErr,
				}, nil
			},
		}
		
		if err := pool.SubmitTask(task); err != nil {
			customlog.Errorf("Failed to submit error task for file %s: %v", filePath, err)
		}
	}
	
	// Now we are done submitting tasks, stop the pool
	customlog.Debugf("All tasks submitted, stopping pool (this will wait for all tasks to complete)")
	pool.Stop()
	customlog.Debugf("Worker pool stopped")

	// Collect results
	allResults := make([]FileAnalysisResult, 0, len(filePaths))
	
	customlog.Debugf("Collecting results from worker pool")
	for result := range pool.Results() {
		if result.Error != nil {
			customlog.Errorf("Task error: %v", result.Error)
			continue
		}
		
		fileResult, ok := result.Value.(FileAnalysisResult)
		if !ok {
			customlog.Errorf("Invalid result type: %T", result.Value)
			continue
		}
		
		if fileResult.Error != nil {
			customlog.Warnf("Error analyzing file '%s': %v", fileResult.FilePath, fileResult.Error)
		}
		allResults = append(allResults, fileResult)
	}
	customlog.Debugf("Results channel closed, finished collection")

	customlog.Infof("Collected results for %d files.", len(allResults))
	return allResults, nil
}

// analyzeWithWorkerPool uses the original worker pool approach for parsers that don't support batch processing
func (a *Analyzer) analyzeWithWorkerPool(filePaths []string, numWorkers int) ([]FileAnalysisResult, error) {
	// Initialize and start worker pool with appropriate buffer size
	pool := worker.NewPool(numWorkers)
	
	// Set buffer size based on number of files (but cap it to avoid excessive memory usage)
	bufferSize := len(filePaths)
	if bufferSize > 10000 {
		bufferSize = 10000
	}
	pool.SetBufferSize(bufferSize)
	
	// Start the worker pool
	pool.Run()

	// Submit all tasks first
	customlog.Debugf("Submitting %d analysis tasks", len(filePaths))
	for _, filePath := range filePaths {
		taskData := AnalysisTaskData{FilePath: filePath}
		task := worker.Task{
			ID:   filePath,
			Data: taskData,
			Func: func(data interface{}) (interface{}, error) {
				return a.analyzeSingleFile(data.(AnalysisTaskData).FilePath), nil
			},
		}
		if err := pool.SubmitTask(task); err != nil {
			customlog.Errorf("Failed to submit task for file %s: %v", filePath, err)
		}
	}
	
	// Now we are done submitting tasks, stop the pool
	customlog.Debugf("All tasks submitted, stopping pool (this will wait for all tasks to complete)")
	pool.Stop()
	customlog.Debugf("Worker pool stopped")

	// Collect results - guaranteed to be all of them since pool.Stop() waits for completion
	allResults := make([]FileAnalysisResult, 0, len(filePaths))
	
	customlog.Debugf("Collecting results from worker pool")
	for result := range pool.Results() {
		if result.Error != nil {
			customlog.Errorf("Task error: %v", result.Error)
			continue
		}
		
		fileResult, ok := result.Value.(FileAnalysisResult)
		if !ok {
			customlog.Errorf("Invalid result type: %T", result.Value)
			continue
		}
		
		if fileResult.Error != nil {
			customlog.Warnf("Error analyzing file '%s': %v", fileResult.FilePath, fileResult.Error)
		}
		allResults = append(allResults, fileResult)
	}
	customlog.Debugf("Results channel closed, finished collection")

	customlog.Infof("Collected results for %d files.", len(allResults))
	return allResults, nil
}

// analyzeWithPreParsedAST applies rules to a file with a pre-parsed AST
func (a *Analyzer) analyzeWithPreParsedAST(filePath, content string, ast map[string]interface{}) FileAnalysisResult {
	result := FileAnalysisResult{FilePath: filePath}

	// Apply all registered rules
	allRules := a.registry.GetAllRules()
	var fileMatches []rule_interface.Match
	
	for _, rule := range allRules {
		matches, err := rule.Check(filePath, content, ast)
		if err != nil {
			customlog.Warnf("Error checking rule '%s' on file '%s': %v", rule.ID(), filePath, err)
			continue
		}
		if len(matches) > 0 {
			fileMatches = append(fileMatches, matches...)
		}
	}

	result.Matches = fileMatches
	return result
}

// analyzeSingleFile reads, parses, and applies rules to a single file.
// Returns FileAnalysisResult (which contains any error).
func (a *Analyzer) analyzeSingleFile(filePath string) FileAnalysisResult {
	result := FileAnalysisResult{FilePath: filePath}

	// 1. Read file content
	contentBytes, err := os.ReadFile(filePath)
	if err != nil {
		result.Error = fmt.Errorf("failed to read file: %w", err)
		return result
	}
	content := string(contentBytes)

	// 2. Parse the file to get AST
	ast, err := a.parser.Parse(filePath, content)
	if err != nil {
		result.Error = fmt.Errorf("failed to parse file: %w", err)
		return result
	}
	
	// Store AST in cache if enabled
	if a.useCache && a.cache != nil && err == nil {
		if err := a.cache.StoreASTResult(filePath, ast); err != nil {
			customlog.Warnf("Failed to cache AST for %s: %v", filePath, err)
		}
	}

	// 3. Apply all registered rules
	allRules := a.registry.GetAllRules()
	var fileMatches []rule_interface.Match
	for _, rule := range allRules {
		matches, err := rule.Check(filePath, content, ast)
		if err != nil {
			customlog.Warnf("Error checking rule '%s' on file '%s': %v", rule.ID(), filePath, err)
			continue
		}
		if len(matches) > 0 {
			fileMatches = append(fileMatches, matches...)
		}
	}

	result.Matches = fileMatches
	return result
}

// Helper function to convert and store rule results
func (a *Analyzer) storeRuleResultsToCache(filePath string, matches []rule_interface.Match) error {
	if !a.useCache || a.cache == nil {
		return nil // Do nothing if cache is disabled
	}
	
	// Convert rule_interface.Match to cache.RuleMatch
	cacheMatches := make([]cache.RuleMatch, len(matches))
	for i, m := range matches {
		cacheMatches[i] = cache.RuleMatch{
			RuleID:   m.RuleID,
			FilePath: m.FilePath,
			Message:  m.Message,
			Line:     m.Line,
			Column:   m.Column,
			Severity: int(m.Severity), // Convert enum to int
		}
	}
	
	return a.cache.StoreRuleResults(filePath, cacheMatches)
} 