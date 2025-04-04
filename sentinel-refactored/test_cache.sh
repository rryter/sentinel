#!/bin/bash

# Test script for Sentinel caching performance

TARGET_DIR=${1:-"../../myCSS/packages/mycss-app/src/app/features/onboarding"}
RULES_DIR=${2:-"bin/rules"}

echo "=== Testing Sentinel Caching Performance ==="
echo "Target directory: $TARGET_DIR"
echo "Rules directory: $RULES_DIR"
echo 

# Clear the cache to ensure clean test
echo ">>> Clearing cache before tests..."
rm -rf .sentinel-cache
mkdir -p .sentinel-cache

# First run - No cache
echo ">>> Running first analysis (no cache)..."
time ./sentinel-bin --dir="$TARGET_DIR" --rules="$RULES_DIR" --log-level=info

# Second run - With cache enabled
echo 
echo ">>> Running second analysis (with cache)..."
time ./sentinel-bin --dir="$TARGET_DIR" --rules="$RULES_DIR" --log-level=info --use-cache=true

# Third run - With cache disabled to compare
echo 
echo ">>> Running third analysis (cache disabled)..."
time ./sentinel-bin --dir="$TARGET_DIR" --rules="$RULES_DIR" --log-level=info --use-cache=false

# Examine cache directory
echo 
echo ">>> Cache directory structure:"
find .sentinel-cache -type f | sort
echo 
echo ">>> Cache directory statistics:"
du -sh .sentinel-cache
echo "Total cache files: $(find .sentinel-cache -type f | wc -l)"

# Directory-based cache analysis
echo 
echo ">>> Directory-based cache distribution:"
echo "Directory caches: $(find .sentinel-cache -name "dir_*.json" | wc -l)"
echo "Largest cache files:"
find .sentinel-cache -type f -printf "%s %p\n" | sort -nr | head -5

echo
echo "=== Test completed ===" 