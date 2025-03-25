# Sentinel API Documentation Guide

This document explains how the API documentation is structured and how to maintain it.

## Overview

The Sentinel API is documented using OpenAPI 3.0 (formerly known as Swagger) specifications through the rswag gem. This provides:

1. Interactive API documentation through Swagger UI
2. Machine-readable API specifications for generating client code
3. Integration with RSpec for testing and documenting simultaneously

## Where to Find the Documentation

- **API Documentation UI**: Access at `/api-docs` when the server is running
- **OpenAPI JSON Specification**: Located at `swagger/v1/swagger.json`
- **RSpec Documentation Files**: Found in the `spec/requests/api/v1` directory

## Documented API Endpoints

### Projects API

- `GET /api/v1/projects` - List all projects
- `POST /api/v1/projects` - Create a new project
- `GET /api/v1/projects/{id}` - Retrieve a specific project

### Analysis Jobs API

- `GET /api/v1/analysis_jobs` - List all analysis jobs
- `POST /api/v1/analysis_jobs` - Create a new analysis job
- `GET /api/v1/analysis_jobs/{id}` - Retrieve a specific analysis job
- `GET /api/v1/analysis_jobs/{id}/fetch_results` - Fetch the results of an analysis job
- `POST /api/v1/analysis_jobs/{id}/process_results` - Process the results of an analysis job

### Pattern Matches API

- `GET /api/v1/pattern_matches` - List all pattern matches
- `GET /api/v1/pattern_matches/time_series` - Get time series data for pattern matches
- `GET /api/v1/analysis_jobs/{analysis_job_id}/pattern_matches` - List pattern matches for a specific analysis job
- `GET /api/v1/analysis_jobs/{analysis_job_id}/pattern_matches/time_series` - Get time series data for pattern matches in a specific analysis job

## How to Update the Documentation

When you add or modify API endpoints, follow these steps:

1. **Update the RSpec Tests**:

   - Modify or add files in `spec/requests/api/v1/`
   - Each file should describe one API resource using the rswag DSL

2. **Run the Swagger Generator**:

   ```bash
   bundle exec rake rswag:specs:swaggerize
   ```

3. **Check the Generated Documentation**:
   - Start the server (`bundle exec rails server`)
   - Visit `/api-docs` in your browser
   - Verify the new endpoints are correctly documented

## Documentation Structure

### RSpec Test Structure

```ruby
require 'swagger_helper'

RSpec.describe 'Api::V1::Resource', type: :request do
  path '/api/v1/resources' do
    get 'Lists all resources' do
      tags 'Resources'
      produces 'application/json'

      # ... parameter definitions ...

      response '200', 'resources found' do
        schema type: :array,
          items: {
            # ... schema definition ...
          }

        run_test!
      end
    end

    # ... more endpoint definitions ...
  end
end
```

### Common Patterns

1. **Path Parameters**:

   ```ruby
   parameter name: :id, in: :path, type: :integer
   ```

2. **Query Parameters**:

   ```ruby
   parameter name: :page, in: :query, type: :integer, required: false
   ```

3. **Request Body**:

   ```ruby
   parameter name: :resource, in: :body, schema: {
     type: :object,
     properties: {
       name: { type: :string }
     },
     required: ['name']
   }
   ```

4. **Response Schemas**:
   ```ruby
   schema type: :object,
     properties: {
       id: { type: :integer },
       name: { type: :string }
     },
     required: ['id', 'name']
   ```

## Generating Angular API Clients

The OpenAPI specification can be used to automatically generate Angular API clients using the OpenAPI Generator:

```bash
cd /path/to/frontend
npm run generate:api
```

This will create TypeScript interfaces and API services based on the documentation, ensuring type safety and up-to-date client code.

## Troubleshooting

If you encounter issues with the documentation:

1. **Schema Validation Errors**:

   - Check that your schemas correctly represent the API responses
   - Make sure all required properties are defined

2. **Test Failures**:

   - Ensure your API implements the documented behavior
   - Update the documentation to match the actual implementation

3. **Missing Endpoints**:
   - Verify you've added RSpec documentation for all endpoints
   - Run the swaggerize task again
