require 'swagger_helper'

RSpec.describe 'Api::V1::Projects', type: :request do
  path '/api/v1/projects' do
    get 'Lists all projects' do
      tags 'Projects'
      produces 'application/json'
      parameter name: :page, in: :query, type: :integer, required: false, description: 'Page number'
      parameter name: :per_page, in: :query, type: :integer, required: false, description: 'Items per page'
      
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
            },
            meta: {
              type: 'object',
              properties: {
                current_page: { type: 'integer' },
                total_pages: { type: 'integer' },
                total_count: { type: 'integer' }
              },
              required: ['current_page', 'total_pages', 'total_count']
            }
          },
          required: ['data', 'meta'],
          additionalProperties: false

        context 'with default pagination' do
          let!(:projects) { create_list(:project, 5) }
          
          run_test! do |response|
            data = JSON.parse(response.body)
            expect(data['data']).to be_an(Array)
            expect(data['data'].length).to eq(5)
            expect(data['meta']).to include(
              'current_page' => 1,
              'total_pages' => 1,
              'total_count' => 5
            )
          end
        end

        context 'with custom pagination' do
          let!(:projects) { create_list(:project, 5) }
          let(:page) { 1 }
          let(:per_page) { 2 }
          
          run_test! do |response|
            data = JSON.parse(response.body)
            expect(data['data']).to be_an(Array)
            expect(data['data'].length).to eq(2)
            expect(data['meta']).to include(
              'current_page' => 1,
              'total_pages' => 3,
              'total_count' => 5
            )
          end
        end

        context 'with second page' do
          let!(:projects) { create_list(:project, 5) }
          let(:page) { 2 }
          let(:per_page) { 2 }
          
          run_test! do |response|
            data = JSON.parse(response.body)
            expect(data['data']).to be_an(Array)
            expect(data['data'].length).to eq(2)
            expect(data['meta']).to include(
              'current_page' => 2,
              'total_pages' => 3,
              'total_count' => 5
            )
          end
        end

        context 'with last page' do
          let!(:projects) { create_list(:project, 5) }
          let(:page) { 3 }
          let(:per_page) { 2 }
          
          run_test! do |response|
            data = JSON.parse(response.body)
            expect(data['data']).to be_an(Array)
            expect(data['data'].length).to eq(1)
            expect(data['meta']).to include(
              'current_page' => 3,
              'total_pages' => 3,
              'total_count' => 5
            )
          end
        end

        context 'when no projects exist' do
          run_test! do |response|
            data = JSON.parse(response.body)
            expect(data['data']).to be_an(Array)
            expect(data['data']).to be_empty
            expect(data['meta']).to include(
              'current_page' => 1,
              'total_pages' => 0,
              'total_count' => 0
            )
          end
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