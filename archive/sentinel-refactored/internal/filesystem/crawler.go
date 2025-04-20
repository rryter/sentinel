package filesystem

import (
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"
	"sync"
)

// Default exclusions
var defaultExcludePatterns = []string{
	"node_modules",
	".git",
	".svn",
	".hg",
	"dist",
	"build",
}

var defaultExcludeSuffixes = []string{
	".spec.ts",
	".test.ts",
	".stories.ts",
	".d.ts", // Exclude declaration files
}

// Crawler finds source code files within a directory structure.
type Crawler struct {
	rootDir         string   // Absolute path to the root directory to crawl
	excludePatterns []string // Patterns to exclude (e.g., directory names)
	excludeSuffixes []string // File suffixes to exclude
	followSymlinks  bool     // Whether to follow symbolic links
}

// NewCrawler creates a new file system crawler.
func NewCrawler(rootDir string, followSymlinks bool, excludePatterns []string, excludeSuffixes []string) (*Crawler, error) {
	absRootDir, err := filepath.Abs(rootDir)
	if err != nil {
		return nil, fmt.Errorf("crawler: failed to get absolute path for root directory '%s': %w", rootDir, err)
	}

	// Use defaults if specific exclusions are not provided
	if len(excludePatterns) == 0 {
		excludePatterns = defaultExcludePatterns
	}
	if len(excludeSuffixes) == 0 {
		excludeSuffixes = defaultExcludeSuffixes
	}

	return &Crawler{
		rootDir:         absRootDir,
		excludePatterns: excludePatterns,
		excludeSuffixes: excludeSuffixes,
		followSymlinks:  followSymlinks,
	}, nil
}

// FindTypeScriptFiles searches the configured root directory for TypeScript files (.ts, .tsx),
// respecting exclusion rules and concurrency.
func (c *Crawler) FindTypeScriptFiles() ([]string, error) {
	var files []string
	var wg sync.WaitGroup
	mu := sync.Mutex{}
	fileChan := make(chan string, 100) // Buffered channel for found files
	errorChan := make(chan error, 1)    // Channel for the first error encountered
	doneChan := make(chan struct{})   // To signal when walking is done

	// Start a goroutine to collect files found by the walker
	go func() {
		for file := range fileChan {
			mu.Lock()
			files = append(files, file)
			mu.Unlock()
		}
		doneChan <- struct{}{}
	}()

	// Start the directory walk
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer close(fileChan) // Close channel when walk is finished

		err := filepath.WalkDir(c.rootDir, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				// Decide how to handle errors: log, skip, or stop?
				// For now, log and continue, but report the first error.
				select {
				case errorChan <- fmt.Errorf("crawler: error accessing path '%s': %w", path, err):
				default: // Don't block if error channel is full
				}
				return nil // Continue walking if possible
			}

			// Check exclusions
			if c.shouldExclude(path, d) {
				if d.IsDir() {
					return filepath.SkipDir // Skip the entire directory
				}
				return nil // Skip this file
			}

			// Process only regular files with .ts or .tsx extension
			if !d.IsDir() && c.isTypeScriptFile(path) {
				fileChan <- path // Send found file path to the collector
			}

			return nil // Continue walking
		})

		// If WalkDir itself returned an error (e.g., root dir doesn't exist)
		if err != nil {
			select {
			case errorChan <- fmt.Errorf("crawler: directory walk failed: %w", err):
			default:
			}
		}
	}()

	// Wait for the walk to complete
	wg.Wait()

	// Wait for the collector goroutine to finish processing all files
	<-doneChan
	close(errorChan) // Close error channel after walk and collection are done

	// Check if any errors occurred during the walk
	if err := <-errorChan; err != nil {
		return nil, err
	}

	return files, nil
}

// shouldExclude checks if a given path should be excluded based on configured patterns.
func (c *Crawler) shouldExclude(path string, d fs.DirEntry) bool {
	baseName := filepath.Base(path)

	// Check general exclude patterns (usually directories)
	for _, pattern := range c.excludePatterns {
		// Simple substring check for now, could use glob matching later
		if strings.Contains(path, pattern) || baseName == pattern {
			return true
		}
	}

	// Skip symlinks if not following
	if !c.followSymlinks && d.Type()&fs.ModeSymlink != 0 {
		return true
	}

	if !d.IsDir() {
		// Check exclude suffixes for files
		for _, suffix := range c.excludeSuffixes {
			if strings.HasSuffix(path, suffix) {
				return true
			}
		}
	}

	return false
}

// isTypeScriptFile checks if a file path has a TypeScript extension.
func (c *Crawler) isTypeScriptFile(path string) bool {
	ext := filepath.Ext(path)
	return ext == ".ts" || ext == ".tsx"
} 