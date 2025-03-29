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

# Print header
printf "\n${BOLD}${BLUE}Running Sentinel Indexer...${NC}\n"
if [ "$DEBUG" = true ]; then
    printf "${YELLOW}Debug mode enabled${NC}\n"
fi
printf "\n"

printf "${YELLOW}➜ ${BOLD}Removing all compiled rules...${NC}\n"
# Delete all the compiled rules
rm -rf bin/rules/*

# Build the rules
printf "${YELLOW}➜ ${BOLD}Building rules...${NC}\n"
chmod +x build_rules.sh
./build_rules.sh

# Build the indexer
printf "\n${YELLOW}➜ ${BOLD}Building indexer...${NC}\n"
mkdir -p bin

printf "  ${CYAN}⚡${NC} Compiling indexer..."
if output=$(time go build -o bin/indexer ./cmd/indexer 2>&1); then
    printf " ${GREEN}✓${NC}\n"
else
    printf " ${RED}✗${NC}\n"
    printf "    ${RED}Error:${NC} %s\n" "$output"
    exit 1
fi

printf "  ${CYAN}⚡${NC} Compiling uploader..."
if output=$(time go build -o bin/uploader ./cmd/uploader 2>&1); then
    printf " ${GREEN}✓${NC}\n"
else
    printf " ${RED}✗${NC}\n"
    printf "    ${RED}Error:${NC} %s\n" "$output"
    exit 1
fi

exit 0


# # Set target directory and create output directory
# TARGET_DIR="/home/rryter/projects/rai/apps/angular-ai-gen-backend/src/app"
# OUTPUT_DIR="analysis"
# RULES_DIR="bin/rules"
# CACHE_FILE="$OUTPUT_DIR/ast-cache.json"

# # Build the indexer command with debug flag if enabled
# INDEXER_CMD="./bin/indexer -dir=\"$TARGET_DIR\" -outdir=\"$OUTPUT_DIR\" -rules=\"$RULES_DIR\" -cache=\"$CACHE_FILE\""
# if [ "$DEBUG" = true ]; then
#     INDEXER_CMD="$INDEXER_CMD -debug"
# fi

# if output=$(eval $INDEXER_CMD 2>&1); then
#     # Run the indexer
#     printf "\n${YELLOW}➜ ${BOLD}Running analysis...${NC}\n"
#     printf "  ${CYAN}⚡${NC} Target: ${CYAN}%s${NC}\n" "$TARGET_DIR"
#     echo "$output"
#     exit 1
# else
#     printf "\n${RED}${BOLD}⚠️  Analysis failed!${NC}\n\n"
#     echo "$output"
#     exit 1
# fi