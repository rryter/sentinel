#!/bin/bash

# Exit on error
set -e

# Define directories
BACKEND_DIR="sentinel-backend"
FRONTEND_DIR="sentinel-frontend"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required commands
if ! command_exists java; then
    echo "Error: Java is required but not installed."
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/.." || exit 1

echo "Running API tests..."
(cd $BACKEND_DIR && bundle exec rspec spec/requests/api/v1/analysis_jobs_spec.rb)

echo "Generating OpenAPI documentation from Rails API..."
(cd $BACKEND_DIR && bundle exec rake api:generate_docs)

# Check if OpenAPI file exists
if [ ! -f "$BACKEND_DIR/swagger/v1/swagger.json" ]; then
    echo "Error: OpenAPI specification file not found at $BACKEND_DIR/swagger/v1/swagger.json"
    exit 1
fi

echo "Generating Angular API clients from OpenAPI spec..."
(cd $FRONTEND_DIR && java -jar node_modules/@openapitools/openapi-generator-cli/versions/7.0.0.jar generate \
    -i ../$BACKEND_DIR/swagger/v1/swagger.json \
    -g typescript-angular \
    -o src/app/api/generated \
    --additional-properties=providedIn=root,ngVersion=19.0.0,supportsES6=true,nullSafeAdditionalProps=true,fileNaming=kebab-case,modelPropertyNaming=original,sortParamsByRequiredFlag=true,useSingleRequestParameter=true,withInterfaces=true,taggedUnions=true,enumPropertyNaming=UPPERCASE,stringEnums=true,snapshot=false,npmName=sentinel-api-client,apiModulePrefix=Api,modelModulePrefix=Model,legacyDiscriminatorBehavior=false)

echo "API client generation completed. Generated TypeScript clients are in $FRONTEND_DIR/src/app/api/generated" 