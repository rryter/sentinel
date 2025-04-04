package analysis

import (
	"fmt"
	"os"
	"runtime"

	"sentinel-refactored/internal/parser"
	"sentinel-refactored/internal/rules"
	"sentinel-refactored/internal/worker"
	customlog "sentinel-refactored/pkg/log"
	"sentinel-refactored/pkg/rule_interface"
)

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
}

// FileAnalysisResult represents the findings for a single file.
type FileAnalysisResult struct {
	FilePath string
	Matches  []rule_interface.Match
	Error    error // Error encountered during analysis of this specific file
}

// AnalyzeFiles takes a list of file paths, parses them, and applies all registered rules.
// It uses a worker pool to process files in parallel.
func (a *Analyzer) AnalyzeFiles(filePaths []string) ([]FileAnalysisResult, error) {
	numFiles := len(filePaths)
	if numFiles == 0 {
		return []FileAnalysisResult{}, nil
	}

	// Determine number of workers
	numWorkers := runtime.NumCPU()
	if numWorkers > 8 {
		numWorkers = 8
	}

	customlog.Infof("Starting analysis of %d files with %d workers...", numFiles, numWorkers)

	// Initialize and start worker pool with appropriate buffer size
	pool := worker.NewPool(numWorkers)
	
	// Set buffer size based on number of files (but cap it to avoid excessive memory usage)
	bufferSize := numFiles
	if bufferSize > 10000 {
		bufferSize = 10000
	}
	pool.SetBufferSize(bufferSize)
	
	// Start the worker pool
	pool.Run()

	// Submit all tasks first
	customlog.Debugf("Submitting %d analysis tasks", numFiles)
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
	allResults := make([]FileAnalysisResult, 0, numFiles)
	
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