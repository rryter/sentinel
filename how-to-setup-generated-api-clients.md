# Setting Up Automatic API Client Generation

This guide explains how to automatically generate Angular HTTP clients from your Rails API endpoints using OpenAPI specifications.

## Overview

The process works as follows:

1. Document your Rails API endpoints using RSpec and rswag
2. Generate OpenAPI specifications from these tests
3. Generate TypeScript Angular clients from the OpenAPI specs

## Prerequisites

- Rails API application
- Angular frontend application

## Setup Instructions

### 1. Rails Backend Setup

#### 1.1. Add Required Gems

Add the following gems to your `Gemfile`:

```ruby
# OpenAPI specification and Swagger documentation
gem "rswag-api"
gem "rswag-ui"
gem "rswag-specs"

group :development, :test do
  # RSpec testing framework
  gem "rspec-rails", "~> 6.1.0"
end
```

Then run:

```bash
bundle install
```

#### 1.2. Install rswag

Run the rswag install generators:

```bash
rails g rswag:api:install
rails g rswag:ui:install
rails g rswag:specs:install
```

#### 1.3. Set Up RSpec

If RSpec is not already set up, create the necessary configuration files:

```bash
# Create .rspec file
echo "--require spec_helper
--color
--format documentation" > .rspec

# If rails_helper.rb and spec_helper.rb don't exist, generate them with:
rails generate rspec:install
```

#### 1.4. Configure Swagger Helper

Update `spec/swagger_helper.rb` to match your API:

```ruby
# frozen_string_literal: true

require 'rails_helper'

RSpec.configure do |config|
  config.openapi_root = Rails.root.join('swagger').to_s

  config.openapi_specs = {
    'v1/swagger.json' => {
      openapi: '3.0.1',
      info: {
        title: 'Your API Name',
        version: 'v1',
        description: 'Your API description'
      },
      paths: {},
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server'
        },
        {
          url: 'https://api.your-api.com',
          description: 'Production server'
        }
      ],
      components: {
        schemas: {
          # Define reusable schemas here
        }
      }
    }
  }

  config.openapi_format = :json
end
```

### 2. Document API Endpoints

Create RSpec tests that document your API endpoints with Swagger annotations:

```ruby
# spec/requests/api/v1/your_resource_spec.rb
require 'swagger_helper'

RSpec.describe 'Api::V1::YourResource', type: :request do
  path '/api/v1/your_resources' do
    get 'Lists all resources' do
      tags 'Resources'
      produces 'application/json'

      response '200', 'resources found' do
        schema type: :array,
          items: {
            type: :object,
            properties: {
              id: { type: :integer },
              name: { type: :string },
              # Add other properties
            },
            required: ['id', 'name']
          }

        run_test!
      end
    end

    post 'Creates a resource' do
      tags 'Resources'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :resource, in: :body, schema: {
        type: :object,
        properties: {
          name: { type: :string },
          # Add other properties
        },
        required: ['name']
      }

      response '201', 'resource created' do
        let(:resource) { { name: 'Test Resource' } }
        run_test!
      end
    end
  end

  # Add other endpoints (GET, PUT, DELETE)
end
```

### 3. Add a Rake Task for OpenAPI Generation

Create a task for generating OpenAPI docs:

```ruby
# lib/tasks/api.rake
namespace :api do
  desc "Generate OpenAPI documentation"
  task :generate_docs => :environment do
    puts "Generating OpenAPI documentation..."
    system("bundle exec rake rswag:specs:swaggerize")
    puts "OpenAPI documentation generated at swagger/v1/swagger.json"
  end
end
```

### 4. Angular Frontend Setup

#### 4.1. Install OpenAPI Generator

In your Angular project:

```bash
npm install -D @openapitools/openapi-generator-cli
```

#### 4.2. Add OpenAPI Generator Configuration

Create an `.openapi-generator-ignore` file in the root of your Angular project:

```
# Ignore Git-specific files
.gitignore
.gitkeep

# Ignore the generated configuration file itself
.openapi-generator-ignore
.openapi-generator/

# Don't override existing README
README.md
```

#### 4.3. Add Script to Package.json

Add a script to your `package.json`:

```json
{
  "scripts": {
    "generate:api": "openapi-generator-cli generate -i ../your-backend-app/swagger/v1/swagger.json -g typescript-angular -o src/app/api/generated --additional-properties=providedIn=root,ngVersion=19.0.0"
  }
}
```

Replace `your-backend-app` with the correct path to your Rails backend and update the Angular version to match your project.

### 5. Automation Script

Create a shell script to automate the entire process:

```bash
#!/bin/bash

# tools/generate-api-clients.sh

# Set directories
BACKEND_DIR="your-backend-app"
FRONTEND_DIR="your-frontend-app"

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

echo "API client generation completed!"
echo "Generated TypeScript clients can be found at: $FRONTEND_DIR/src/app/api/generated"
```

Make the script executable:

```bash
mkdir -p tools
chmod +x tools/generate-api-clients.sh
```

### 6. Using the Generated API Clients

You can now import and use the generated API clients in your Angular components:

```typescript
import { Component, OnInit } from "@angular/core";
import { YourResourceService } from "src/app/api/generated";

@Component({
  selector: "app-your-component",
  templateUrl: "./your-component.component.html",
})
export class YourComponent implements OnInit {
  resources: any[] = [];

  constructor(private resourceService: YourResourceService) {}

  ngOnInit(): void {
    this.resourceService.apiV1YourResourcesGet().subscribe((data) => {
      this.resources = data;
    });
  }
}
```

## Running the Generation Process

To generate the API clients:

```bash
./tools/generate-api-clients.sh
```

## Troubleshooting

### Rails Server Not Running

If you encounter errors accessing the OpenAPI JSON, make sure:

1. The Rails server is running if you're accessing it via HTTP
2. The path to the swagger.json file is correct if you're accessing it directly
3. The OpenAPI specs have been generated with `bundle exec rake rswag:specs:swaggerize`

### Angular Client Generation Issues

If you have issues with the generated TypeScript clients:

1. Check that the OpenAPI JSON file is valid
2. Ensure the path to the swagger.json file in your package.json script is correct
3. Make sure you've installed the openapi-generator-cli package

### TypeScript Version Compatibility

If you encounter TypeScript version compatibility issues:

1. Update the ngVersion parameter in the generate:api script to match your Angular version
2. Check for any deprecated code in the generated clients
