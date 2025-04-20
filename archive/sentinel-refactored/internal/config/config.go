package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// Default values
const (
	DefaultRulesDir      = "rules-definitions"
	DefaultOutputDir     = "analysis_output"
	DefaultTargetDir     = "."
	DefaultConfigFile    = "sentinel.yaml"
	DefaultFollowSymlinks = false
	DefaultCacheDir      = ".sentinel-cache"
	DefaultUseCache      = true
)

// Config defines the application's configuration structure.
type Config struct {
	TargetDir      string   `yaml:"targetDirectory"`
	RulesDir       string   `yaml:"rulesDirectory"`
	OutputDir      string   `yaml:"outputDirectory"`
	FollowSymlinks bool     `yaml:"followSymlinks"`
	ExcludePatterns []string `yaml:"excludePatterns,omitempty"`
	ExcludeSuffixes []string `yaml:"excludeSuffixes,omitempty"`
	LogLevel       string   `yaml:"logLevel,omitempty"` // e.g., "debug", "info", "warn"
	// Cache options
	UseCache       bool     `yaml:"useCache,omitempty"`
	CacheDir       string   `yaml:"cacheDirectory,omitempty"`
	// Add other configuration fields as needed
}

// Load attempts to load configuration from a YAML file.
// It applies default values for fields not specified in the file.
func Load(configPath string) (*Config, error) {
	cfg := &Config{
		// Set defaults first
		TargetDir:      DefaultTargetDir,
		RulesDir:       DefaultRulesDir,
		OutputDir:      DefaultOutputDir,
		FollowSymlinks: DefaultFollowSymlinks,
		LogLevel:       "info", // Default log level string
		// Cache defaults
		UseCache:       DefaultUseCache,
		CacheDir:       DefaultCacheDir,
		// Default exclude patterns/suffixes could be set here or taken from filesystem package
	}

	// If no path specified, try the default path
	if configPath == "" {
		configPath = DefaultConfigFile
	}

	// Attempt to read the config file
	data, err := os.ReadFile(configPath)
	if err != nil {
		// If the default file doesn't exist, it's okay, just use defaults.
		// If a specific path was given and it fails, return the error.
		if os.IsNotExist(err) && configPath == DefaultConfigFile {
			return cfg, nil // No config file found, use defaults
		} else {
			return nil, fmt.Errorf("failed to read config file '%s': %w", configPath, err)
		}
	}

	// Unmarshal the YAML data into the Config struct
	err = yaml.Unmarshal(data, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to parse config file '%s': %w", configPath, err)
	}

	// Post-load validation or adjustments can happen here if needed

	return cfg, nil
} 