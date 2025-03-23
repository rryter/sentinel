package crawler

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"sentinel/indexing/internal/parser/oxc"
	"sentinel/indexing/pkg/models"
	"sentinel/indexing/pkg/utils"
)

// TypeScriptDeclaration represents a TypeScript declaration (interface, type, class, etc.)
type TypeScriptDeclaration struct {
	Type       string                 `json:"type"`
	Name       string                 `json:"name"`
	Location   Location               `json:"location"`
	Properties map[string]interface{} `json:"properties,omitempty"`
}

// Location represents the location of a declaration in the file
type Location struct {
	Start  int `json:"start"`
	End    int `json:"end"`
	Line   int `json:"line"`
	Column int `json:"column"`
}

// FileAnalysis represents the analysis of a single TypeScript file
type FileAnalysis struct {
	Path         string                  `json:"path"`
	RelativePath string                  `json:"relativePath"`
	Size         int64                   `json:"size"`
	ModTime      time.Time               `json:"modTime"`
	FileType     string                  `json:"fileType"`
	AST          interface{}             `json:"ast,omitempty"`
	Imports      []ImportInfo            `json:"imports"`
	Exports      []ExportInfo            `json:"exports"`
	Declarations []TypeScriptDeclaration `json:"declarations"`
}

// ImportInfo represents an import statement
type ImportInfo struct {
	Source     string   `json:"source"`
	Specifiers []string `json:"specifiers"`
}

// ExportInfo represents an export statement
type ExportInfo struct {
	Name      string `json:"name"`
	IsDefault bool   `json:"isDefault"`
}

// Crawler handles TypeScript file discovery and analysis
type Crawler struct {
	parser          *oxc.Parser
	rootDir         string
	excludePatterns []string
	astCache        *ASTCache
	config          *utils.IndexerConfig
}

// ASTCache represents a cache for parsed ASTs
type ASTCache struct {
	cache map[string]CacheEntry
	mu    sync.RWMutex
}

// CacheEntry represents a cached AST result
type CacheEntry struct {
	ModTime time.Time         `json:"modTime"`
	AST     *oxc.ParserOutput `json:"ast"`
}

// NewCrawler creates a new crawler instance
func NewCrawler(config *utils.IndexerConfig, parser *oxc.Parser, rootDir string) *Crawler {
	return &Crawler{
		config:          config,
		parser:          parser,
		rootDir:         rootDir,
		excludePatterns: config.ExcludePatterns,
		astCache: &ASTCache{
			cache: make(map[string]CacheEntry),
		},
	}
}

// shouldExclude checks if a path should be excluded from analysis
func (c *Crawler) shouldExclude(path string) bool {
	// Check against exclude patterns from config
	for _, pattern := range c.excludePatterns {
		if strings.Contains(path, pattern) {
			return true
		}
	}

	// Check for spec and stories files
	baseName := filepath.Base(path)
	if strings.HasSuffix(baseName, ".spec.ts") || strings.HasSuffix(baseName, ".stories.ts") {
		return true
	}

	return false
}

// isTypeScriptFile checks if a file is a TypeScript file
func (c *Crawler) isTypeScriptFile(path string) bool {
	ext := filepath.Ext(path)
	return ext == ".ts" || ext == ".tsx"
}

