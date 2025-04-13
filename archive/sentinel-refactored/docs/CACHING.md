# Sentinel Caching System

## Overview

Sentinel includes a caching system that significantly improves performance for repeated analyses. When enabled, the cache stores parsed Abstract Syntax Trees (ASTs) and tracks file metadata to avoid re-parsing files that haven't changed since the last analysis run.

## How It Works

1. **Fingerprinting**: Each file is fingerprinted by storing its size, modification time, and content hash
2. **AST Caching**: Parsed ASTs are cached, eliminating the need to re-parse unchanged files
3. **Incremental Analysis**: Only files that have changed since the last run are re-parsed; rules are still applied to all files
4. **Directory-Based Caching**: ASTs are grouped by directory to minimize the number of cache files (optimized for large codebases)

## Performance Benefits

The caching system provides several performance benefits:

- **Faster Incremental Runs**: Subsequent analysis runs after the first complete run are much faster
- **Reduced CPU Usage**: Parsing is one of the most CPU-intensive operations in the analysis pipeline
- **Lower Memory Usage**: By processing fewer files at once, the peak memory usage can be reduced
- **Optimized for Large Codebases**: The directory-based caching approach efficiently handles projects with thousands of files

## Configuration

### Command Line Flags

The following command line flags control caching behavior:

- `--use-cache` - Enable/disable caching (default: true)
- `--cache-dir` - Directory to store cache files (default: `.sentinel-cache`)
- `--clear-cache` - Clear the cache before running (useful when rules change)

### Configuration File

Caching can also be configured in the `sentinel.yaml` configuration file:

```yaml
# Cache options
useCache: true # Enable/disable caching
cacheDirectory: ".sentinel-cache" # Directory to store cache files
```

## Best Practices

Here are some recommended best practices for using the caching system:

1. **Enable for CI/CD Pipelines**: Caching is especially useful in CI/CD environments where incremental analysis can save significant time
2. **Clear Cache When Rules Change**: Use `--clear-cache` when rule definitions change to ensure correct results
3. **Custom Cache Location**: You might want to set a specific cache directory for different projects
4. **Consider Cache Locality**: For large monorepos, setting up separate cache directories for different parts of the codebase can improve performance

## Common Issues

### When to Clear the Cache

The cache should be cleared in the following scenarios:

- After updating Sentinel or its rules
- If you suspect incorrect analysis results
- When switching between different sets of rules

### Cache File Size

The cache can grow over time, especially for large projects. The system automatically removes entries for files that no longer exist, but you might want to occasionally clear the cache manually to reclaim disk space.

## Technical Details

### Directory-Based Caching

To efficiently handle large codebases (5,000+ files), Sentinel uses a directory-based caching approach:

- **Cache Index**: A single `cache-index.json` file stores metadata about all analyzed files
- **Directory Caches**: Instead of creating one file per AST, files in the same directory share a single cache file
- **Efficient Lookup**: When a file needs to be analyzed, Sentinel first checks if it's in the cache index, then retrieves its AST from the appropriate directory cache

This approach significantly reduces the number of files in the cache directory, which improves filesystem performance, especially on systems with limitations on the number of open files or directory entries.

### Cache Structure

The cache directory contains:

- `cache-index.json`: Contains metadata for all files and directory mappings
- `dir_[hash].json`: Directory cache files containing ASTs for files in the same directory

### Memory Management

The caching system uses a lazy-loading approach to minimize memory usage:

- Directory caches are only loaded when needed
- Cache files are written to disk only when they've been modified
- The system tracks which directory caches have been modified to avoid unnecessary writes

## Benchmarks

On a typical project with 100-200 TypeScript files:

- **First run**: Full parsing and analysis
- **Subsequent runs**: Up to 90% faster when most files are unchanged

For large projects (5,000+ files):

- The directory-based caching approach keeps the number of cache files manageable
- Cache lookup remains fast even with thousands of files
