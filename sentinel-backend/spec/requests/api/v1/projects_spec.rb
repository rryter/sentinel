require 'swagger_helper'

RSpec.describe 'Api::V1::Projects', type: :request do
  path '/api/v1/projects' do
    get 'Lists all projects' do
      tags 'Projects'
      produces 'application/json'
      
      response '200', 'projects found' do
        schema type: 'object',
          properties: {
            data: {
              type: 'array',
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
            }
          },
          required: ['data'],
          additionalProperties: false

        let!(:project) { create(:project) }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to be_an(Array)
          expect(data['data'].length).to eq(1)
          expect(data['data'].first).to include(
            'id' => project.id,
            'name' => project.name,
            'repository_url' => project.repository_url
          )
          expect(data['data'].first).to have_key('created_at')
          expect(data['data'].first).to have_key('updated_at')
        end
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
        
        schema type: 'object',
          properties: {
            data: {
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
          },
          required: ['data'],
          additionalProperties: false

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to be_a(Hash)
          expect(data['data']).to include(
            'name' => 'Test Project',
            'repository_url' => 'https://github.com/test/project'
          )
          expect(data['data']).to have_key('id')
          expect(data['data']).to have_key('created_at')
          expect(data['data']).to have_key('updated_at')
        end
      end
      
      response '422', 'invalid request' do
        let(:project) { { project: { name: '' } } }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data).to have_key('errors')
          expect(data['errors']).to have_key('name')
        end
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
            data: {
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
          },
          required: ['data'],
          additionalProperties: false
          
        let(:project) { create(:project) }
        let(:id) { project.id }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to be_a(Hash)
          expect(data['data']).to include(
            'id' => project.id,
            'name' => project.name,
            'repository_url' => project.repository_url
          )
          expect(data['data']).to have_key('created_at')
          expect(data['data']).to have_key('updated_at')
        end
      end
      
      response '404', 'project not found' do
        let(:id) { 'invalid' }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data).to have_key('error')
          expect(data['error']).to eq('Project not found')
        end
      end
    end
  end
end 