// extractDeclarations extracts TypeScript declarations from the AST
func (c *Crawler) extractDeclarations(ast interface{}) []TypeScriptDeclaration {
	declarations := make([]TypeScriptDeclaration, 0)

	if astMap, ok := ast.(map[string]interface{}); ok {
		if astMap["type"] != "Program" {
			return declarations
		}

		if body, ok := astMap["body"].([]interface{}); ok {
			for _, node := range body {
				if nodeMap, ok := node.(map[string]interface{}); ok {
					nodeType, _ := nodeMap["type"].(string)

					// Extract based on node type
					switch nodeType {
					case "TSInterfaceDeclaration", "TSTypeAliasDeclaration", "ClassDeclaration",
						"FunctionDeclaration", "VariableDeclaration", "EnumDeclaration",
						"TSModuleDeclaration", "TSNamespaceExportDeclaration":
						var name string
						var ok bool

						// Handle different ways of getting the name
						if id, hasID := nodeMap["id"].(map[string]interface{}); hasID {
							name, ok = id["name"].(string)
						} else if declarations, hasDecl := nodeMap["declarations"].([]interface{}); hasDecl && len(declarations) > 0 {
							// For VariableDeclaration
							if firstDecl, isMap := declarations[0].(map[string]interface{}); isMap {
								if id, hasID := firstDecl["id"].(map[string]interface{}); hasID {
									name, ok = id["name"].(string)
								}
							}
						}

						if ok && name != "" {
							loc := extractLocation(nodeMap)

							decl := TypeScriptDeclaration{
								Type:     nodeType,
								Name:     name,
								Location: loc,
							}

							// Extract additional properties based on type
							props := make(map[string]interface{})
							switch nodeType {
							case "TSInterfaceDeclaration":
								if body, ok := nodeMap["body"].(map[string]interface{}); ok {
									props["members"] = extractMembers(body)
								}
							case "ClassDeclaration":
								if body, ok := nodeMap["body"].(map[string]interface{}); ok {
									props["members"] = extractClassMembers(body)
								}
							case "VariableDeclaration":
								props["kind"] = nodeMap["kind"]
							}
							decl.Properties = props

							declarations = append(declarations, decl)
						}
					}
				}
			}
		}
	}

	return declarations
}

// extractLocation extracts location information from a node
func extractLocation(node map[string]interface{}) Location {
	loc := Location{}
	if start, ok := node["start"].(float64); ok {
		loc.Start = int(start)
	}
	if end, ok := node["end"].(float64); ok {
		loc.End = int(end)
	}
	// Add line and column if available in the AST
	return loc
}

// extractMembers extracts member information from an interface or class body
func extractMembers(body map[string]interface{}) []map[string]interface{} {
	members := make([]map[string]interface{}, 0)
	if bodyMembers, ok := body["body"].([]interface{}); ok {
		for _, member := range bodyMembers {
			if memberMap, ok := member.(map[string]interface{}); ok {
				memberInfo := make(map[string]interface{})
				if key, ok := memberMap["key"].(map[string]interface{}); ok {
					memberInfo["name"], _ = key["name"].(string)
				}
				if typeAnnotation, ok := memberMap["typeAnnotation"].(map[string]interface{}); ok {
					memberInfo["type"] = extractTypeInfo(typeAnnotation)
				}
				members = append(members, memberInfo)
			}
		}
	}
	return members
}

// extractTypeInfo extracts type information from a type annotation
func extractTypeInfo(typeAnnotation map[string]interface{}) string {
	if typeInfo, ok := typeAnnotation["typeAnnotation"].(map[string]interface{}); ok {
		return fmt.Sprintf("%v", typeInfo["type"])
	}
	return "unknown"
}

// extractClassMembers extracts member information from a class body
func extractClassMembers(body map[string]interface{}) []map[string]interface{} {
	members := make([]map[string]interface{}, 0)
	if bodyMembers, ok := body["body"].([]interface{}); ok {
		for _, member := range bodyMembers {
			if memberMap, ok := member.(map[string]interface{}); ok {
				memberInfo := make(map[string]interface{})

				// Get member type
				if memberType, ok := memberMap["type"].(string); ok {
					memberInfo["type"] = memberType
				}

				// Get member key/name
				if key, ok := memberMap["key"].(map[string]interface{}); ok {
					memberInfo["name"], _ = key["name"].(string)
				}

				// Get member kind (method, property, etc)
				if kind, ok := memberMap["kind"].(string); ok {
					memberInfo["kind"] = kind
				}

				// Get static flag
				if static, ok := memberMap["static"].(bool); ok {
					memberInfo["static"] = static
				}

				// Get visibility
				if visibility, ok := memberMap["visibility"].(string); ok {
					memberInfo["visibility"] = visibility
				}

				members = append(members, memberInfo)
			}
		}
	}
	return members
}

