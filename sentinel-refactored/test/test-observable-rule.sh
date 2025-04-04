#!/bin/bash

# Test script for the Angular Observable Input rule

# Set absolute paths
TEST_DIR=$(readlink -f "./test")
RULES_DIR="bin/rules"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=== Testing Angular Observable Input Rule ==="
echo "Test directory: $TEST_DIR"
echo 

# Clear cache to ensure a fresh test
echo "Clearing cache..."
rm -rf .sentinel-cache
rm -f /tmp/rule-debug.log

# Run the analysis
echo "Running analysis..."
echo "./sentinel-bin --debug --dir=\"$TEST_DIR\" --rules=\"$RULES_DIR\""
./sentinel-bin --debug --dir="$TEST_DIR" --rules="$RULES_DIR" > /tmp/observable-rule-test.log 2>&1

# Examine results file
echo
echo "Examining analysis results..."
if [ -f "analysis_output/analysis_results.json" ]; then
  echo "Analysis output file exists."
  MATCHES=$(grep -c "angular-observable-input" analysis_output/analysis_results.json || true)
else
  echo "No analysis output file found."
  MATCHES=0
fi

# Check debug logs
echo
if [ -f /tmp/rule-debug.log ]; then
  echo "Rule debug log found."
  DEBUG_MATCHES=$(grep -c "MATCH FOUND:" /tmp/rule-debug.log || true)
  echo "Debug log shows $DEBUG_MATCHES matches."
else
  echo "No rule debug log found."
  DEBUG_MATCHES=0
fi

# Display results
echo
echo "=== Results ==="
EXPECTED_MATCHES=2
echo -n "Expected matches: $EXPECTED_MATCHES, Found in results: $MATCHES, Found in debug log: $DEBUG_MATCHES - "

if [ "$MATCHES" -eq "$EXPECTED_MATCHES" ] || [ "$DEBUG_MATCHES" -eq "$EXPECTED_MATCHES" ]; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
  
  # Print log output
  echo
  echo "=== Analysis Output ==="
  grep --color=always -A 5 "Observable" /tmp/observable-rule-test.log || echo "No Observable mentions found in log"
  
  # Check if rule was loaded
  echo
  echo "=== Rule Loading ==="
  grep -A 2 "Loading rules" /tmp/observable-rule-test.log
  grep -A 2 "Successfully loaded" /tmp/observable-rule-test.log
  grep -A 2 "Finished loading rules" /tmp/observable-rule-test.log
  
  # The option might not be working correctly
  echo
  echo "=== Checking Command Line Options ==="
  grep -A 2 "Effective configuration" /tmp/observable-rule-test.log
fi

# Print the first 20 lines of debug log if exists
if [ -f /tmp/rule-debug.log ]; then
  echo
  echo "=== First 20 lines of Rule Debug Log ==="
  head -n 20 /tmp/rule-debug.log
fi

echo
echo "Done." 