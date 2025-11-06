#!/bin/bash
# Build the esbuild plugin to JavaScript

# Compile plugin TypeScript to JavaScript
npx tsc --project tsconfig.plugin.json

echo "Plugin compiled to src/plugin-dist/"
