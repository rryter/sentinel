# frozen_string_literal: true

require 'rails_helper'

RSpec.configure do |config|
  # Specify a root folder where Swagger JSON files are generated
  # NOTE: If you're using the rswag-api to serve API descriptions, you'll need
  # to ensure that it's configured to serve Swagger from the same folder
  config.openapi_root = Rails.root.join('swagger').to_s

  # Define one or more Swagger documents and provide global metadata for each one
  # When you run the 'rswag:specs:swaggerize' rake task, the complete Swagger will
  # be generated at the provided relative path under openapi_root
  # By default, the operations defined in spec files are added to the first
  # document below. You can override this behavior by adding a openapi_spec tag to the
  # the root example_group in your specs, e.g. describe '...', openapi_spec: 'v2/swagger.json'
  config.openapi_specs = {
    'v1/swagger.json' => {
      openapi: '3.0.1',
      info: {
        title: 'Sentinel API',
        version: 'v1',
        description: 'API for the Sentinel code security analysis platform'
      },
      paths: {},
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server'
        },
        {
          url: 'https://api.scoper.cloud',
          description: 'Production server'
        }
      ],
      components: {
        schemas: {
          # Project schema
          Project: {
            'type' => 'object',
            'properties' => {
              'id' => { 'type' => 'integer' },
              'name' => { 'type' => 'string' },
              'repository_url' => { 'type' => 'string' },
              'created_at' => { 'type' => 'string', 'format' => 'date-time' },
              'updated_at' => { 'type' => 'string', 'format' => 'date-time' }
            },
            'required' => ['id', 'name', 'repository_url']
          },
          
          # Analysis Job schema
          AnalysisJob: {
            'type' => 'object',
            'properties' => {
              'id' => { 'type' => 'integer' },
              'project_id' => { 'type' => 'integer' },
              'status' => { 'type' => 'string', 'enum' => ['pending', 'running', 'completed', 'failed'] },
              'created_at' => { 'type' => 'string', 'format' => 'date-time' },
              'updated_at' => { 'type' => 'string', 'format' => 'date-time' }
            },
            'required' => ['id', 'project_id', 'status']
          },
          
          # Analysis Job Response schema
          AnalysisJobResponse: {
            'type' => 'object',
            'properties' => {
              'analysis_job' => {
                'type' => 'object',
                'properties' => {
                  'id' => { 'type' => 'integer' },
                  'status' => { 'type' => 'string', 'enum' => ['pending', 'running', 'completed', 'failed'] },
                  'created_at' => { 'type' => 'string', 'format' => 'date-time' },
                  'updated_at' => { 'type' => 'string', 'format' => 'date-time' },
                  'completed_at' => { 'type' => 'string', 'format' => 'date-time', 'nullable' => true },
                  'total_files' => { 'type' => 'integer', 'nullable' => true },
                  'total_matches' => { 'type' => 'integer', 'nullable' => true },
                  'rules_matched' => { 'type' => 'integer', 'nullable' => true },
                  'files_with_violations' => {
                    'type' => 'array',
                    'items' => {
                      'type' => 'object',
                      'properties' => {
                        'id' => { 'type' => 'integer' },
                        'file_path' => { 'type' => 'string' },
                        'analysis_job_id' => { 'type' => 'integer' },
                        'display_path' => { 'type' => 'string' },
                        'job_status' => { 'type' => 'string', 'enum' => ['pending', 'running', 'completed', 'failed'] }
                      }
                    }
                  }
                },
                'required' => ['id', 'status', 'created_at', 'updated_at']
              }
            }
          },
          
          # File with violations schema
          FileWithViolations: {
            'type' => 'object',
            'properties' => {
              'id' => { 'type' => 'integer' },
              'analysis_job_id' => { 'type' => 'integer' },
              'file_path' => { 'type' => 'string' },
              'created_at' => { 'type' => 'string', 'format' => 'date-time' },
              'updated_at' => { 'type' => 'string', 'format' => 'date-time' }
            },
            'required' => ['id', 'analysis_job_id', 'file_path']
          },
          
          # Pattern match schema
          PatternMatch: {
            'type' => 'object',
            'properties' => {
              'id' => { 'type' => 'integer' },
              'file_with_violations_id' => { 'type' => 'integer' },
              'rule_id' => { 'type' => 'string' },
              'rule_name' => { 'type' => 'string' },
              'line_number' => { 'type' => 'integer' },
              'column' => { 'type' => 'integer' },
              'match_text' => { 'type' => 'string' },
              'created_at' => { 'type' => 'string', 'format' => 'date-time' },
              'updated_at' => { 'type' => 'string', 'format' => 'date-time' }
            },
            'required' => ['id', 'file_with_violations_id', 'rule_id', 'rule_name', 'line_number']
          },
          
          # Example schema (for demonstration purposes)
          Example: {
            'type' => 'object',
            'properties' => {
              'id' => { 'type' => 'integer' },
              'name' => { 'type' => 'string' },
              'description' => { 'type' => 'string' }
            },
            'required' => ['id', 'name', 'description']
          }
        },
        securitySchemes: {
          # Add security scheme if you implement authentication
          # bearerAuth: {
          #   type: :http,
          #   scheme: :bearer,
          #   bearerFormat: 'JWT'
          # }
        }
      }
    }
  }

  # Specify the format of the output Swagger file when running 'rswag:specs:swaggerize'.
  # The openapi_specs configuration option has the filename including format in
  # the key, this may want to be changed to avoid putting yaml in json files.
  # Defaults to json. Accepts ':json' and ':yaml'.
  config.openapi_format = :json
end
