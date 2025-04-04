#!/bin/bash

# Navigate to the rust-port directory if executed from elsewhere
cd "$(dirname "$0")"

# Set to use nightly (via mise) for this script's execution
mise use rust@nightly

# Build the project
echo "Building typescript-analyzer..."
cargo build || { echo "Build failed"; exit 1; }

# Run the binary with path argument
echo "Running typescript-analyzer..."
./target/debug/typescript-analyzer --path "/home/rryter/projects/my/CSS/packages/mycss-app/src/app" 