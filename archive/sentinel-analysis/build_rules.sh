#!/bin/bash

# Color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to extract rule name from Go file
get_rule_name() {
    local file=$1
    # Try to find the rule name in the NewBaseRule constructor
    local rule_name=$(grep -A 3 'NewBaseRule' "$file" | grep '".*"' | head -n 1 | tail -n 1 | tr -d ' ",' | xargs)
    if [ -z "$rule_name" ]; then
        # Fallback to file name if we can't find the rule name
        basename "$file" .go
    else
        echo "$rule_name"
    fi
}

# Create rules directory if it doesn't exist
mkdir -p bin/rules

# First, collect all categories
categories=$(find rules -mindepth 1 -maxdepth 1 -type d -exec basename {} \;)

# Track build status
build_failed=0

# Build rules category by category
for category in $categories; do
    printf "${YELLOW}➜ ${BOLD}Building ${RED}${category}${YELLOW} rules...${NC}\n"
    
    # Find all .go files in this category
    find "rules/$category" -name "*.go" | while read rule; do
        # Get relative path from rules directory
        rel_path=${rule#rules/}
        # Get directory path relative to rules directory
        rel_dir=$(dirname "$rel_path")
        # Get filename without extension
        name=$(basename "$rule" .go)
        # Get display name
        display_name=$(get_rule_name "$rule")
        
        # Create output directory structure
        mkdir -p "bin/rules/$rel_dir"
        
        # Build from the rule's directory
        src_dir=$(dirname "$rule")
        printf "  ${CYAN}⚡${NC} Building ${CYAN}%s${NC}..." "$display_name"
        
        # Capture build output and errors
        output=$(cd "$src_dir" && go build -buildmode=plugin -o "../../bin/rules/$rel_dir/${name}.so" "${name}.go" 2>&1)
        if [ $? -eq 0 ]; then
            printf " ${GREEN}✓${NC}\n"
        else
            printf " ${RED}✗${NC}\n"
            printf "    ${RED}Error:${NC} %s\n" "$output"
            build_failed=1
        fi
    done
    echo
done

if [ $build_failed -eq 0 ]; then
    printf "${GREEN}${BOLD}✨ Build complete! All rules built successfully.${NC}\n\n"
else
    printf "${RED}${BOLD}⚠️  Build completed with errors.${NC}\n\n"
    exit 1
fi 