#!/bin/bash

# Simple build script for Sentinel Refactored

set -e # Exit immediately if a command exits with a non-zero status.

# Change to the script's directory to ensure relative paths work
cd "$(dirname "$0")"

ROOT_DIR=$(pwd)
OUTPUT_DIR="${ROOT_DIR}/bin"
RULES_SRC_DIR="${ROOT_DIR}/rules-definitions"
RULES_OUT_DIR="${OUTPUT_DIR}/rules"

# --- Clean --- 
echo "Cleaning previous build output..."
rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"
mkdir -p "${RULES_OUT_DIR}"

# --- Build Main Application --- 
echo "Building main sentinel application..."
go build -o "${OUTPUT_DIR}/sentinel" ./cmd/sentinel
if [ $? -ne 0 ]; then
    echo "Error: Failed to build main application."
    exit 1
fi
echo "Main application built successfully -> ${OUTPUT_DIR}/sentinel"

# --- Build Rule Plugins --- 
echo "Building rule plugins..."

# Find all rule source files
find "${RULES_SRC_DIR}" -name '*.go' | while read rule_file; do
    relative_path=$(realpath --relative-to="${RULES_SRC_DIR}" "${rule_file}")
    category=$(dirname "${relative_path}")
    rule_name=$(basename "${rule_file}" .go)
    output_name="${rule_name}.so"
    output_path="${RULES_OUT_DIR}/${category}/${output_name}"

    echo "  Building rule: ${category}/${rule_name}.go -> ${output_path}"
    mkdir -p "$(dirname "${output_path}")" # Ensure category directory exists
    
    # Compile as plugin
    # CGO_ENABLED=1 is often required for plugins
    # GOOS=linux might be needed if running in a different environment than target
    CGO_ENABLED=1 go build -buildmode=plugin -o "${output_path}" "${rule_file}"
    if [ $? -ne 0 ]; then
        echo "    Error: Failed to build plugin ${rule_name}.so"
        # Decide whether to exit or continue building others
        # exit 1 
    else
        echo "    Successfully built ${output_name}"
    fi
done

echo "Build script finished." 