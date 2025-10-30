# Rails API Endpoint Generator

You are tasked with creating a new Rails API endpoint with all necessary components.

**User Request:** {{arg}}

## Process

### Step 1: Analyze and Confirm Requirements

Based on the user's request, determine:

1. **Resource Name** (plural, snake_case): What should the resource be called? (e.g., `tasks`, `notifications`, `user_settings`)
2. **Model Name** (singular, PascalCase): What should the model be called? (e.g., `Task`, `Notification`, `UserSetting`)
3. **Controller Name**: `Api::V1::{ModelName}sController` (e.g., `Api::V1::TasksController`)
4. **Route Path**: `/api/v1/{resource_name}` (e.g., `/api/v1/tasks`)
5. **Actions**: Which RESTful actions are needed? (index, show, create, update, destroy)
6. **Model Attributes**: What fields does the model need?
   - Field name (snake_case)
   - Field type (string, text, integer, boolean, datetime, references, etc.)
   - Validations (presence, uniqueness, format, etc.)
   - Associations (belongs_to, has_many, etc.)
7. **Nested Routes**: Should this resource be nested under another? (e.g., `/api/v1/projects/:project_id/tasks`)

Use the AskUserQuestion tool to confirm these details if anything is unclear.

### Step 2: Generate Model and Migration

1. Navigate to sentinel-backend directory
2. Use Rails generator to create the model and migration:
   ```bash
   cd sentinel-backend
   bin/rails generate model {ModelName} {field1:type} {field2:type} ...
   ```
3. Review and edit the generated migration file if needed (add indexes, constraints, etc.)
4. Add validations and associations to the model file

### Step 3: Generate Controller

1. Create the controller file at `sentinel-backend/app/controllers/api/v1/{resource_name}_controller.rb`
2. Implement the requested actions following the project patterns:
   - Inherit from `ApplicationController`
   - Use proper HTTP status codes (200, 201, 404, 422)
   - Return JSON responses with data/meta structure for collections
   - Return JSON responses with data structure for single resources
   - Handle errors appropriately with proper error messages
   - Use strong parameters for create/update actions

Example structure:
```ruby
class Api::V1::ResourcesController < ApplicationController
  def index
    resources = Resource.all
    render json: {
      data: {
        resources: resources.as_json
      },
      meta: nil
    }
  end

  def show
    resource = Resource.find(params[:id])
    render json: {
      data: {
        resource: resource.as_json
      },
      meta: nil
    }
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Resource not found' }, status: :not_found
  end

  def create
    resource = Resource.new(resource_params)
    if resource.save
      render json: {
        data: {
          resource: resource.as_json
        },
        meta: nil
      }, status: :created
    else
      render json: { errors: resource.errors }, status: :unprocessable_entity
    end
  end

  def update
    resource = Resource.find(params[:id])
    if resource.update(resource_params)
      render json: {
        data: {
          resource: resource.as_json
        },
        meta: nil
      }
    else
      render json: { errors: resource.errors }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Resource not found' }, status: :not_found
  end

  def destroy
    resource = Resource.find(params[:id])
    resource.destroy
    render json: { message: 'Resource deleted successfully' }
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Resource not found' }, status: :not_found
  end

  private

  def resource_params
    params.require(:resource).permit(:field1, :field2)
  end
end
```

### Step 4: Update Routes

1. Open `sentinel-backend/config/routes.rb`
2. Add the new resource routes in the appropriate location within `namespace :api` and `namespace :v1`
3. Follow the existing patterns:
   - Use `resources` for standard RESTful routes
   - Use `only:` option if not all actions are needed
   - Add nested routes if required
   - Add custom member/collection routes if needed

Example:
```ruby
namespace :api do
  namespace :v1 do
    resources :resources, only: [:index, :show, :create, :update, :destroy]
    # Or nested:
    resources :projects do
      resources :resources
    end
  end
end
```

### Step 5: Generate RSpec Tests with OpenAPI Documentation

1. Create the request spec file at `sentinel-backend/spec/requests/api/v1/{resource_name}_spec.rb`
2. Use rswag/swagger_helper for OpenAPI documentation
3. Define tests for all implemented actions following project patterns:
   - Use `let` for test data
   - Use `create(:factory_name)` for FactoryBot factories
   - Define OpenAPI schemas for requests and responses
   - Include success and error cases
   - Test response structure and data
   - Use proper tags for grouping

