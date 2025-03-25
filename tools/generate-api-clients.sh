#!/bin/bash

# Set directories
BACKEND_DIR="sentinel-backend"
FRONTEND_DIR="sentinel-frontend"

# Navigate to project root directory
cd "$(dirname "$0")/.."

# Generate OpenAPI docs from Rails API
echo "Generating OpenAPI documentation from Rails API..."
(cd $BACKEND_DIR && bundle exec rake api:generate_docs)

# Check if the OpenAPI file exists
if [ ! -f "$BACKEND_DIR/swagger/v1/swagger.json" ]; then
  echo "Error: OpenAPI specification not found! Make sure the Rails API is set up correctly."
  exit 1
fi

# Generate Angular API clients
echo "Generating Angular API clients from OpenAPI spec..."
(cd $FRONTEND_DIR && npm run generate:api)

# Fix any ESLint issues in the generated code
echo "Fixing ESLint issues in generated code..."
(cd $FRONTEND_DIR && npx eslint --fix src/app/api/generated/**/*.ts || true)

echo "API client generation completed!"
echo "Generated TypeScript clients can be found at: $FRONTEND_DIR/src/app/api/generated" 