// CrawlDirectory crawls a directory for TypeScript files and analyzes them
func (c *Crawler) CrawlDirectory(dir string) ([]FileAnalysis, error) {
	// Create channels for concurrent processing
	filesChan := make(chan string, 100)    // Buffer channel for file paths
	resultsChan := make(chan FileAnalysis) // Channel for results
	errorsChan := make(chan error)         // Channel for errors
	done := make(chan struct{})            // Signal channel for completion

	// Create a worker pool
	numWorkers := 8 // Adjust based on CPU cores
	workerDone := make(chan struct{})
	activeWorkers := numWorkers

	// Start workers
	for i := 0; i < numWorkers; i++ {
		go func() {
			c.worker(filesChan, resultsChan, errorsChan)
			workerDone <- struct{}{} // Signal worker completion
		}()
	}

	// Start a goroutine to collect results
	var files []FileAnalysis
	go func() {
		for result := range resultsChan {
			files = append(files, result)
		}
		close(done)
	}()

	// Walk directory and send files to workers
	go func() {
		err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			// Skip excluded directories
			if info.IsDir() && c.shouldExclude(path) {
				return filepath.SkipDir
			}

			// Only queue TypeScript files
			if !info.IsDir() && c.isTypeScriptFile(path) {
				filesChan <- path
			}

			return nil
		})

		if err != nil {
			errorsChan <- fmt.Errorf("failed to walk directory: %w", err)
		}

		close(filesChan) // Signal that no more files will be sent
	}()

	// Wait for all workers to finish
	go func() {
		// Wait for all workers to complete
		for i := 0; i < numWorkers; i++ {
			<-workerDone
			activeWorkers--
			if activeWorkers == 0 {
				close(resultsChan) // Close results channel when all workers are done
			}
		}
	}()

	// Wait for results collection
	<-done

	// Check for errors
	select {
	case err := <-errorsChan:
		return nil, err
	default:
		return files, nil
	}
}

// processFile processes a single file and returns a SourceFile
func (c *Crawler) processFile(filePath, baseDir string) (*models.SourceFile, error) {
	// Read file info
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to stat file: %w", err)
	}

	// Read file content
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Parse AST
	ast, err := c.parser.Parse(filePath, string(content))
	if err != nil {
		return nil, fmt.Errorf("failed to parse file: %w", err)
	}

	// Get relative path
	relPath, err := filepath.Rel(baseDir, filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get relative path: %w", err)
	}

	return &models.SourceFile{
		Path:         filePath,
		RelativePath: relPath,
		Size:         info.Size(),
		ModTime:      info.ModTime(),
		FileType:     filepath.Ext(filePath),
		AST:          ast,
	}, nil
}

