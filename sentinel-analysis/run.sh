#!/bin/bash

# Navigate to the rust-port directory if executed from elsewhere
cd "$(dirname "$0")"

# Set to use nightly (via mise) for this script's execution
mise use rust@nightly

# Build the project with custom rules feature
echo "Building typescript-analyzer..."
cargo build --features custom_rules || { echo "Build failed"; exit 1; }
cargo fmt

# Check if this is a help request
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
  echo "Running with --help flag"
  ./target/debug/typescript-analyzer --help
  exit 0
fi

# Check if a path argument was provided
if [ $# -ge 1 ]; then
  # Use the provided path argument
  echo "Using provided path: $1"
  ./target/debug/typescript-analyzer "$1" "${@:2}"
else
  # No path argument provided, use sentinel.json configuration
  echo "Using path from sentinel.json"
  ./target/debug/typescript-analyzer
fi