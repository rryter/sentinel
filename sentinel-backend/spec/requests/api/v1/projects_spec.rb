require 'swagger_helper'

RSpec.describe 'Api::V1::Projects', type: :request do
  path '/api/v1/projects' do
    get 'Lists all projects' do
      tags 'Projects'
      produces 'application/json'
      
      response '200', 'projects found' do
        schema type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              repository_url: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' }
            },
            required: ['id', 'name', 'repository_url']
          }
          
        run_test!
      end
    end
    
    post 'Creates a project' do
      tags 'Projects'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :project, in: :body, schema: {
        type: 'object',
        properties: {
          project: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              repository_url: { type: 'string' }
            },
            required: ['name', 'repository_url']
          }
        },
        required: ['project']
      }
      
      response '201', 'project created' do
        let(:project) { { project: { name: 'Test Project', repository_url: 'https://github.com/test/project' } } }
        run_test!
      end
      
      response '422', 'invalid request' do
        let(:project) { { project: { name: '' } } }
        run_test!
      end
    end
  end
  
  path '/api/v1/projects/{id}' do
    parameter name: :id, in: :path, type: :integer
    
    get 'Retrieves a project' do
      tags 'Projects'
      produces 'application/json'
      
      response '200', 'project found' do
        schema type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            repository_url: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'name', 'repository_url']
          
        let(:id) { create(:project).id }
        run_test!
      end
      
      response '404', 'project not found' do
        let(:id) { 'invalid' }
        run_test!
      end
    end
  end
end 