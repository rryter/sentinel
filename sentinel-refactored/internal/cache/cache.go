package cache

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"

	customlog "sentinel-refactored/pkg/log"
)

// FileInfo contains metadata about a file that's been cached
type FileInfo struct {
	Path           string    `json:"path"`
	Size           int64     `json:"size"`
	ModTime        time.Time `json:"modTime"`
	ContentHash    string    `json:"contentHash,omitempty"`
	LastAnalyzed   time.Time `json:"lastAnalyzed"`
	ASTCacheKey    string    `json:"astCacheKey,omitempty"` // Reference to the cache file containing the AST
	DirCacheKey    string    `json:"dirCacheKey,omitempty"` // Directory-based cache key
}

// CacheIndex represents the main cache index file
type CacheIndex struct {
	Version     string               `json:"version"`
	CreatedAt   time.Time            `json:"createdAt"`
	LastUpdated time.Time            `json:"lastUpdated"`
	Files       map[string]*FileInfo `json:"files"`
	// Track directories to manage directory-based caching
	Directories map[string]string    `json:"directories"` // dir path -> cache file
}

// DirectoryCache represents the cache for all files in a directory
type DirectoryCache struct {
	DirectoryPath string                        `json:"directoryPath"`
	LastUpdated   time.Time                     `json:"lastUpdated"`
	ASTs          map[string]map[string]interface{} `json:"asts"` // filename -> AST
}

// ResultCache manages caching of file analysis results
type ResultCache struct {
	cacheDir     string
	indexPath    string
	index        *CacheIndex
	dirCaches    map[string]*DirectoryCache // Directory path -> DirectoryCache
	mutex        sync.RWMutex
	hasChanges   bool
	dirty        map[string]bool // Track which directory caches have changed
}

// NewResultCache initializes a new result cache
func NewResultCache(cacheDir string) (*ResultCache, error) {
	// Create cache directory if it doesn't exist
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create cache directory: %w", err)
	}

	indexPath := filepath.Join(cacheDir, "cache-index.json")
	cache := &ResultCache{
		cacheDir:  cacheDir,
		indexPath: indexPath,
		dirCaches: make(map[string]*DirectoryCache),
		dirty:     make(map[string]bool),
	}

	// Load existing index if it exists
	if _, err := os.Stat(indexPath); err == nil {
		data, err := os.ReadFile(indexPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read cache index: %w", err)
		}

		var index CacheIndex
		if err := json.Unmarshal(data, &index); err != nil {
			customlog.Warnf("Failed to parse cache index, starting with a fresh cache: %v", err)
			cache.initNewIndex()
		} else {
			cache.index = &index
			customlog.Debugf("Loaded cache index with %d files", len(index.Files))
		}
	} else {
		cache.initNewIndex()
	}

	return cache, nil
}

// initNewIndex initializes a new cache index
func (c *ResultCache) initNewIndex() {
	c.index = &CacheIndex{
		Version:     "1.0",
		CreatedAt:   time.Now(),
		LastUpdated: time.Now(),
		Files:       make(map[string]*FileInfo),
		Directories: make(map[string]string),
	}
	c.hasChanges = true
}

// Save persists the cache index and any changed directory caches to disk
func (c *ResultCache) Save() error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	if !c.hasChanges {
		return nil
	}

	// First save any dirty directory caches
	for dirPath, isDirty := range c.dirty {
		if !isDirty {
			continue
		}

		dirCache, exists := c.dirCaches[dirPath]
		if !exists {
			continue
		}

		// Update timestamp
		dirCache.LastUpdated = time.Now()

		// Create directory cache file path
		dirCacheKey := c.index.Directories[dirPath]
		if dirCacheKey == "" {
			// Generate a new key if none exists
			dirHash := md5.Sum([]byte(dirPath))
			dirCacheKey = hex.EncodeToString(dirHash[:])
			c.index.Directories[dirPath] = dirCacheKey
		}

		dirCachePath := filepath.Join(c.cacheDir, fmt.Sprintf("dir_%s.json", dirCacheKey))
		dirData, err := json.Marshal(dirCache)
		if err != nil {
			return fmt.Errorf("failed to marshal directory cache: %w", err)
		}

		if err := os.WriteFile(dirCachePath, dirData, 0644); err != nil {
			return fmt.Errorf("failed to write directory cache: %w", err)
		}

		c.dirty[dirPath] = false
	}

	// Update the index last modified time
	c.index.LastUpdated = time.Now()

	// Then save the index
	data, err := json.Marshal(c.index)
	if err != nil {
		return fmt.Errorf("failed to marshal cache index: %w", err)
	}

	if err := os.WriteFile(c.indexPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write cache index: %w", err)
	}

	c.hasChanges = false
	customlog.Debugf("Cache saved successfully with %d files", len(c.index.Files))
	return nil
}

