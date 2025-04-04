#!/bin/bash

# Navigate to the rust-port directory if executed from elsewhere
cd "$(dirname "$0")"

# Set to use nightly (via mise) for this script's execution
mise use rust@nightly

# Build the project
echo "Building typescript-analyzer..."
cargo build || { echo "Build failed"; exit 1; }

# Set default path, but allow it to be overridden by the first argument
PROJECT_PATH=${1:-"/home/rryter/projects/myCSS/packages/mycss-app/src/app"}
shift 2>/dev/null || true  # Remove first argument if it exists, silently continue if not

# Run the binary with path argument and remaining arguments
echo "Running typescript-analyzer..."
./target/debug/typescript-analyzer "$PROJECT_PATH" "$@"