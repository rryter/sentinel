require 'swagger_helper'

RSpec.describe 'Api::V1::AnalysisJobs', type: :request do
  path '/api/v1/analysis_jobs' do
    get 'Lists all analysis jobs' do
      tags 'Analysis Jobs'
      produces 'application/json'
      
      response '200', 'analysis jobs found' do
        schema type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  project_id: { type: 'integer' },
                  status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' }
                },
                required: ['id', 'project_id', 'status']
              }
            },
            meta: {
              type: 'object',
              properties: {
                current_page: { type: 'integer' },
                total_pages: { type: 'integer' },
                total_count: { type: 'integer' }
              }
            }
          },
          required: ['data', 'meta']

        let(:project) { create(:project) }
        let!(:analysis_jobs) { create_list(:analysis_job, 5, :completed, project: project) }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to be_an(Array)
          expect(data['data'].length).to eq(5)
        end
      end
    end

    post 'Creates a new analysis job' do
      tags 'Analysis Jobs'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :analysis_job, in: :body, schema: {
        type: 'object',
        properties: {
          project_id: { type: 'integer' },
          repository_url: { type: 'string' },
          branch: { type: 'string' },
          commit_sha: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] }
        },
        required: ['project_id']
      }
      
      response '201', 'analysis job created' do
        let(:project) { create(:project) }
        let(:analysis_job) { { project_id: project.id, repository_url: 'https://github.com/test/repo.git', branch: 'main', commit_sha: 'abc123', status: 'pending' } }
        
        schema type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                project_id: { type: 'integer' },
                status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
              },
              required: ['id', 'project_id', 'status']
            }
          },
          required: ['data']

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to be_a(Hash)
          expect(data['data']['status']).to eq('pending')
          expect(data['data']['project_id']).to eq(project.id)
        end
      end
      
      response '422', 'invalid request' do
        let(:analysis_job) { { project_id: nil } }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data).to have_key('errors')
        end
      end
    end
  end

  path '/api/v1/analysis_jobs/{id}' do
    parameter name: :id, in: :path, type: :integer
    
    get 'Retrieves an analysis job' do
      tags 'Analysis Jobs'
      produces 'application/json'
      
      response '200', 'analysis job found' do
        schema type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                project_id: { type: 'integer' },
                status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
              },
              required: ['id', 'project_id', 'status']
            }
          },
          required: ['data']
          
        let(:project) { create(:project) }
        let(:analysis_job) { create(:analysis_job, :completed, project: project) }
        let(:id) { analysis_job.id }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to be_a(Hash)
          expect(data['data']['id']).to eq(analysis_job.id)
        end
      end
      
      response '404', 'analysis job not found' do
        let(:id) { 0 }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data).to have_key('error')
        end
      end
    end
  end

  path '/api/v1/analysis_jobs/{id}/fetch_results' do
    parameter name: :id, in: :path, type: :integer
    
    get 'Fetches analysis job results' do
      tags 'Analysis Jobs'
      produces 'application/json'
      
      response '200', 'analysis job results found' do
        schema type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                project_id: { type: 'integer' },
                status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
              },
              required: ['id', 'project_id', 'status']
            }
          },
          required: ['data']
          
        let(:project) { create(:project) }
        let(:analysis_job) { create(:analysis_job, :completed, project: project) }
        let(:id) { analysis_job.id }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to be_a(Hash)
          expect(data['data']['id']).to eq(analysis_job.id)
        end
      end
      
      response '404', 'analysis job not found' do
        let(:id) { 0 }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data).to have_key('error')
        end
      end

      response '503', 'service unavailable' do
        let(:project) { create(:project) }
        let(:analysis_job) { create(:analysis_job, :completed, project: project) }
        let(:id) { analysis_job.id }
        
        before do
          allow_any_instance_of(AnalysisJob).to receive(:fetch_results).and_raise(StandardError)
        end
        
        run_test! do |response|
          expect(response).to have_http_status(:service_unavailable)
        end
      end
    end
  end

  path '/api/v1/analysis_jobs/{id}/process_results' do
    parameter name: :id, in: :path, type: :integer
    
    post 'Processes analysis job results' do
      tags 'Analysis Jobs'
      produces 'application/json'
      
      response '200', 'results processing scheduled' do
        schema type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message']
          
        let(:project) { create(:project) }
        let(:analysis_job) { create(:analysis_job, :completed, project: project) }
        let(:id) { analysis_job.id }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['message']).to eq('Analysis results processing has been scheduled')
        end
      end
      
      response '404', 'analysis job not found' do
        let(:id) { 0 }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data).to have_key('error')
        end
      end
    end
  end
end 