// IsFileChanged checks if a file has changed since it was last cached
func (c *ResultCache) IsFileChanged(filePath string) (bool, error) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	// Get file info from OS
	stat, err := os.Stat(filePath)
	if err != nil {
		return true, fmt.Errorf("failed to stat file: %w", err)
	}

	// Check if we have this file in the cache
	cachedInfo, exists := c.index.Files[filePath]
	if !exists {
		return true, nil
	}

	// Quick check: file size or modification time changed?
	if stat.Size() != cachedInfo.Size || stat.ModTime().After(cachedInfo.ModTime) {
		return true, nil
	}

	// If we already have a content hash, avoid re-reading the file
	if cachedInfo.ContentHash != "" {
		return false, nil
	}

	// Otherwise, compute hash and compare
	hash, err := hashFile(filePath)
	if err != nil {
		return true, fmt.Errorf("failed to hash file: %w", err)
	}

	return hash != cachedInfo.ContentHash, nil
}

// GetASTResult retrieves a cached AST result for a file
func (c *ResultCache) GetASTResult(filePath string) (map[string]interface{}, bool, error) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	fileInfo, exists := c.index.Files[filePath]
	if !exists {
		return nil, false, nil
	}

	// Get directory path
	dirPath := filepath.Dir(filePath)
	
	// Check if we have a directory cache key and if the file's DirCacheKey is set
	_, hasDirCache := c.index.Directories[dirPath]
	if !hasDirCache || fileInfo.DirCacheKey == "" {
		return nil, false, nil
	}

	// Load directory cache if not already loaded
	dirCache, err := c.loadDirectoryCache(dirPath)
	if err != nil {
		return nil, false, fmt.Errorf("failed to load directory cache: %w", err)
	}

	// Get the filename part
	fileName := filepath.Base(filePath)
	
	// Get AST from directory cache
	ast, exists := dirCache.ASTs[fileName]
	if !exists {
		return nil, false, nil
	}

	return ast, true, nil
}

// loadDirectoryCache loads a directory cache from disk if not already in memory
func (c *ResultCache) loadDirectoryCache(dirPath string) (*DirectoryCache, error) {
	// Check if already loaded
	if cache, exists := c.dirCaches[dirPath]; exists {
		return cache, nil
	}

	// Get directory cache key
	dirCacheKey, exists := c.index.Directories[dirPath]
	if !exists {
		// Create new directory cache
		cache := &DirectoryCache{
			DirectoryPath: dirPath,
			LastUpdated:   time.Now(),
			ASTs:          make(map[string]map[string]interface{}),
		}
		c.dirCaches[dirPath] = cache
		return cache, nil
	}

	// Try to load from disk
	dirCachePath := filepath.Join(c.cacheDir, fmt.Sprintf("dir_%s.json", dirCacheKey))
	
	if _, err := os.Stat(dirCachePath); os.IsNotExist(err) {
		// File doesn't exist, create new cache
		cache := &DirectoryCache{
			DirectoryPath: dirPath,
			LastUpdated:   time.Now(),
			ASTs:          make(map[string]map[string]interface{}),
		}
		c.dirCaches[dirPath] = cache
		return cache, nil
	}

	data, err := os.ReadFile(dirCachePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory cache: %w", err)
	}

	var dirCache DirectoryCache
	if err := json.Unmarshal(data, &dirCache); err != nil {
		return nil, fmt.Errorf("failed to parse directory cache: %w", err)
	}

	c.dirCaches[dirPath] = &dirCache
	return &dirCache, nil
}

