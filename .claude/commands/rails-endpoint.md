# Rails API Endpoint Generator

You are tasked with adding new endpoint(s) to an existing Rails API resource (or creating a new controller for an existing model).

**User Request:** {{arg}}

## Process

### Step 1: Analyze and Confirm Requirements

Based on the user's request, determine:

1. **Resource/Model**: Which existing model is this for? (e.g., `Task`, `Project`, `User`)
2. **Controller Path**: Where should the controller be? (e.g., `Api::V1::TasksController`)
3. **Route Path**: What's the API path? (e.g., `/api/v1/tasks` or `/api/v1/projects/:project_id/tasks`)
4. **Actions**: Which RESTful actions are needed? (index, show, create, update, destroy)
5. **Custom Actions**: Any non-RESTful endpoints needed? (e.g., `/complete`, `/archive`)
6. **Nested Routes**: Should this be nested under another resource? (e.g., `/api/v1/projects/:project_id/tasks`)
7. **Query Parameters**: What filtering, sorting, or pagination is needed?
8. **Authorization**: What authorization rules apply? (e.g., user can only see their own tasks)

Use the AskUserQuestion tool to confirm these details if anything is unclear.

### Step 2: Create or Update Controller

1. Create/update the controller file at `sentinel-backend/app/controllers/api/v1/{resource_name}_controller.rb`
2. Implement the requested actions following project patterns:
   - Inherit from `ApplicationController`
   - Use proper HTTP status codes (200, 201, 204, 404, 422)
   - Return JSON with data/meta structure for collections
   - Return JSON with data structure for single resources
   - Handle errors appropriately
   - Use strong parameters for create/update actions
   - Add authorization checks if needed

Example structure:
```ruby
class Api::V1::TasksController < ApplicationController
  before_action :set_task, only: [:show, :update, :destroy]
  before_action :set_project, only: [:index, :create]

  def index
    tasks = @project.tasks.includes(:project)

    # Apply filters if provided
    tasks = tasks.where(status: params[:status]) if params[:status].present?

    render json: {
      data: {
        tasks: tasks.as_json(include: :project)
      },
      meta: {
        total: tasks.count
      }
    }
  end

  def show
    render json: {
      data: {
        task: @task.as_json(include: :project)
      }
    }
  end

  def create
    task = @project.tasks.new(task_params)

    if task.save
      render json: {
        data: {
          task: task.as_json
        }
      }, status: :created
    else
      render json: { errors: task.errors }, status: :unprocessable_entity
    end
  end

  def update
    if @task.update(task_params)
      render json: {
        data: {
          task: @task.as_json
        }
      }
    else
      render json: { errors: @task.errors }, status: :unprocessable_entity
    end
  end

  def destroy
    @task.destroy
    head :no_content
  end

  # Custom action example
  def complete
    @task = Task.find(params[:id])

    if @task.update(status: 'completed', completed_at: Time.current)
      render json: {
        data: {
          task: @task.as_json
        }
      }
    else
      render json: { errors: @task.errors }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Task not found' }, status: :not_found
  end

  private

  def set_task
    @task = Task.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Task not found' }, status: :not_found
  end

  def set_project
    @project = Project.find(params[:project_id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Project not found' }, status: :not_found
  end

  def task_params
    params.require(:task).permit(:title, :description, :status)
  end
end
```

### Step 3: Update Routes

1. Open `sentinel-backend/config/routes.rb`
2. Add the new routes in the appropriate location within `namespace :api` and `namespace :v1`
3. Follow existing patterns:
   - Use `resources` for standard RESTful routes
   - Use `only:` option if not all actions are needed
   - Add nested routes if required
   - Add custom member/collection routes with proper HTTP verbs

Example:
```ruby
namespace :api do
  namespace :v1 do
    resources :projects do
      resources :tasks, only: [:index, :create]
    end

    resources :tasks, only: [:show, :update, :destroy] do
      member do
        patch :complete
      end
    end
  end
end
```

### Step 4: Generate RSpec Tests with OpenAPI Documentation

1. Create/update the request spec at `sentinel-backend/spec/requests/api/v1/{resource_name}_spec.rb`
2. Use rswag/swagger_helper for OpenAPI documentation
3. Define tests for all implemented actions:
   - Use `let` for test data
   - Use FactoryBot factories
   - Define complete OpenAPI schemas
   - Test success and error cases
   - Test response structure
   - Test authorization if applicable

