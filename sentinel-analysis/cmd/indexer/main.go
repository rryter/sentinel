package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"sentinel/indexing/internal/analyzer"
	"sentinel/indexing/internal/crawler"
	"sentinel/indexing/internal/parser/oxc"
	"sentinel/indexing/internal/patterns"
	"sentinel/indexing/pkg/utils"
)

func main() {
	startTotal := time.Now()

	// Parse command line flags
	dir := flag.String("dir", ".", "Directory to analyze")
	outDir := flag.String("outdir", "analysis", "Output directory for analysis results")
	rulesDir := flag.String("rules", "rules", "Directory containing analysis rules")
	cacheFile := flag.String("cache", "analysis/ast-cache.json", "File to store AST cache")
	debug := flag.Bool("debug", false, "Enable debug logging")
	flag.Parse()

	// Set debug level in patterns package
	patterns.SetDebug(*debug)

	// Get absolute paths
	startPaths := time.Now()
	absDir, err := filepath.Abs(*dir)
	if err != nil {
		patterns.PrintError("Failed to get absolute path for target directory: %v", err)
		os.Exit(1)
	}

	absRulesDir, err := filepath.Abs(*rulesDir)
	if err != nil {
		patterns.PrintError("Failed to get absolute path for rules directory: %v", err)
		os.Exit(1)
	}
	patterns.Info("Debug: Path resolution took: %v", time.Since(startPaths))
	patterns.Info("Debug: absDir: %v", absDir)
	patterns.Info("Debug: absRulesDir: %v", absRulesDir)
	patterns.Info("Debug: outDir: %v", *outDir)
	patterns.Info("Debug: cacheFile: %v", *cacheFile)
	patterns.Info("Debug: debug: %v", *debug)

	// Create output directory
	startDirs := time.Now()
	if err := os.MkdirAll(*outDir, 0755); err != nil {
		patterns.PrintError("Failed to create output directory: %v", err)
		os.Exit(1)
	}
	patterns.Info("Debug: Directory creation took: %v", time.Since(startDirs))

	// Get parser paths
	startParserSetup := time.Now()
	nodePath, err := oxc.GetNodePath()
	if err != nil {
		patterns.PrintError("Failed to find Node.js: %v", err)
		os.Exit(1)
	}

	servicePath, err := oxc.GetServicePath()
	if err != nil {
		patterns.PrintError("Failed to find parser service: %v", err)
		os.Exit(1)
	}

	// Create parser and crawler
	parser := oxc.NewParser(nodePath, servicePath)
	config := utils.DefaultConfig()
	crawler := crawler.NewCrawler(&config, parser, absDir)
	patterns.Info("Debug: Parser setup took: %v", time.Since(startParserSetup))

	// Load AST cache
	startCacheLoad := time.Now()
	if err := crawler.LoadCache(*cacheFile); err != nil {
		patterns.PrintWarning("Failed to load AST cache: %v", err)
	}
	patterns.Info("Debug: Cache loading took: %v", time.Since(startCacheLoad))

	// Crawl directory and generate ASTs
	startCrawl := time.Now()
	files, err := crawler.CrawlDirectory(absDir)
	if err != nil {
		patterns.PrintError("Failed to analyze directory: %v", err)
		os.Exit(1)
	}
	patterns.Info("Debug: Directory crawling and AST generation took: %v", time.Since(startCrawl))

	// Save AST cache
	startCacheSave := time.Now()
	if err := crawler.SaveCache(*cacheFile); err != nil {
		patterns.PrintWarning("Failed to save AST cache: %v", err)
	}
	patterns.Info("Debug: Cache saving took: %v", time.Since(startCacheSave))

	// Create ASTs directory and write ASTs
	startASTWrite := time.Now()
	astsDir := filepath.Join(*outDir, "asts")
	if err := os.MkdirAll(astsDir, 0755); err != nil {
		patterns.PrintError("Failed to create ASTs directory: %v", err)
		os.Exit(1)
	}

	// Write ASTs to separate files
	for _, file := range files {
		astPath := filepath.Join(astsDir, filepath.Base(file.RelativePath)+".ast.json")
		
		// Create AST object with filePath added
		var astMap map[string]interface{}
		astBytes, err := json.Marshal(file.AST)
		if err != nil {
			patterns.PrintWarning("Failed to marshal AST: %v", err)
			continue
		}
		
		if err := json.Unmarshal(astBytes, &astMap); err != nil {
			patterns.PrintWarning("Failed to unmarshal AST: %v", err)
			continue
		}
		
		// Add filePath to AST map
		astMap["filePath"] = file.Path
		
		if err := writeJSON(astPath, astMap); err != nil {
			patterns.PrintWarning("Failed to write AST: %v", err)
		}
	}
	patterns.Info("Debug: Writing ASTs to files took: %v", time.Since(startASTWrite))

	// Create analyzer with dynamic rules
	startAnalyzer := time.Now()
	analyzer, err := analyzer.NewAnalyzer(absRulesDir)
	if err != nil {
		patterns.PrintError("Failed to create analyzer: %v", err)
		os.Exit(1)
	}
	patterns.Info("Debug: Analyzer creation took: %v", time.Since(startAnalyzer))

	// Analyze ASTs
	startAnalysis := time.Now()
	results, err := analyzer.AnalyzeASTFiles(astsDir)
	if err != nil {
		patterns.PrintError("Failed to analyze AST files: %v", err)
		os.Exit(1)
	}
	patterns.Info("AST analysis took: %v", time.Since(startAnalysis))

	// Write analysis results
	startResultWrite := time.Now()
	outputPath := filepath.Join(*outDir, "patterns.json")
	if err := analyzer.WriteResults(results, outputPath); err != nil {
		patterns.PrintError("Failed to write analysis results: %v", err)
		os.Exit(1)
	}
	patterns.Info("Debug: Writing results took: %v", time.Since(startResultWrite))

	// Print summary
	analyzer.PrintSummary(results)

	patterns.Info("Debug: Total execution time: %v", time.Since(startTotal))
}

func writeJSON(path string, data interface{}) error {
	file, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(data); err != nil {
		return fmt.Errorf("failed to encode JSON: %w", err)
	}

	return nil
}
