# Set target directory and create output directory
TARGET_DIR="/home/rryter/projects/myCSS/packages/mycss-app/src/app/features/onboarding"
OUTPUT_DIR="analysis"
RULES_DIR="bin/rules"
CACHE_FILE="$OUTPUT_DIR/ast-cache.json"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

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
    exit 0
else
    printf "\n${RED}${BOLD}⚠️  Analysis failed!${NC}\n\n"
    echo "$output"
    exit 1
fi