Example structure:
```ruby
require 'swagger_helper'

RSpec.describe 'Api::V1::Tasks', type: :request do
  path '/api/v1/projects/{project_id}/tasks' do
    parameter name: :project_id, in: :path, type: :integer

    get 'Lists all tasks for a project' do
      tags 'Tasks'
      produces 'application/json'
      parameter name: :status, in: :query, type: :string, required: false, description: 'Filter by status'

      response '200', 'tasks found' do
        schema type: :object,
          properties: {
            data: {
              type: :object,
              properties: {
                tasks: {
                  type: :array,
                  items: {
                    type: :object,
                    properties: {
                      id: { type: :integer },
                      title: { type: :string },
                      description: { type: :string },
                      status: { type: :string },
                      project_id: { type: :integer },
                      completed_at: { type: [:string, :null], format: 'date-time' },
                      created_at: { type: :string, format: 'date-time' },
                      updated_at: { type: :string, format: 'date-time' }
                    },
                    required: ['id', 'title', 'status', 'project_id']
                  }
                }
              },
              required: ['tasks']
            },
            meta: {
              type: :object,
              properties: {
                total: { type: :integer }
              }
            }
          },
          required: ['data']

        let(:project) { create(:project) }
        let(:project_id) { project.id }
        let!(:task) { create(:task, project: project) }

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']['tasks']).to be_an(Array)
          expect(data['data']['tasks'].first['id']).to eq(task.id)
          expect(data['meta']['total']).to eq(1)
        end
      end

      response '404', 'project not found' do
        let(:project_id) { 'invalid' }
        run_test!
      end
    end

    post 'Creates a task' do
      tags 'Tasks'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :task, in: :body, schema: {
        type: :object,
        properties: {
          task: {
            type: :object,
            properties: {
              title: { type: :string },
              description: { type: :string },
              status: { type: :string }
            },
            required: ['title']
          }
        },
        required: ['task']
      }

      response '201', 'task created' do
        let(:project) { create(:project) }
        let(:project_id) { project.id }
        let(:task) { { task: { title: 'New Task', status: 'pending' } } }

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']['task']).to be_a(Hash)
          expect(data['data']['task']['title']).to eq('New Task')
        end
      end

      response '422', 'invalid request' do
        let(:project) { create(:project) }
        let(:project_id) { project.id }
        let(:task) { { task: { title: '' } } }

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data).to have_key('errors')
        end
      end
    end
  end

  path '/api/v1/tasks/{id}' do
    parameter name: :id, in: :path, type: :integer

    get 'Retrieves a task' do
      tags 'Tasks'
      produces 'application/json'

      response '200', 'task found' do
        let(:task) { create(:task) }
        let(:id) { task.id }

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']['task']['id']).to eq(task.id)
        end
      end

      response '404', 'task not found' do
        let(:id) { 'invalid' }
        run_test!
      end
    end

    patch 'Updates a task' do
      tags 'Tasks'
      consumes 'application/json'
      parameter name: :task, in: :body, schema: {
        type: :object,
        properties: {
          task: {
            type: :object,
            properties: {
              title: { type: :string },
              description: { type: :string },
              status: { type: :string }
            }
          }
        }
      }

      response '200', 'task updated' do
        let(:existing_task) { create(:task) }
        let(:id) { existing_task.id }
        let(:task) { { task: { title: 'Updated Title' } } }

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']['task']['title']).to eq('Updated Title')
        end
      end
    end

    delete 'Deletes a task' do
      tags 'Tasks'

      response '204', 'task deleted' do
        let(:task) { create(:task) }
        let(:id) { task.id }

        run_test!
      end
    end
  end

  path '/api/v1/tasks/{id}/complete' do
    parameter name: :id, in: :path, type: :integer

    patch 'Marks a task as complete' do
      tags 'Tasks'

      response '200', 'task completed' do
        let(:task) { create(:task, status: 'in_progress') }
        let(:id) { task.id }

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']['task']['status']).to eq('completed')
          expect(data['data']['task']['completed_at']).not_to be_nil
        end
      end

      response '404', 'task not found' do
        let(:id) { 'invalid' }
        run_test!
      end
    end
  end
end
```

### Step 5: Run Tests

```bash
cd sentinel-backend
bundle exec rspec spec/requests/api/v1/{resource_name}_spec.rb
```

Fix any failing tests before proceeding.

### Step 6: Generate OpenAPI Spec and Frontend API Client

Once tests are passing:

```bash
cd sentinel-backend
bundle exec rails rswag:specs:swaggerize
cd ..
./tools/generate-api-clients.sh
```

This will:
1. Generate the OpenAPI/Swagger spec from RSpec tests
2. Generate TypeScript API clients in `sentinel-frontend/libs/sentinel/api-client/`
3. Make the endpoints available to the Angular frontend

## Important Notes

- **RESTful conventions**: Use standard HTTP methods and status codes
- **Consistent response format**: Follow data/meta structure
- **Error handling**: Return appropriate errors with meaningful messages
- **Strong parameters**: Always use strong parameters to whitelist attributes
- **N+1 queries**: Use `includes` to eager load associations
- **Authorization**: Add before_action callbacks for authorization checks
- **Custom actions**: Use member/collection routes with proper HTTP verbs
- **Testing**: Test all paths including error cases

## Summary

After completion, provide a summary including:
- Endpoint URLs and HTTP methods
- Actions implemented (index, show, create, update, destroy, custom)
- Query parameters and filters available
- Nested route structure if applicable
- Location of controller, routes, and spec files
- Location of generated TypeScript API client
- Example API usage with curl or HTTPie

IMPORTANT: DO NOT use the TodoWrite tool. Just complete the task step by step.