// StoreASTResult caches an AST result for a file
func (c *ResultCache) StoreASTResult(filePath string, ast map[string]interface{}) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	// Get file info from OS
	stat, err := os.Stat(filePath)
	if err != nil {
		return fmt.Errorf("failed to stat file: %w", err)
	}

	// Compute file hash if needed
	var fileHash string
	fileInfo, exists := c.index.Files[filePath]
	
	if !exists || fileInfo.ContentHash == "" {
		hash, err := hashFile(filePath)
		if err != nil {
			return fmt.Errorf("failed to hash file: %w", err)
		}
		fileHash = hash
	} else {
		fileHash = fileInfo.ContentHash
	}

	// Get directory path and ensure it exists in our mappings
	dirPath := filepath.Dir(filePath)
	fileName := filepath.Base(filePath)
	
	// Get or create directory cache
	dirCache, err := c.loadDirectoryCache(dirPath)
	if err != nil {
		return fmt.Errorf("failed to load directory cache: %w", err)
	}
	
	// Generate directory cache key if needed
	if _, exists := c.index.Directories[dirPath]; !exists {
		dirHash := md5.Sum([]byte(dirPath))
		c.index.Directories[dirPath] = hex.EncodeToString(dirHash[:])
	}
	
	dirCacheKey := c.index.Directories[dirPath]

	// Store AST in directory cache
	dirCache.ASTs[fileName] = ast
	c.dirty[dirPath] = true

	// Update or create file info
	c.index.Files[filePath] = &FileInfo{
		Path:          filePath,
		Size:          stat.Size(),
		ModTime:       stat.ModTime(),
		ContentHash:   fileHash,
		LastAnalyzed:  time.Now(),
		DirCacheKey:   dirCacheKey,
	}

	c.hasChanges = true
	return nil
}

// CleanupOldEntries removes entries for files that no longer exist
// Returns the number of entries removed
func (c *ResultCache) CleanupOldEntries() int {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	removed := 0
	dirMap := make(map[string]map[string]bool) // dir -> filename -> exists
	
	// First pass: check which files still exist
	for filePath := range c.index.Files {
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			// File no longer exists
			delete(c.index.Files, filePath)
			removed++
			
			// Track directory to cleanup AST caches
			dirPath := filepath.Dir(filePath)
			fileName := filepath.Base(filePath)
			
			if _, exists := dirMap[dirPath]; !exists {
				dirMap[dirPath] = make(map[string]bool)
			}
			dirMap[dirPath][fileName] = false
			
			c.hasChanges = true
		} else {
			// File still exists
			dirPath := filepath.Dir(filePath)
			fileName := filepath.Base(filePath)
			
			if _, exists := dirMap[dirPath]; !exists {
				dirMap[dirPath] = make(map[string]bool)
			}
			dirMap[dirPath][fileName] = true
		}
	}
	
	// Second pass: cleanup directory caches
	for dirPath, fileMap := range dirMap {
		dirCache, err := c.loadDirectoryCache(dirPath)
		if err != nil {
			customlog.Warnf("Failed to load directory cache for cleanup: %v", err)
			continue
		}
		
		for fileName, exists := range fileMap {
			if !exists {
				delete(dirCache.ASTs, fileName)
				c.dirty[dirPath] = true
			}
		}
		
		// If directory cache is empty, remove it
		if len(dirCache.ASTs) == 0 {
			delete(c.dirCaches, dirPath)
			delete(c.index.Directories, dirPath)
			delete(c.dirty, dirPath)
			
			// Also remove the file from disk
			dirCacheKey := c.index.Directories[dirPath]
			if dirCacheKey != "" {
				dirCachePath := filepath.Join(c.cacheDir, fmt.Sprintf("dir_%s.json", dirCacheKey))
				if err := os.Remove(dirCachePath); err != nil {
					customlog.Warnf("Failed to remove empty directory cache file: %v", err)
				}
			}
		}
	}

	if removed > 0 {
		c.hasChanges = true
	}
	
	return removed
}

// hashFile computes a hash of the file contents
func hashFile(filePath string) (string, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer f.Close()

	h := md5.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	return hex.EncodeToString(h.Sum(nil)), nil
} 