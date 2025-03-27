#!/bin/bash

# Exit on error
set -e

# Build and start the backend container
echo "Building and starting backend container..."
docker compose build backend
docker compose up -d backend db redis

# Wait for the database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "Running database migrations..."
docker compose exec backend bundle exec rails db:create db:migrate

# Run API tests
# echo "Running API tests..."
# docker compose exec backend bundle exec rspec spec/requests/api/v1/analysis_jobs_spec.rb

# # Generate OpenAPI documentation
# echo "Generating OpenAPI documentation..."
# docker compose exec backend bundle exec rake api:generate_docs

# Build and start the frontend container
echo "Building and starting frontend container..."
docker compose build frontend
docker compose up -d frontend

# Generate API clients
# echo "Generating API clients..."
# docker compose exec frontend java -jar node_modules/@openapitools/openapi-generator-cli/versions/7.0.0.jar generate \
#     -i ../sentinel-backend/swagger/v1/swagger.json \
#     -g typescript-angular \
#     -o src/app/api/generated \
#     --additional-properties=providedIn=root,ngVersion=19.0.0,supportsES6=true,nullSafeAdditionalProps=true,fileNaming=kebab-case,modelPropertyNaming=original,sortParamsByRequiredFlag=true,useSingleRequestParameter=true,withInterfaces=true,taggedUnions=true,enumPropertyNaming=UPPERCASE,stringEnums=true,snapshot=false,npmName=sentinel-api-client,apiModulePrefix=Api,modelModulePrefix=Model,legacyDiscriminatorBehavior=false

echo "Services are still running. Use 'docker compose down' when you want to stop them." 