Example structure:
```ruby
require 'swagger_helper'

RSpec.describe 'Api::V1::Resources', type: :request do
  path '/api/v1/resources' do
    get 'Lists all resources' do
      tags 'Resources'
      produces 'application/json'

      response '200', 'resources found' do
        schema type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                resources: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                      created_at: { type: 'string', format: 'date-time' },
                      updated_at: { type: 'string', format: 'date-time' }
                    },
                    required: ['id', 'name']
                  }
                }
              },
              required: ['resources']
            },
            meta: { type: ['object', 'null'] }
          },
          required: ['data']

        let!(:resource) { create(:resource) }

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']['resources']).to be_an(Array)
        end
      end
    end

    post 'Creates a resource' do
      tags 'Resources'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :resource, in: :body, schema: {
        type: 'object',
        properties: {
          resource: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            },
            required: ['name']
          }
        },
        required: ['resource']
      }

      response '201', 'resource created' do
        let(:resource) { { resource: { name: 'Test' } } }

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']['resource']).to be_a(Hash)
        end
      end

      response '422', 'invalid request' do
        let(:resource) { { resource: { name: '' } } }

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data).to have_key('errors')
        end
      end
    end
  end

  path '/api/v1/resources/{id}' do
    parameter name: :id, in: :path, type: :integer

    get 'Retrieves a resource' do
      tags 'Resources'
      produces 'application/json'

      response '200', 'resource found' do
        let(:resource) { create(:resource) }
        let(:id) { resource.id }

        run_test!
      end

      response '404', 'resource not found' do
        let(:id) { 'invalid' }
        run_test!
      end
    end

    put 'Updates a resource' do
      tags 'Resources'
      consumes 'application/json'
      parameter name: :resource, in: :body, schema: {
        type: 'object',
        properties: {
          resource: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            }
          }
        }
      }

      response '200', 'resource updated' do
        let(:existing_resource) { create(:resource) }
        let(:id) { existing_resource.id }
        let(:resource) { { resource: { name: 'Updated' } } }

        run_test!
      end
    end

    delete 'Deletes a resource' do
      tags 'Resources'

      response '200', 'resource deleted' do
        let(:resource) { create(:resource) }
        let(:id) { resource.id }

        run_test!
      end
    end
  end
end
```

### Step 6: Create FactoryBot Factory

1. Create or update the factory file at `sentinel-backend/spec/factories/{resource_name}.rb`
2. Define realistic test data for all required fields

Example:
```ruby
FactoryBot.define do
  factory :resource do
    name { "Test Resource" }
    description { "A test resource description" }
    # Add associations if needed
    # association :project
  end
end
```

### Step 7: Run Migration

```bash
cd sentinel-backend
bundle exec rails db:migrate
```

### Step 8: Run Tests

```bash
cd sentinel-backend
bundle exec rspec spec/requests/api/v1/{resource_name}_spec.rb
```

Fix any failing tests before proceeding.

### Step 9: Generate OpenAPI Spec and Frontend API Client

Once tests are passing:

```bash
cd sentinel-backend
bundle exec rails rswag:specs:swaggerize
cd ..
./tools/generate-api-clients.sh
```

This will:
1. Generate the OpenAPI/Swagger spec from the RSpec tests
2. Generate TypeScript API clients in `sentinel-frontend/libs/sentinel/api-client/`
3. Make the new endpoints available to the Angular frontend

## Important Notes

- **Follow RESTful conventions**: Use standard HTTP methods and status codes
- **Consistent response format**: Use data/meta structure for consistency
- **Error handling**: Return appropriate error messages and status codes
- **Validations**: Add model validations and test them
- **Tests first**: Ensure all tests pass before generating API clients
- **OpenAPI compliance**: Tests should define complete OpenAPI schemas
- **Database conventions**: Use snake_case for database columns
- **Code conventions**: Follow Ruby and Rails style guides

## Summary

After completion, provide a summary including:
- Resource name and endpoint URLs
- Available actions (GET, POST, PUT, DELETE)
- Model attributes and validations
- Any nested routes or special configurations
- Location of generated TypeScript API client
- Example API usage

IMPORTANT: DO NOT use the TodoWrite tool. Just complete the task step by step.
