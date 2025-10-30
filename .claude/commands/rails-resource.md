# Rails Full Resource Generator

You are tasked with creating a complete Rails API resource from scratch: model, migration, controller, routes, tests, and factory.

**User Request:** {{arg}}

## Process

This command combines model creation and endpoint creation into a single workflow.

### Step 1: Analyze and Confirm Requirements

Based on the user's request, determine:

1. **Resource Name** (plural, snake_case): What should the resource be called? (e.g., `tasks`, `notifications`, `user_settings`)
2. **Model Name** (singular, PascalCase): What should the model be called? (e.g., `Task`, `Notification`, `UserSetting`)
3. **Controller Name**: `Api::V1::{ModelName}sController` (e.g., `Api::V1::TasksController`)
4. **Route Path**: `/api/v1/{resource_name}` (e.g., `/api/v1/tasks`)
5. **Actions**: Which RESTful actions are needed? (index, show, create, update, destroy)
6. **Model Attributes**: What fields does the model need?
   - Field name (snake_case)
   - Field type (string, text, integer, boolean, datetime, jsonb, references, etc.)
   - Validations (presence, uniqueness, format, etc.)
   - Associations (belongs_to, has_many, etc.)
   - Default values and constraints
7. **Nested Routes**: Should this resource be nested under another? (e.g., `/api/v1/projects/:project_id/tasks`)
8. **Custom Actions**: Any non-RESTful endpoints? (e.g., complete, archive, publish)

Use the AskUserQuestion tool to confirm these details if anything is unclear.

### Step 2: Create Model (rails-model workflow)

Follow the rails-model command workflow:

1. Generate model and migration with Rails generator
2. Edit migration to add indexes, constraints, and defaults
3. Edit model to add validations, associations, scopes, and callbacks
4. Create FactoryBot factory with realistic test data
5. Create model spec with comprehensive tests
6. Run migration
7. Run model tests

Refer to [rails-model.md](rails-model.md) for detailed instructions.

### Step 3: Create Endpoints (rails-endpoint workflow)

Follow the rails-endpoint command workflow:

1. Create controller with all requested actions
2. Update routes.rb with resource routes
3. Create request specs with OpenAPI documentation
4. Run request specs
5. Generate OpenAPI spec and TypeScript API clients

Refer to [rails-endpoint.md](rails-endpoint.md) for detailed instructions.

### Step 4: Integration Testing

After both model and endpoints are created:

1. Run full test suite to ensure no regressions:
   ```bash
   cd sentinel-backend
   bundle exec rspec
   ```

2. Test the API manually using curl or HTTPie:
   ```bash
   # List all resources
   curl http://localhost:3000/api/v1/resources

   # Create a resource
   curl -X POST http://localhost:3000/api/v1/resources \
     -H "Content-Type: application/json" \
     -d '{"resource":{"name":"Test"}}'

   # Get a specific resource
   curl http://localhost:3000/api/v1/resources/1

   # Update a resource
   curl -X PATCH http://localhost:3000/api/v1/resources/1 \
     -H "Content-Type: application/json" \
     -d '{"resource":{"name":"Updated"}}'

   # Delete a resource
   curl -X DELETE http://localhost:3000/api/v1/resources/1
   ```

## Important Notes

- **Complete workflow**: This creates everything needed for a working API resource
- **Follow conventions**: Rails and project conventions for all generated code
- **Test coverage**: Ensure both model and request specs pass
- **API clients**: TypeScript clients are auto-generated for frontend use
- **Documentation**: OpenAPI spec is automatically generated from tests
- **Validation**: Test validations at both model and API levels
- **Error handling**: Ensure proper error responses at API level

## Summary

After completion, provide a comprehensive summary including:
- Resource name and endpoint URLs
- Available API actions with HTTP methods
- Model attributes, validations, and associations
- Any nested routes or custom actions
- Database migration details (tables, indexes, constraints)
- Location of all generated files:
  - Model: `app/models/{model_name}.rb`
  - Controller: `app/controllers/api/v1/{resource_name}_controller.rb`
  - Migration: `db/migrate/{timestamp}_create_{table_name}.rb`
  - Routes: `config/routes.rb`
  - Model spec: `spec/models/{model_name}_spec.rb`
  - Request spec: `spec/requests/api/v1/{resource_name}_spec.rb`
  - Factory: `spec/factories/{table_name}.rb`
  - TypeScript client: `sentinel-frontend/libs/sentinel/api-client/`
- Example API usage for all endpoints

IMPORTANT: DO NOT use the TodoWrite tool. Just complete the task step by step.