// worker processes files from the files channel
func (c *Crawler) worker(files <-chan string, results chan<- FileAnalysis, errors chan<- error) {
	for path := range files {
		// Get file info for modification time
		info, err := os.Stat(path)
		if err != nil {
			errors <- fmt.Errorf("failed to stat file %s: %w", path, err)
			continue
		}

		// Check cache first
		var result *oxc.ParserOutput
		c.astCache.mu.RLock()
		if entry, exists := c.astCache.cache[path]; exists && entry.ModTime.Equal(info.ModTime()) {
			result = entry.AST
		}
		c.astCache.mu.RUnlock()

		if result == nil {
			// Cache miss or outdated - read and parse file
			code, err := os.ReadFile(path)
			if err != nil {
				errors <- fmt.Errorf("failed to read file %s: %w", path, err)
				continue
			}

			// Parse file
			result, err = c.parser.Parse(path, string(code))
			if err != nil {
				errors <- fmt.Errorf("failed to parse file %s: %w", path, err)
				continue
			}

			// Cache the result
			c.astCache.mu.Lock()
			c.astCache.cache[path] = CacheEntry{
				ModTime: info.ModTime(),
				AST:     result,
			}
			c.astCache.mu.Unlock()
		}

		// Skip files that failed to parse
		if !result.Success {
			continue
		}

		// Create relative path
		relPath, err := filepath.Rel(c.rootDir, path)
		if err != nil {
			relPath = path
		}

		// Extract declarations, imports, and exports
		declarations := c.extractDeclarations(result.AST)
		imports := make([]ImportInfo, 0)
		exports := make([]ExportInfo, 0)

		if astMap, ok := result.AST.(map[string]interface{}); ok && astMap["type"] == "Program" {
			if body, ok := astMap["body"].([]interface{}); ok {
				for _, node := range body {
					if nodeMap, ok := node.(map[string]interface{}); ok {
						nodeType, _ := nodeMap["type"].(string)

						// Handle imports
						if nodeType == "ImportDeclaration" {
							if source, ok := nodeMap["source"].(map[string]interface{}); ok {
								if value, ok := source["value"].(string); ok {
									imports = append(imports, ImportInfo{
										Source:     value,
										Specifiers: extractImportSpecifiers(nodeMap),
									})
								}
							}
						}

						// Handle exports
						switch nodeType {
						case "ExportNamedDeclaration":
							if declaration, ok := nodeMap["declaration"].(map[string]interface{}); ok {
								if id, ok := declaration["id"].(map[string]interface{}); ok {
									if name, ok := id["name"].(string); ok {
										exports = append(exports, ExportInfo{
											Name:      name,
											IsDefault: false,
										})
									}
								}
							}
						case "ExportDefaultDeclaration":
							if declaration, ok := nodeMap["declaration"].(map[string]interface{}); ok {
								if id, ok := declaration["id"].(map[string]interface{}); ok {
									if name, ok := id["name"].(string); ok {
										exports = append(exports, ExportInfo{
											Name:      name,
											IsDefault: true,
										})
									}
								}
							}
						}
					}
				}
			}
		}

		// Create file analysis with all extracted information
		analysis := FileAnalysis{
			Path:         path,
			RelativePath: relPath,
			Size:         info.Size(),
			ModTime:      info.ModTime(),
			FileType:     filepath.Ext(path),
			AST:          result.AST,
			Imports:      imports,
			Exports:      exports,
			Declarations: declarations,
		}

		results <- analysis
	}
}

// extractImportSpecifiers extracts import specifiers from an import declaration
func extractImportSpecifiers(node map[string]interface{}) []string {
	specifiers := make([]string, 0)
	if specs, ok := node["specifiers"].([]interface{}); ok {
		for _, spec := range specs {
			if specMap, ok := spec.(map[string]interface{}); ok {
				if local, ok := specMap["local"].(map[string]interface{}); ok {
					if name, ok := local["name"].(string); ok {
						specifiers = append(specifiers, name)
					}
				}
			}
		}
	}
	return specifiers
}

// SaveCache saves the AST cache to a file
func (c *Crawler) SaveCache(cacheFile string) error {
	c.astCache.mu.RLock()
	defer c.astCache.mu.RUnlock()

	// Create cache directory if it doesn't exist
	cacheDir := filepath.Dir(cacheFile)
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return fmt.Errorf("failed to create cache directory: %w", err)
	}

	// Open cache file
	file, err := os.Create(cacheFile)
	if err != nil {
		return fmt.Errorf("failed to create cache file: %w", err)
	}
	defer file.Close()

	// Create cache data structure
	cacheData := make(map[string]CacheEntry)
	for path, entry := range c.astCache.cache {
		cacheData[path] = entry
	}

	// Write cache to file
	encoder := json.NewEncoder(file)
	if err := encoder.Encode(cacheData); err != nil {
		return fmt.Errorf("failed to encode cache: %w", err)
	}

	return nil
}

// LoadCache loads the AST cache from a file
func (c *Crawler) LoadCache(cacheFile string) error {
	c.astCache.mu.Lock()
	defer c.astCache.mu.Unlock()

	// Open cache file
	file, err := os.Open(cacheFile)
	if err != nil {
		if os.IsNotExist(err) {
			// No cache file exists yet, start with empty cache
			return nil
		}
		return fmt.Errorf("failed to open cache file: %w", err)
	}
	defer file.Close()

	// Read cache from file
	var cacheData map[string]CacheEntry
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&cacheData); err != nil {
		return fmt.Errorf("failed to decode cache: %w", err)
	}

	// Update cache
	c.astCache.cache = cacheData

	return nil
}

// ClearCache clears the AST cache
func (c *Crawler) ClearCache() {
	c.astCache.mu.Lock()
	defer c.astCache.mu.Unlock()
	c.astCache.cache = make(map[string]CacheEntry)
}
