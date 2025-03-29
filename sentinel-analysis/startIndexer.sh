
# Set target directory and create output directory
TARGET_DIR="/home/rryter/projects/rai/apps/angular-ai-gen-backend/src/app"
OUTPUT_DIR="analysis"
RULES_DIR="bin/rules"
CACHE_FILE="$OUTPUT_DIR/ast-cache.json"

# Build the indexer command with debug flag if enabled
INDEXER_CMD="./bin/indexer -dir=\"$TARGET_DIR\" -outdir=\"$OUTPUT_DIR\" -rules=\"$RULES_DIR\" -cache=\"$CACHE_FILE\""
if [ "$DEBUG" = true ]; then
    INDEXER_CMD="$INDEXER_CMD -debug"
fi

if output=$(eval $INDEXER_CMD 2>&1); then
    # Run the indexer
    printf "\n${YELLOW}➜ ${BOLD}Running analysis...${NC}\n"
    printf "  ${CYAN}⚡${NC} Target: ${CYAN}%s${NC}\n" "$TARGET_DIR"
    echo "$output"
    exit 1
else
    printf "\n${RED}${BOLD}⚠️  Analysis failed!${NC}\n\n"
    echo "$output"
    exit 1
fi