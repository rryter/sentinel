package utils

import (
	"encoding/json"
	"os"
	"runtime"
)

// IndexerConfig holds the configuration for the indexer
type IndexerConfig struct {
	IncludePatterns []string `json:"includePatterns"`
	ExcludePatterns []string `json:"excludePatterns"`
	MaxDepth        int      `json:"maxDepth"`
	FollowSymlinks  bool     `json:"followSymlinks"`
	Concurrency     int      `json:"concurrency"`
	NodeScriptPath  string   `json:"nodeScriptPath"`
	OutputPath      string   `json:"outputPath"`
	MaxChunkSize    int      `json:"maxChunkSize"`
}

// DefaultConfig returns a default configuration
func DefaultConfig() IndexerConfig {
	return IndexerConfig{
		IncludePatterns: []string{"**/*.ts", "**/*.tsx", "**/*.html", "**/*.scss"},
		ExcludePatterns: []string{"**/node_modules/**", "**/dist/**", "**/*.spec.ts"},
		MaxDepth:        10,
		FollowSymlinks:  false,
		Concurrency:     runtime.NumCPU(),
		NodeScriptPath:  "scripts/typescript-analyzer.js",
		OutputPath:      "analysis-result.json",
		MaxChunkSize:    2000, // Approximate token count for chunk size
	}
}

// LoadConfig loads configuration from a JSON file
func LoadConfig(path string) (IndexerConfig, error) {
	config := DefaultConfig()

	file, err := os.Open(path)
	if err != nil {
		return config, err
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	err = decoder.Decode(&config)
	if err != nil {
		return config, err
	}

	return config, nil
}

// SaveConfig saves configuration to a JSON file
func SaveConfig(config IndexerConfig, path string) error {
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	return encoder.Encode(config)
}
