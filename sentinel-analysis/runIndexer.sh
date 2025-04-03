#!/bin/bash

# Color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Parse command line arguments
DEBUG=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --debug) DEBUG=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo -e "\nRunning Sentinel Indexer...\n"

# Build rules first
./build_rules.sh

echo -e "\n➜ Building indexer..."
echo -e "  ${CYAN}⚡${NC} Compiling indexer..."
CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o bin/indexer cmd/indexer/main.go
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to compile indexer${NC}"
    exit 1
fi

echo -e "  ${CYAN}⚡${NC} Compiling uploader..."
CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o bin/uploader ./cmd/uploader/...
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to compile uploader${NC}"
    exit 1
fi

echo -e "${GREEN}Build completed successfully${NC}"

# Set target directory and create output directory
TARGET_DIR="/home/rryter/projects/myCSS/packages/mycss-app/src/app/features/onboarding"
OUTPUT_DIR="analysis"
RULES_DIR="bin/rules"
CACHE_FILE="$OUTPUT_DIR/ast-cache.json"

# Build the indexer command with debug flag if enabled
INDEXER_CMD="./bin/indexer -dir=\"$TARGET_DIR\" -outdir=\"$OUTPUT_DIR\" -rules=\"$RULES_DIR\" -cache=\"$CACHE_FILE\""
if [ "$DEBUG" = true ]; then
    INDEXER_CMD="$INDEXER_CMD -debug"
fi

# Run the indexer
printf "\n${YELLOW}➜ ${BOLD}Running analysis...${NC}\n"
printf "  ${CYAN}⚡${NC} Target: ${CYAN}%s${NC}\n" "$TARGET_DIR"
if output=$(eval $INDEXER_CMD 2>&1); then
    echo "$output"
    echo -e "${GREEN}Analysis completed successfully${NC}"
else
    printf "\n${RED}${BOLD}⚠️  Analysis failed!${NC}\n\n"
    echo "$output"
    exit 1
fi