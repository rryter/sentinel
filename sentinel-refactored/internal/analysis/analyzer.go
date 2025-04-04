package analysis

import (
	"fmt"
	"os"
	"runtime"
	"sync"

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
	parser   parser.Parser
	registry *rules.RuleRegistry
}

// NewAnalyzer creates a new Analyzer.
func NewAnalyzer(p parser.Parser, r *rules.RuleRegistry) (*Analyzer, error) {
	if p == nil {
		return nil, fmt.Errorf("analyzer: parser cannot be nil")
	}
	if r == nil {
		return nil, fmt.Errorf("analyzer: rule registry cannot be nil")
	}
	return &Analyzer{
		parser:   p,
		registry: r,
	}, nil
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
}

// AnalyzeFiles takes a list of file paths, parses them, and applies all registered rules.
// It uses a worker pool to process files in parallel and batch parsing when available.
func (a *Analyzer) AnalyzeFiles(filePaths []string) ([]FileAnalysisResult, error) {
	numFiles := len(filePaths)
	if numFiles == 0 {
		return []FileAnalysisResult{}, nil
	}

	// Check if parser supports batch processing
	batchParser, supportsBatch := a.parser.(BatchParser)

	// Determine number of workers
	numWorkers := runtime.NumCPU()
	if numWorkers > 8 {
		numWorkers = 8
	}

	if supportsBatch {
		customlog.Infof("Starting analysis of %d files with batch parsing...", numFiles)
		return a.analyzeWithBatchParser(filePaths, batchParser, numWorkers)
	}

	customlog.Infof("Starting analysis of %d files with %d workers...", numFiles, numWorkers)
	return a.analyzeWithWorkerPool(filePaths, numWorkers)
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